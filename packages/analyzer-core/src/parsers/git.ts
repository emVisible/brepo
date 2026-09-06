import { simpleGit } from 'simple-git';
import type { GitInfo } from '@briefrepo/types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function parseGitInfo(root: string): Promise<GitInfo> {
  const git = simpleGit(root);

  let isGitRepo = false;
  try {
    isGitRepo = await git.checkIsRepo();
  } catch {
    isGitRepo = false;
  }

  if (!isGitRepo) {
    return {
      isGitRepo: false,
      totalCommits: 0,
      contributors: 0,
      contributorList: [],
      recentActivity: 0,
      hasRemote: false,
    };
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
