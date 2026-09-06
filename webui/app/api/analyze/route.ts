import { NextResponse } from 'next/server';
import { resolve } from 'node:path';
import { analyzeLocal } from '@/lib/analyzer';
import { fetchTarballIfGithub } from '@/lib/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      path?: string;
      url?: string;
      includeExts?: string[];
    };
    const rawPath = String(body.path ?? body.url ?? '').trim();
    if (!rawPath) return NextResponse.json({ error: '缺少 path' }, { status: 400 });

    let target = rawPath;
    let tmpCloned = false;
    if (/^https?:\/\//.test(rawPath)) {
      const r = await fetchTarballIfGithub(rawPath);
      target = r.target;
      tmpCloned = r.tmpCloned;
    } else {
      target = resolve(process.cwd(), '..', '..', rawPath);
    }

    const { renderHtml } = await import('@briefrepo/web-reporter');
    const result = await analyzeLocal(target, {
      includeExts: Array.isArray(body.includeExts) ? body.includeExts.filter((e): e is string => typeof e === 'string').slice(0, 24) : undefined,
    });
    void renderHtml;

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return NextResponse.json({
      id,
      url: `/r/${id}`,
      kind: result.basicInference.kind,
      confidence: result.basicInference.confidence,
      durationMs: result.durationMs,
      tmpCloned,
      result,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
