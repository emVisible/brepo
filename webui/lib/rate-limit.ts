// 分析接口的轻量限流：单次分析可下载大几十 MB + 跑满 CPU，无限制等于公开 DoS。
// 内存版（单实例有效；Vercel 多实例下是概率性防护，聊胜于无，真要严格需上 KV）。
// 本地单人使用 20 次/分钟绰绰有余，触发即 429。

const WINDOW_MS = 60_000;
const MAX_HITS = 20;

const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return 'direct';
}

/** 返回 null 表示放行，否则为需要返回的 429 响应体信息 */
export function checkRateLimit(req: Request): { retryAfterSec: number } | null {
  const key = clientIp(req);
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_HITS) {
    buckets.set(key, hits);
    return { retryAfterSec: Math.max(1, Math.ceil((hits[0]! + WINDOW_MS - now) / 1000)) };
  }
  hits.push(now);
  // 顺手清过期键，防止 Map 无限增长
  if (buckets.size > 4096) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || now - v[v.length - 1]! > WINDOW_MS) buckets.delete(k);
      if (buckets.size <= 2048) break;
    }
  }
  buckets.set(key, hits);
  return null;
}
