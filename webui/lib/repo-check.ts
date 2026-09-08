'use client';

// 仓库存在性预检：分析前先问 GitHub API，避免不存在/私库白白走下载。
// 失败策略：404 → 明确不存在；限流/断网等未知情况一律放行（服务端下载阶段还会再报一次，不误杀）。
import type { ParsedRepo } from '@briefrepo/types';

export type RepoCheck = { ok: true } | { ok: false; reason: 'not-found' | 'unknown' };

export async function checkRepoExists(repo: ParsedRepo, signal?: AbortSignal): Promise<RepoCheck> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: ctrl.signal,
    });
    if (res.ok) return { ok: true };
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    // 403（限流）/ 5xx 等：无法判定，放行
    return { ok: true };
  } catch (e) {
    // 用户取消：原样抛出，外层统一显示“已取消”
    if (signal?.aborted) throw e;
    // 超时/断网：无法判定，放行（服务端下载阶段还会再报一次，不误杀）
    return { ok: true };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
