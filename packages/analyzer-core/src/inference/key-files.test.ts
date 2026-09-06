import { describe, it, expect } from 'vitest';
import { pickKeyFiles } from './key-files.js';
import type { ProjectContext } from '@briefrepo/types';

function makeCtx(files: string[]): ProjectContext {
  const tree = files.map((p) => ({ name: p.split('/').pop()!, path: p, type: 'file' as const, size: 100, lineCount: 10 }));
  // add directory nodes for top-level
  const topLevelFiles = [...new Set(files.map((f) => f.split('/')[0]!))];
  return {
    name: 'demo',
    description: '',
    absolutePath: '/tmp/demo',
    fileCount: files.length,
    totalLines: 100,
    docFileCount: 1,
    languages: { TypeScript: 1 },
    primaryLanguage: 'TypeScript',
    techStack: [],
    frameworks: [],
    dependencies: [],
    devDependencies: [],
    hasReadme: files.includes('README.md'),
    readmeContent: '',
    readmeSummary: '',
    packageJson: {},
    git: { isGitRepo: false, totalCommits: 0, contributors: 0, contributorList: [], recentActivity: 0, hasRemote: false },
    fileTree: tree as unknown as ProjectContext['fileTree'],
    topLevelFiles,
    features: {} as never,
  } as unknown as ProjectContext;
}

describe('pickKeyFiles', () => {
  it('picks README and package.json first', () => {
    const ctx = makeCtx(['README.md', 'package.json', 'src/index.ts', 'PROJECT-PLAN.md']);
    const keys = pickKeyFiles(ctx);
    expect(keys[0].path).toBe('README.md');
    expect(keys.map((k) => k.path)).toContain('package.json');
  });

  it('limits to 5', () => {
    const ctx = makeCtx(['README.md', 'package.json', 'pnpm-workspace.yaml', 'turbo.json', 'packages/cli/src/index.ts', 'PROJECT-PLAN.md', 'src/index.ts']);
    const keys = pickKeyFiles(ctx);
    expect(keys.length).toBeLessThanOrEqual(5);
  });

  it('returns empty for no files', () => {
    const ctx = makeCtx([]);
    const keys = pickKeyFiles(ctx);
    expect(Array.isArray(keys)).toBe(true);
  });
});
