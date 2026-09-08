// GitHub URL → tarball（替代 git clone，适配无 git 环境）
// 落盘位置：优先项目本地 <repoRoot>/.brepo/tmp/（看得见、好清理），只读环境回退系统临时目录。
// 用完必须走 cleanupTmpTarget；孤儿由 sweepStaleTmp 在请求入口顺手回收。
import { createWriteStream } from 'node:fs';
import { existsSync } from 'node:fs';
import { mkdir, rm, stat, rename, utimes, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveScratchDir, cleanupTmpTarget, workspaceCacheDirSync, enforceCacheLru, findRepoRoot } from './workspace';
import { parseRepoInput } from '@briefrepo/types';

export { cleanupTmpTarget, sweepStaleTmp, TMP_PREFIX } from './workspace';
export { parseRepoInput };

const execFileAsync = promisify(execFile);

const TARBALL_MAX_BYTES = 500 * 1024 * 1024;
const TAR_TIMEOUT_MS = 120_000;
const TAR_LIST_MAX_BYTES = 64 * 1024 * 1024;
const TAR_LIST_MAX_ENTRIES = 200_000;

const inflight = new Map<string, Promise<{ target: string; tmpCloned: boolean }>>();

async function getHeadSha(owner: string, repo: string, signal?: AbortSignal): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'brepo' },
      signal: ctrl.signal,
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { default_branch?: string };
    const branch = meta.default_branch ?? 'main';
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}?per_page=1`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'brepo' },
      signal: ctrl.signal,
    });
    if (!refRes.ok) return null;
    const j = (await refRes.json()) as { sha?: string };
    return typeof j.sha === 'string' && /^[0-9a-f]{7,40}$/.test(j.sha) ? j.sha.slice(0, 12) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** 解压前验成员清单：拦截绝对路径与 .. 穿越（tar-slip），条目过多也拒绝 */
async function assertSafeTarball(tarPath: string): Promise<void> {
  const { stdout } = await execFileAsync('tar', ['-tzf', tarPath], {
    timeout: 60_000,
    maxBuffer: TAR_LIST_MAX_BYTES,
  });
  let count = 0;
  for (const raw of stdout.split('\n')) {
    if (!raw) continue;
    if (++count > TAR_LIST_MAX_ENTRIES) throw new Error('压缩包文件过多，拒绝解压');
    const e = raw.trim();
    if (e.startsWith('/') || e.startsWith('\\') || /(^|\/)\.\.(\/|$)/.test(e) || /^[A-Za-z]:/.test(e)) {
      throw new Error(`压缩包成员路径非法，已拒绝：${e.slice(0, 120)}`);
    }
  }
}

export type FetchProgress = { received: number; total?: number; speedBps?: number };

export async function fetchTarballIfGithub(
  rawPath: string,
  onProgress?: (info: FetchProgress | number) => void,
  signal?: AbortSignal,
): Promise<{ target: string; tmpCloned: boolean; fromCache?: boolean }> {
  const report = (info: FetchProgress) => {
    try {
      (onProgress as unknown as (v: FetchProgress) => void)?.(info);
    } catch {
      // ignore
    }
  };
  // 纯 GitHub 模式：本地路径已下线，非仓库输入在路由层 400，这里是最后兜底
  const parsed = parseRepoInput(rawPath);
  if (!parsed) throw new Error('仅支持 GitHub 仓库：完整链接、github.com/owner/repo 或 owner/repo 速记');
  const { owner, repo } = parsed;

  // SHA 缓存：命中则零下载秒开（2GB/3版本 LRU）
  let sha: string | null = null;
  try {
    sha = await getHeadSha(owner, repo, signal);
  } catch {
    sha = null;
  }
  const repoRoot = findRepoRoot();
  // 限流/断网导致 sha 拿不到时，退化为“最近缓存”命中，避免反复下载
  if (!sha) {
    try {
      const cacheRoot = workspaceCacheDirSync(repoRoot);
      const entries = await readdir(cacheRoot).catch(() => [] as string[]);
      const cand = (entries as string[])
        .filter((n) => n.startsWith(`${owner}-${repo}-`))
        .sort()
        .reverse();
      if (cand.length) {
        // 取 mtime 最新的
        let best: string | null = null;
        let bestTime = 0;
        for (const n of cand) {
          try {
            const st = await stat(join(cacheRoot, n));
            if (st.mtimeMs > bestTime) {
              bestTime = st.mtimeMs;
              best = join(cacheRoot, n);
            }
          } catch {
            // ignore
          }
        }
        if (best) {
          await utimes(best, new Date(), new Date()).catch(() => {});
          report({ received: 0, total: 0, speedBps: 0 });
          return { target: best, tmpCloned: false, fromCache: true };
        }
      }
    } catch {
      // ignore
    }
  }
  if (sha) {
    const cacheRoot = workspaceCacheDirSync(repoRoot);
    const cachePath = join(cacheRoot, `${owner}-${repo}-${sha}`);
    try {
      const st = await stat(cachePath);
      if (st.isDirectory() && existsSync(join(cachePath, '.brepo-cache-hit'))) {
        // 兜底：旧缓存无标记也认可（存在即命中），新缓存带标记文件
      }
      if (st.isDirectory()) {
        await utimes(cachePath, new Date(), new Date()).catch(() => {});
        // 轻量上报命中
        report({ received: 0, total: 0, speedBps: 0 });
        return { target: cachePath, tmpCloned: false, fromCache: true };
      }
    } catch {
      // miss -> fall through
    }
    // singleflight：同一 SHA 并发只下载一次
    const key = `${owner}/${repo}@${sha}`;
    const existing = inflight.get(key);
    if (existing) return existing;
    const p = (async () => {
      const res = await fetchAndCache(owner, repo, sha!, report, signal);
      return res;
    })() as Promise<{ target: string; tmpCloned: boolean; fromCache?: boolean }>;
    inflight.set(key, p);
    try {
      const r = await p;
      return r;
    } finally {
      inflight.delete(key);
    }
  }

  // 无 SHA 或未命中：走临时下载（singleflight 按 HEAD）
  const headKey = `${owner}/${repo}@HEAD`;
  const existingHead = inflight.get(headKey);
  if (existingHead) return existingHead;
  const headP = fetchAndCache(owner, repo, null, report, signal) as Promise<{ target: string; tmpCloned: boolean; fromCache?: boolean }>;
  inflight.set(headKey, headP);
  try {
    return await headP;
  } finally {
    inflight.delete(headKey);
  }
}

async function fetchAndCache(
  owner: string,
  repo: string,
  sha: string | null,
  report: (info: FetchProgress) => void,
  signal?: AbortSignal,
): Promise<{ target: string; tmpCloned: boolean; fromCache?: boolean }> {
  const { dir: tmpRoot } = await resolveScratchDir(`brepo-${owner}-${repo}-`);
  const tarPath = join(tmpRoot, 'repo.tar.gz');
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/HEAD`;

  try {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
    const res = await fetch(url, signal ? { signal } : undefined);
    if (!res.ok || !res.body) {
      if (res.status === 404) throw new Error(`仓库不存在或为私有库（404）：${owner}/${repo}，请检查链接`);
      if (res.status === 403 || res.status === 429) throw new Error(`GitHub 限流（${res.status}），请稍后重试`);
      throw new Error(`下载失败: ${res.status} ${url}`);
    }
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > TARBALL_MAX_BYTES) throw new Error(`压缩包过大（${Math.round(declared / 1048576)}MB > 500MB），暂不支持分析`);
    let received = 0;
    let lastReportBytes = 0;
    let lastReportAt = 0;
    let lastSpeedBytes = 0;
    let lastSpeedAt = Date.now();
    const startAt = Date.now();
    const guard = new Transform({
      transform(chunk, _enc, cb) {
        received += (chunk as Buffer).length;
        if (received > TARBALL_MAX_BYTES) cb(new Error(`压缩包过大（> 500MB），暂不支持分析`));
        else {
          const now = Date.now();
          const dt = now - lastSpeedAt;
          const speedBps = dt > 300 ? Math.round(((received - lastSpeedBytes) * 1000) / dt) : undefined;
          if (received - lastReportBytes > 2 * 1024 * 1024 || now - lastReportAt > 1200) {
            lastReportBytes = received;
            lastReportAt = now;
            lastSpeedBytes = received;
            lastSpeedAt = now;
            report({ received, total: declared || undefined, speedBps });
          } else if (speedBps != null) {
            // 轻量更新速度但不刷屏：仅在需要时可扩展
          }
          cb(null, chunk);
        }
      },
    });
    await pipeline(res.body as unknown as NodeJS.ReadableStream, guard, createWriteStream(tarPath));
    // 尾包补报，确保 100%
    report({ received, total: declared || received, speedBps: Math.round((received * 1000) / Math.max(1, Date.now() - startAt)) });

    await assertSafeTarball(tarPath);
    const outDir = join(tmpRoot, 'src');
    await mkdir(outDir, { recursive: true });
    // tar -xzf 到 outDir，strip 1 层顶目录（带超时，避免坏包 hang 住整个请求）
    await execFileAsync('tar', ['-xzf', tarPath, '-C', outDir, '--strip-components=1'], { timeout: TAR_TIMEOUT_MS });
    // 解压成功即删包：xagent 这类仓 tar 有 86MB，留着是双倍占用
    await rm(tarPath, { force: true }).catch(() => {});

    // 入 SHA 缓存（命中秒开，LRU 2GB/3版本）
    if (sha) {
      const repoRoot = findRepoRoot();
      const cacheRoot = workspaceCacheDirSync(repoRoot);
      const cachePath = join(cacheRoot, `${owner}-${repo}-${sha}`);
      try {
        await mkdir(cacheRoot, { recursive: true });
        // 若并发已写入，直接复用
        try {
          const st = await stat(cachePath);
          if (st.isDirectory()) {
            await rm(join(tmpRoot, 'src'), { recursive: true, force: true }).catch(() => {});
            await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
            await utimes(cachePath, new Date(), new Date()).catch(() => {});
            return { target: cachePath, tmpCloned: false };
          }
        } catch {
          // miss
        }
        await rename(outDir, cachePath);
        await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
        void enforceCacheLru(repoRoot).catch(() => {});
        return { target: cachePath, tmpCloned: false, fromCache: false };
      } catch {
        // 缓存入栈失败则回退为临时目录
        return { target: outDir, tmpCloned: true, fromCache: false };
      }
    }

    return { target: outDir, tmpCloned: true, fromCache: false };
  } catch (e) {
    await cleanupTmpTarget(join(tmpRoot, 'src')).catch(() => {});
    throw e;
  }
}
