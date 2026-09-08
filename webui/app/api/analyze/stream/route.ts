import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fetchTarballIfGithub } from '@/lib/github';
import { cleanupTmpTarget, sweepStaleTmp } from '@/lib/workspace';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRepoInput } from '@briefrepo/types';
import { JobRegistry } from '@briefrepo/analyzer-core';

// worker 入口解析：dev 与构建产物布局不同，按候选逐个试（dist 必须先构建，见 pnpm build）
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    url?: string;
    includeExts?: string[];
  };
  const rawPath = String(body.path ?? body.url ?? '').trim();

  if (!rawPath) {
    return new Response('event: error\ndata: {"error":"缺少 path"}\n\n', {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const limited = checkRateLimit(req);
  if (limited) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: `请求过于频繁，请 ${limited.retryAfterSec}s 后重试（分析接口 20 次/分钟）` })}\n\n`,
      {
        status: 429,
        headers: { 'Content-Type': 'text/event-stream', 'Retry-After': String(limited.retryAfterSec) },
      },
    );
  }

  // 纯 GitHub 模式：只接受仓库链接 / owner/repo 速记等多形态输入，本地路径已下线
  const gitHub = parseRepoInput(rawPath);
  if (!gitHub) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: '仅支持 GitHub 仓库：粘贴完整链接（如 https://github.com/facebook/react）或速记（facebook/react）' })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }
  // 大包下载必须在流内进行：先建流、立刻发首字节，对端 35s 看门狗才不会误判断流。
  // 此前下载在流外 await，86MB 包全程零字节 → 前端 stall abort → 回退双下载 → Vercel 60s 超时 → 光秃 500。
  const includeExts = Array.isArray(body.includeExts)
    ? body.includeExts.filter((e): e is string => typeof e === 'string').slice(0, 24)
    : undefined;

  // 顺手扫除过期孤儿目录（崩溃/超时遗留），不阻塞本次请求
  void sweepStaleTmp().then((s) => {
    if (s.removed > 0) console.log(`[analyze/stream] swept ${s.removed} stale tmp dirs`);
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      // step 透传引擎原值：前端按 phase:step 合并同任务行（如 graph:deps 的多次进度只刷新一行）
      const send = (phase: string, msg: string, pct: number, level = 'info', step?: string) => {
        if (closed || req.signal.aborted) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ phase, msg, pct, level, ts: new Date().toISOString(), step: step ?? phase })}\n\n`));
        } catch {
          closed = true;
        }
      };
      const heartbeat = setInterval(() => {
        if (closed || req.signal.aborted) return;
        try {
          controller.enqueue(enc.encode(': ping\n\n'));
        } catch {
          closed = true;
        }
      }, 15000);
      let target: string;
      let tmpCloned = false;
      try {
        if (req.signal.aborted) return;
        // 首字节即时发出：下载再慢，看门狗也能看到活着的流
        send('scan', '准备下载…', 1, 'info', 'fetch');
        try {
          const fmtSpeed = (bps?: number) => {
            if (!bps || bps <= 0) return '';
            if (bps > 1048576) return `${(bps / 1048576).toFixed(1)}MB/s`;
            return `${(bps / 1024).toFixed(0)}KB/s`;
          };
          const r = await fetchTarballIfGithub(
            gitHub.url,
            (info: unknown) => {
              const obj = typeof info === 'number' ? { received: info } : (info as { received: number; total?: number; speedBps?: number });
              if (obj.received === 0 && obj.total === 0) return;
              const mb = (obj.received / 1048576).toFixed(1);
              const totalMb = obj.total ? (obj.total / 1048576).toFixed(1) : null;
              const speed = fmtSpeed(obj.speedBps);
              const part = totalMb ? `${mb}/${totalMb}MB` : `${mb}MB`;
              const suffix = speed ? ` · ${speed}` : '';
              send('scan', `下载中… ${part}${suffix}`, 3, 'info', 'fetch');
            },
            req.signal,
          );
          target = r.target;
          tmpCloned = r.tmpCloned;
          if ((r as { fromCache?: boolean }).fromCache) {
            send('scan', '命中缓存 · 秒开', 5, 'info', 'fetch');
          } else {
            send('scan', '下载完成，开始扫描', 5, 'info', 'fetch');
          }
        } catch (e) {
          // 取消导致的下载中止：临时目录已在 fetchTarball 内部回收，这里静默收尾
          if (req.signal.aborted) {
            return;
          }
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[analyze/stream] fetch tarball failed:', gitHub.url, msg);
          try {
            controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
          } catch {
            // ignore
          }
          return;
        }
        if (req.signal.aborted) {
          if (tmpCloned) await cleanupTmpTarget(target).catch(() => {});
          return;
        }
        const { jobId, done } = registry.run(
          {
            target,
            opts: {
              includeExts,
              gitHub,
              // 临时下载每次全新解压，缓存必 miss：跳过哈希与落盘
              useCache: tmpCloned ? false : undefined,
            },
          },
          {
            onEvent: (e) => send(e.phase, e.msg, e.pct, e.level, e.step),
            cleanup: tmpCloned ? () => cleanupTmpTarget(target) : undefined,
          },
        );
        const onAbort = () => {
          closed = true;
          // 客户端取消 → 真杀 worker，CPU 即刻释放
          void registry.cancel(jobId);
          try {
            controller.close();
          } catch {
            // ignore
          }
        };
        req.signal.addEventListener('abort', onAbort, { once: true });
        try {
          const result = await done;
          if (req.signal.aborted || closed) return;
          const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          // 去服务端绝对路径：UI 与历史记录用不到，回传等于泄露服务器目录结构
          const safeResult = { ...result, context: { ...result.context, absolutePath: '' } };
          try {
            controller.enqueue(
              enc.encode(
                `event: done\ndata: ${JSON.stringify({ id, url: `/r/${id}`, kind: result.basicInference.kind, confidence: result.basicInference.confidence, durationMs: result.durationMs, result: safeResult })}\n\n`,
              ),
            );
          } catch {
            closed = true;
          }
        } finally {
          // tmp 清理归注册表（成功/失败/取消/超时统一跑 cleanup），此处只解监听
          req.signal.removeEventListener('abort', onAbort);
        }
      } catch (e) {
        // 客户端已断开则静默收尾，避免向已关闭的流二次写入抛错
        if (!req.signal.aborted) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[analyze/stream] job failed:', gitHub.url, msg);
          try {
            controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
          } catch {
            // ignore
          }
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
