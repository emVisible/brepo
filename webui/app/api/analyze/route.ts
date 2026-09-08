import { existsSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { join } from 'node:path';
import { fetchTarballIfGithub } from '@/lib/github';
import { cleanupTmpTarget, sweepStaleTmp } from '@/lib/workspace';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRepoInput } from '@briefrepo/types';
import { JobRegistry } from '@briefrepo/analyzer-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function resolveWorkerEntry(): string {
  const candidates = [
    join(process.cwd(), 'node_modules/@briefrepo/analyzer-core/dist/job-worker.js'),
    join(process.cwd(), '../packages/analyzer-core/dist/job-worker.js'),
    join(process.cwd(), 'packages/analyzer-core/dist/job-worker.js'),
  ];
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {
      // try next
    }
  }
  throw new Error('分析引擎未构建（找不到 job-worker.js），请先执行 pnpm build');
}

const registry = new JobRegistry(resolveWorkerEntry);

export async function POST(req: Request) {
  try {
    const limited = checkRateLimit(req);
    if (limited) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${limited.retryAfterSec}s 后重试（分析接口 20 次/分钟）` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
      );
    }
    const body = (await req.json()) as {
      path?: string;
      url?: string;
      includeExts?: string[];
    };
    const rawPath = String(body.path ?? body.url ?? '').trim();
    if (!rawPath) return NextResponse.json({ error: '缺少 path' }, { status: 400 });

    // 顺手扫除过期孤儿目录（崩溃/超时遗留），不阻塞本次请求
    void sweepStaleTmp().then((s) => {
      if (s.removed > 0) console.log(`[analyze] swept ${s.removed} stale tmp dirs`);
    });

    let target: string;
    let tmpCloned = false;
    // 纯 GitHub 模式：只接受仓库链接 / owner/repo 速记等多形态输入，本地路径已下线
    const gitHub = parseRepoInput(rawPath);
    if (!gitHub) {
      return NextResponse.json(
        { error: '仅支持 GitHub 仓库：粘贴完整链接（如 https://github.com/facebook/react）或速记（facebook/react）' },
        { status: 400 },
      );
    }
    {
      // 取消信号直达下载：客户端断开时 fetch 中止，临时目录在 catch 中回收
      const r = await fetchTarballIfGithub(gitHub.url, undefined, req.signal);
      target = r.target;
      tmpCloned = r.tmpCloned;
    }

    const { jobId, done } = registry.run(
      {
        target,
        opts: {
          includeExts: Array.isArray(body.includeExts) ? body.includeExts.filter((e): e is string => typeof e === 'string').slice(0, 24) : undefined,
          gitHub,
          // 临时下载每次全新解压，缓存必 miss：跳过哈希与落盘
          useCache: tmpCloned ? false : undefined,
        },
      },
      { cleanup: tmpCloned ? () => cleanupTmpTarget(target) : undefined },
    );
    req.signal.addEventListener('abort', () => void registry.cancel(jobId), { once: true });
    const result = await done;

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    // 去服务端绝对路径：UI 与历史记录用不到，回传等于泄露服务器目录结构
    const safeResult = { ...result, context: { ...result.context, absolutePath: '' } };
    return NextResponse.json({
      id,
      url: `/r/${id}`,
      kind: result.basicInference.kind,
      confidence: result.basicInference.confidence,
      durationMs: result.durationMs,
      tmpCloned,
      result: safeResult,
    });
  } catch (e) {
    // 客户端已断开：静默收尾（临时目录已在下载/任务清理中回收），不记噪音日志
    if (req.signal.aborted) return NextResponse.json({ error: '已取消' }, { status: 499 });
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[analyze] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
