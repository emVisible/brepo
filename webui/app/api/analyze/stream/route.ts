import { resolve } from 'node:path';
import { analyzeLocal } from '@/lib/analyzer';
import { fetchTarballIfGithub } from '@/lib/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  let target = rawPath;
  try {
    if (/^https?:\/\//.test(rawPath)) {
      const r = await fetchTarballIfGithub(rawPath);
      target = r.target;
    } else {
      target = resolve(process.cwd(), '..', '..', rawPath);
    }
  } catch (e) {
    return new Response(`event: error\ndata: ${JSON.stringify({ error: String(e instanceof Error ? e.message : e) })}\n\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (phase: string, msg: string, pct: number, level = 'info') => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ phase, msg, pct, level, ts: new Date().toISOString(), step: phase })}\n\n`));
      };
      const heartbeat = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 15000);
      try {
        const result = await analyzeLocal(target, {
          includeExts: Array.isArray(body.includeExts) ? body.includeExts.filter((e): e is string => typeof e === 'string').slice(0, 24) : undefined,
          onEvent: (e) => send(e.phase, e.msg, e.pct, e.level),
        });
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        controller.enqueue(
          enc.encode(
            `event: done\ndata: ${JSON.stringify({ id, url: `/r/${id}`, kind: result.basicInference.kind, confidence: result.basicInference.confidence, durationMs: result.durationMs, result })}\n\n`,
          ),
        );
      } catch (e) {
        controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`));
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
