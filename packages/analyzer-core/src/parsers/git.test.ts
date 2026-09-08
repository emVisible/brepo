import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseGitInfo, fetchGitHubRepoStats } from './git.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function link(last: number): string {
  return `<https://api.github.com/x?page=${last}>; rel="last"`;
}

describe('parseGitInfo github-api enrichment', () => {
  it('enriches non-repo dir via GitHub API', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-git-'));
    await mkdir(join(dir, 'sub'), { recursive: true });
    await writeFile(join(dir, 'sub', 'a.ts'), 'const a = 1;\n');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/commits')) {
          return { ok: true, headers: { get: () => link(1234) }, json: async () => [{ sha: 'abc' }] } as unknown as Response;
        }
        if (String(url).includes('/contributors')) {
          return {
            ok: true,
            headers: { get: () => link(3) },
            json: async () => [{ login: 'alice' }, { login: 'bob' }],
          } as unknown as Response;
        }
        return {
          ok: true,
          headers: { get: () => null },
          json: async () => ({ pushed_at: '2026-01-01T00:00:00Z', created_at: '2020-01-01T00:00:00Z', html_url: 'https://github.com/o/r' }),
        } as unknown as Response;
      }),
    );
    const info = await parseGitInfo(dir, { github: { owner: 'o', repo: 'r' } });
    expect(info.isGitRepo).toBe(false);
    expect(info.source).toBe('github-api');
    expect(info.totalCommits).toBe(1234);
    expect(info.contributorList).toEqual(['alice', 'bob']);
    expect(info.remoteUrl).toBe('https://github.com/o/r');
  });

  it('falls back to honest empty when GitHub API fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-git-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const info = await parseGitInfo(dir, { github: { owner: 'o', repo: 'r' } });
    expect(info.totalCommits).toBe(0);
    expect(info.source).toBeUndefined();
  });

  it('fetchGitHubRepoStats returns undefined on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, headers: { get: () => null }, json: async () => ({}) }) as unknown as Response));
    expect(await fetchGitHubRepoStats('o', 'nope')).toBeUndefined();
  });
});
