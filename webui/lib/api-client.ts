// typed fetch + SSE（由 docs/api.md 契约生成，单源 packages/types）
import type { AnalysisResult, AnalyzerEvent } from '@briefrepo/types';

export interface AnalyzeRequest {
  path: string;
  /** 额外纳入的扩展名（默认被忽略的样式/图片/数据文件） */
  includeExts?: string[];
}

export interface AnalyzeResponse {
  id: string;
  url: string;
  kind: string;
  confidence: number;
  durationMs: number;
  result: AnalysisResult;
}

export async function postAnalyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
  return res.json() as Promise<AnalyzeResponse>;
}

export async function streamAnalyze(
  body: AnalyzeRequest,
  onEvent: (e: AnalyzerEvent) => void,
): Promise<AnalyzeResponse> {
  const res = await fetch('/api/analyze/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    // 回退非流式
    return postAnalyze(body);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let donePayload: AnalyzeResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        else if (line.startsWith(':')) continue;
      }
      const dataStr = dataLines.join('\n');
      if (!dataStr) continue;
      try {
        const payload = JSON.parse(dataStr) as Record<string, unknown>;
        if (event === 'done') {
          donePayload = payload as unknown as AnalyzeResponse;
        } else if (event === 'error') {
          throw new Error(String((payload as { error?: string }).error ?? 'stream error'));
        } else {
          onEvent(payload as unknown as AnalyzerEvent);
        }
      } catch (e) {
        if ((e as Error).message.startsWith('stream error') || (e as Error).message.includes('analyze failed')) throw e;
        // 忽略单块解析失败，继续流
      }
    }
  }
  if (!donePayload) throw new Error('stream ended without done');
  return donePayload;
}
