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
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ? `analyze failed: ${res.status} ${detail}` : `analyze failed: ${res.status}`);
  }
  return res.json() as Promise<AnalyzeResponse>;
}

/** 尽力从非 OK 响应中提取服务端错误详情（JSON {error} / SSE data / 纯文本），拿不到则返回空串 */
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '';
    // 优先 JSON { error }
    try {
      const j = JSON.parse(text) as { error?: unknown };
      if (typeof j.error === 'string' && j.error) return j.error.slice(0, 300);
    } catch {
      // 非 JSON，继续试 SSE
    }
    // SSE 形态：找 data: {...} 行并解析 error 字段
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      try {
        const j = JSON.parse(t.slice(5).trim()) as { error?: unknown };
        if (typeof j.error === 'string' && j.error) return j.error.slice(0, 300);
      } catch {
        // 忽略单行解析失败
      }
    }
    // 兜底：纯文本截断（去掉 event: 行）
    const cleaned = text
      .split('\n')
      .filter((l) => !l.trim().startsWith('event:') && l.trim() !== '')
      .join(' ')
      .slice(0, 300);
    return cleaned;
  } catch {
    return '';
  }
}

export class StallError extends Error {
  constructor(public timeoutMs: number) {
    super(`stalled:${timeoutMs}`);
    this.name = 'StallError';
  }
}

export async function streamAnalyze(
  body: AnalyzeRequest,
  onEvent: (e: AnalyzerEvent) => void,
  opts: { signal?: AbortSignal; stallTimeoutMs?: number } = {},
): Promise<AnalyzeResponse> {
  // 看门狗：超过 stallTimeoutMs 收不到任何字节（含心跳）即判定连接已死，主动 abort。
  // 心跳 15s 一次，所以超时只会在真断流时触发，慢但活着的任务不受影响。
  const stallMs = opts.stallTimeoutMs ?? 35000;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => ctrl.abort(new StallError(stallMs)), stallMs);
  };
  const res = await fetch('/api/analyze/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).finally(() => {
    opts.signal?.removeEventListener('abort', onAbort);
  });
  if (!res.ok || !res.body) {
    // 流端已拒绝：先提取真实原因，再回退非流式；回退也失败时合并两条错误，避免只剩光秃 500
    const streamDetail = await readErrorDetail(res.clone ? res.clone() : res).catch(() => '');
    try {
      return await postAnalyze(body);
    } catch (fallback) {
      const fbMsg = fallback instanceof Error ? fallback.message : String(fallback);
      const parts = [streamDetail ? `stream: ${streamDetail}` : `stream: ${res.status}`, fbMsg].filter(Boolean);
      throw new Error(parts.join(' ｜ '));
    }
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let donePayload: AnalyzeResponse | null = null;

  armStall();
  for (;;) {
    let read: ReadableStreamReadResult<Uint8Array>;
    try {
      read = await reader.read();
    } catch (e) {
      if (ctrl.signal.reason instanceof StallError) throw ctrl.signal.reason;
      throw e;
    }
    const { done, value } = read;
    if (done) break;
    armStall();
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
  if (stallTimer) clearTimeout(stallTimer);
  try {
    reader.releaseLock();
  } catch {
    // ignore
  }
  if (!donePayload) throw new Error('stream ended without done');
  return donePayload;
}
