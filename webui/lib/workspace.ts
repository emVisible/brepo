// 项目本地工作区：运行时写入统一收归仓库内，方便查看与清理。
// 布局：<repoRoot>/.brepo/tmp/brepo-<owner>-<repo>-XXXXXX/ （.brepo/ 已在 .gitignore）
// Vercel 等只读环境写不进仓库时，自动回退到 os.tmpdir()，功能不受影响。

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/** 自建临时目录统一前缀：扫除与归属判定只认这个前缀 */
export const TMP_PREFIX = 'brepo-';

const WORKSPACE_MARKER = 'pnpm-workspace.yaml';
const TMP_SUBDIR = join('.brepo', 'tmp');

/** 向上找到 monorepo 根（以 pnpm-workspace.yaml 为标记），找不到则回退到起点 */
export function findRepoRoot(startDir: string = process.cwd()): string {
  let dir = resolve(startDir);
  for (let i = 0; i < 6; i++) {
    try {
      if (existsSync(join(dir, WORKSPACE_MARKER))) return dir;
    } catch {
      // 忽略单层探测失败，继续向上
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

/** 项目本地暂存目录（同步版，仅拼路径不建目录，用于归属判定） */
export function workspaceTmpDirSync(repoRoot: string = findRepoRoot()): string {
  return join(repoRoot, TMP_SUBDIR);
}

export function workspaceCacheDirSync(repoRoot: string = findRepoRoot()): string {
  return join(repoRoot, TMP_SUBDIR, 'cache');
}

let writableCache: { root: string; ok: boolean } | undefined;

/** 项目本地暂存是否可写（Vercel 只读环境会失败，探一次记一次） */
async function isWorkspaceWritable(repoRoot: string): Promise<boolean> {
  if (writableCache && writableCache.root === repoRoot) return writableCache.ok;
  try {
    await mkdir(join(repoRoot, TMP_SUBDIR), { recursive: true });
    writableCache = { root: repoRoot, ok: true };
    return true;
  } catch {
    writableCache = { root: repoRoot, ok: false };
    return false;
  }
}

export type ScratchScope = 'workspace' | 'system';

/**
 * 建一个受管临时目录：优先项目本地（.brepo/tmp/，看得见、好清理），
 * 只读环境回退系统临时目录。调用方用完必须调 cleanupTmpTarget。
 */
export async function resolveScratchDir(
  prefix: string,
  repoRoot: string = findRepoRoot(),
): Promise<{ dir: string; scope: ScratchScope }> {
  const safePrefix = prefix.startsWith(TMP_PREFIX) ? prefix : `${TMP_PREFIX}${prefix}`;
  if (await isWorkspaceWritable(repoRoot)) {
    try {
      const dir = await mkdtemp(join(repoRoot, TMP_SUBDIR, safePrefix));
      return { dir, scope: 'workspace' };
    } catch {
      // 本地建目录失败则回退系统目录
    }
  }
  const dir = await mkdtemp(join(tmpdir(), safePrefix));
  return { dir, scope: 'system' };
}

/** 是否为我们创建的临时目录（本地暂存或系统临时目录下以 brepo- 开头的直接子目录） */
export function isManagedTmpDir(dir: string): boolean {
  // 缓存目录不算临时目录，禁止误删
  if (dir.includes(`${TMP_SUBDIR}/cache`) || dir.includes(`${TMP_SUBDIR}\\cache`)) return false;
  if (basename(dir).startsWith(TMP_PREFIX)) {
    const parent = dirname(dir);
    if (parent === tmpdir()) return true;
    // 项目本地：父级为 <any>/.brepo/tmp（repoRoot 未知时按路径形状判定）
    if (basename(dirname(parent)) === '.brepo' && basename(parent) === 'tmp') return true;
  }
  return false;
}

/** 是否为缓存目录（受保护，不参与 sweep 临时目录的删除） */
export function isCacheDir(dir: string): boolean {
  return dir.includes(`${TMP_SUBDIR}/cache`) || basename(dir).startsWith('cache');
}

/** 清理临时分析目录（target 为其内部任意路径，删其根） */
export async function cleanupTmpTarget(target: string): Promise<void> {
  const parent = dirname(target);
  if (isManagedTmpDir(parent)) {
    await rm(parent, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 扫除过期临时目录（崩溃/超时/旧版本遗留的孤儿）。
 * 同时扫项目本地暂存与系统临时目录；只删 brepo- 前缀且 mtime 超时的条目。
 * 缓存目录受保护，不会被扫除。
 * 请求入口 fire-and-forget 调用，不 await。
 */
export async function sweepStaleTmp(maxAgeMs = 2 * 3600 * 1000): Promise<{ removed: number }> {
  const bases = new Set<string>([workspaceTmpDirSync(), tmpdir()]);
  let removed = 0;
  const now = Date.now();
  for (const base of bases) {
    let entries: string[];
    try {
      entries = await readdir(base);
    } catch {
      continue;
    }
    await Promise.all(
      entries
        .filter((n) => n.startsWith(TMP_PREFIX))
        .filter((n) => n !== 'cache')
        .map(async (n) => {
          const p = join(base, n);
          try {
            const st = await stat(p);
            if (now - st.mtimeMs < maxAgeMs) return;
            await rm(p, { recursive: true, force: true });
            removed++;
          } catch {
            // 单个失败不影响其他
          }
        }),
    );
  }
  return { removed };
}

// 缓存 LRU：2GB 总量 + 单仓 3 版本
const CACHE_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const CACHE_MAX_VERSIONS_PER_REPO = 3;

async function dirSize(p: string): Promise<number> {
  let total = 0;
  try {
    const st = await stat(p);
    if (!st.isDirectory()) return st.size;
  } catch {
    return 0;
  }
  const walk = async (dir: string) => {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        const full = join(dir, e);
        try {
          const s = await stat(full);
          if (s.isDirectory()) await walk(full);
          else total += s.size;
        } catch {
          // ignore
        }
      }),
    );
  };
  await walk(p);
  return total;
}

export async function enforceCacheLru(repoRoot: string = findRepoRoot()): Promise<{ evicted: number }> {
  const cacheRoot = workspaceCacheDirSync(repoRoot);
  let entries: string[];
  try {
    entries = await readdir(cacheRoot);
  } catch {
    return { evicted: 0 };
  }
  // 按仓库分组：owner-repo-xxx
  const byRepo = new Map<string, Array<{ name: string; path: string; mtime: number; size: number }>>();
  for (const name of entries) {
    const p = join(cacheRoot, name);
    try {
      const st = await stat(p);
      if (!st.isDirectory()) continue;
      // 解析 repoKey：去掉末尾 -<sha>
      const m = name.match(/^(.*)-[0-9a-f]{7,12}$/);
      const key = m ? m[1]! : name;
      const size = await dirSize(p);
      let arr = byRepo.get(key);
      if (!arr) {
        arr = [];
        byRepo.set(key, arr);
      }
      arr.push({ name, path: p, mtime: st.mtimeMs, size });
    } catch {
      // ignore
    }
  }

  let evicted = 0;
  // 单仓 3 版本
  for (const [, arr] of byRepo) {
    arr.sort((a, b) => b.mtime - a.mtime);
    for (const extra of arr.slice(CACHE_MAX_VERSIONS_PER_REPO)) {
      await rm(extra.path, { recursive: true, force: true }).catch(() => {});
      evicted++;
    }
  }

  // 全局 2GB：按 mtime 旧的先删
  let all: Array<{ path: string; mtime: number; size: number }> = [];
  for (const [, arr] of byRepo) {
    for (const e of arr.slice(0, CACHE_MAX_VERSIONS_PER_REPO)) all.push(e);
  }
  all.sort((a, b) => a.mtime - b.mtime);
  let total = all.reduce((a, b) => a + b.size, 0);
  for (const e of all) {
    if (total <= CACHE_MAX_BYTES) break;
    await rm(e.path, { recursive: true, force: true }).catch(() => {});
    total -= e.size;
    evicted++;
  }
  return { evicted };
}
