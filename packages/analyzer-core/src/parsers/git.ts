import { simpleGit } from 'simple-git';
import type { GitInfo } from '@briefrepo/types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export function emptyGitInfo(): GitInfo {
  return {
    isGitRepo: false,
    totalCommits: 0,
    contributors: 0,
    contributorList: [],
    recentActivity: 0,
    hasRemote: false,
  };
}

function lastPageTotal(linkHeader: string | null, perPage: number, fallback: number): number {
  if (!linkHeader) return fallback;
  const m = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  const n = m ? Number.parseInt(m[1]!, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n * perPage;
}

/**
 * GitHub API 补数（压缩包场景专用）：无 token，限流 60/h，8s 超时，任何失败返回 undefined。
 * commits 总数用 per_page=1 的 Link 末页推导；contributors 取 Top30 列表，总数用 Link 推导（估算）。
 */
export async function fetchGitHubRepoStats(
  owner: string,
  repo: string,
): Promise<{ commits: number; contributors: number; logins: string[]; pushedAt?: string; createdAt?: string; htmlUrl?: string } | undefined> {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'brepo/analyzer' };
  const get = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(url, { headers, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const metaRes = await get(`https://api.github.com/repos/${owner}/${repo}`);
    if (!metaRes.ok) return undefined;
    const meta = (await metaRes.json()) as { pushed_at?: string; created_at?: string; html_url?: string };

    let commits = 0;
    try {
      const r = await get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
      if (r.ok) {
        const arr = (await r.json()) as unknown[];
        commits = lastPageTotal(r.headers.get('link'), 1, Array.isArray(arr) ? arr.length : 0);
      }
    } catch {
      // ignore
    }

    let logins: string[] = [];
    let contributors = 0;
    try {
      const r = await get(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=30`);
      if (r.ok) {
        const arr = (await r.json()) as { login?: string }[];
        logins = Array.isArray(arr) ? arr.map((u) => String(u?.login ?? '')).filter(Boolean).slice(0, 30) : [];
        contributors = lastPageTotal(r.headers.get('link'), 30, logins.length);
      }
    } catch {
      // ignore
    }

    return { commits, contributors, logins, pushedAt: meta.pushed_at, createdAt: meta.created_at, htmlUrl: meta.html_url };
  } catch {
    return undefined;
  }
}

export async function parseGitInfo(root: string, opts: { github?: { owner: string; repo: string } } = {}): Promise<GitInfo> {
  const git = simpleGit(root);

  let isGitRepo = false;
  try {
    isGitRepo = await git.checkIsRepo();
  } catch {
    isGitRepo = false;
  }

  if (!isGitRepo) {
    // 压缩包场景：本地无历史，可选 GitHub API 补数（失败则诚实返回空）
    if (opts.github) {
      const stats = await fetchGitHubRepoStats(opts.github.owner, opts.github.repo);
      if (stats && (stats.commits > 0 || stats.logins.length > 0)) {
        return {
          isGitRepo: false,
          totalCommits: stats.commits,
          contributors: stats.contributors,
          contributorList: stats.logins,
          lastCommitDate: stats.pushedAt,
          firstCommitDate: stats.createdAt,
          recentActivity: 0,
          hasRemote: true,
          remoteUrl: stats.htmlUrl,
          source: 'github-api',
        };
      }
    }
    return emptyGitInfo();
  }

  let totalCommits = 0;
  let contributorList: string[] = [];
  let lastCommitDate: string | undefined;
  let firstCommitDate: string | undefined;
  let recentActivity = 0;
  let hasRemote = false;
  let remoteUrl: string | undefined;

  try {
    const remotes = await git.getRemotes(true);
    hasRemote = remotes.length > 0;
    remoteUrl = remotes[0]?.refs.fetch;
  } catch {
    // ignore
  }

  try {
    // fast total count via rev-list (works with shallow too)
    try {
      const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: root, timeout: 4000 });
      const n = Number.parseInt(stdout.trim(), 10);
      if (Number.isFinite(n)) totalCommits = n;
    } catch {
      // fallback to log.total
    }

    const log = await git.log({ maxCount: 2000 });
    if (totalCommits === 0) totalCommits = log.total;

    const byName = new Map<string, number>();
    const contributorsSet = new Set<string>();
    for (const c of log.all) {
      if (c.author_name) {
        contributorsSet.add(c.author_name);
        byName.set(c.author_name, (byName.get(c.author_name) ?? 0) + 1);
      }
    }
    contributorList = [...byName.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 30);

    const contributors = contributorsSet.size;

    if (log.latest) lastCommitDate = log.latest.date;
    if (log.all.length > 0) firstCommitDate = log.all[log.all.length - 1]?.date;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    recentActivity = log.all.filter((c) => {
      const d = c.date ? new Date(c.date).getTime() : 0;
      return d > thirtyDaysAgo;
    }).length;

    return {
      isGitRepo: true,
      totalCommits,
      contributors,
      contributorList,
      lastCommitDate,
      firstCommitDate,
      recentActivity,
      hasRemote,
      remoteUrl,
    };
  } catch {
    // log failed
  }

  return {
    isGitRepo: true,
    totalCommits,
    contributors: contributorList.length,
    contributorList,
    lastCommitDate,
    firstCommitDate,
    recentActivity,
    hasRemote,
    remoteUrl,
  };
}

export async function parseChurn(root: string): Promise<Map<string, number>> {
  const churn = new Map<string, number>();
  try {
    const { stdout } = await execAsync('git log --pretty=format: --name-only --since="90 days ago"', { cwd: root, timeout: 5000 });
    for (const line of stdout.split('\n')) {
      const p = line.trim();
      if (!p) continue;
      churn.set(p, (churn.get(p) ?? 0) + 1);
    }
  } catch {
    // ignore
  }
  return churn;
}
