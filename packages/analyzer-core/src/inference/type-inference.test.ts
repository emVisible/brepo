import { describe, it, expect } from 'vitest';
import { extractFeatures, inferProjectKind } from './type-inference.js';
import type { ProjectContext } from '@briefrepo/types';

function makeCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
  const base: ProjectContext = {
    name: 'demo',
    description: 'demo',
    absolutePath: '/tmp/demo',
    fileCount: 10,
    totalLines: 1000,
    docFileCount: 1,
    languages: { TypeScript: 5 },
    primaryLanguage: 'TypeScript',
    techStack: ['TypeScript'],
    frameworks: [],
    dependencies: [],
    devDependencies: [],
    hasReadme: true,
    readmeContent: '# Demo\nA demo project',
    readmeSummary: '# Demo',
    packageJson: { name: 'demo' },
    git: {
      isGitRepo: true,
      totalCommits: 10,
      contributors: 2,
      contributorList: ['a', 'b'],
      recentActivity: 5,
      hasRemote: false,
    },
    fileTree: [{ name: 'README.md', path: 'README.md', type: 'file' }],
    topLevelFiles: ['README.md', 'package.json'],
    features: {} as never,
  };
  const ctx = { ...base, ...overrides } as ProjectContext;
  ctx.features = extractFeatures(ctx);
  return ctx;
}

describe('extractFeatures', () => {
  it('detects CLI via workspace packages/cli', () => {
    const ctx = makeCtx({
      topLevelFiles: ['packages', 'README.md'],
      fileTree: [
        { name: 'packages', path: 'packages', type: 'directory', children: [{ name: 'cli', path: 'packages/cli', type: 'directory', children: [] }] },
      ],
      dependencies: [],
    });
    expect(ctx.features.hasCLI).toBe(true);
  });

  it('detects hasAPIDocs only when api in readme', () => {
    const ctxNoApi = makeCtx({ readmeContent: '# Demo\nJust docs here', topLevelFiles: ['docs'] });
    expect(ctxNoApi.features.hasAPIDocs).toBe(false);

    const ctxApi = makeCtx({ readmeContent: '# Demo\nAPI usage example', topLevelFiles: ['docs'] });
    expect(ctxApi.features.hasAPIDocs).toBe(true);
  });

  it('detects hasUI via React', () => {
    const ctx = makeCtx({ dependencies: ['react'] });
    expect(ctx.features.hasUI).toBe(true);
  });
});

describe('inferProjectKind', () => {
  it('classifies documentation when docRatio high', () => {
    const ctx = makeCtx({ fileCount: 10, docFileCount: 9, totalLines: 1000 });
    const res = inferProjectKind(ctx);
    expect(res.kind).toBe('documentation');
  });

  it('classifies product with CLI+demo high confidence', () => {
    const ctx = makeCtx({
      name: 'myapp',
      topLevelFiles: ['packages', 'README.md'],
      fileTree: [
        { name: 'packages', path: 'packages', type: 'directory', children: [{ name: 'cli', path: 'packages/cli', type: 'directory', children: [] }] },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ],
      readmeContent: '# MyApp\nA cool cli product',
    });
    const res = inferProjectKind(ctx);
    expect(res.kind).toBe('product');
    expect(res.confidence).toBeGreaterThan(60);
  });

  it('returns low confidence for weak signal', () => {
    const ctx = makeCtx({ name: 'myapp', readmeContent: '# MyApp\nsmall demo', dependencies: [] });
    const res = inferProjectKind(ctx);
    // only demo -> weak, should be low after capping
    expect(res.level).toBe('low');
  });

  it('handles other with no signals', () => {
    const ctx = makeCtx({
      readmeContent: '# Minimal',
      topLevelFiles: [],
      fileTree: [],
      dependencies: [],
      devDependencies: [],
    });
    // override docRatio check by setting fileCount large
    ctx.fileCount = 5;
    ctx.docFileCount = 0;
    ctx.features = extractFeatures(ctx);
    const res = inferProjectKind(ctx);
    expect(['other', 'product', 'library', 'hybrid', 'tutorial']).toContain(res.kind);
  });

  it('classifies platform when monorepo apps>=2 and platform hint', () => {
    const ctx = makeCtx({
      name: 'my-platform',
      topLevelFiles: ['apps', 'packages', 'README.md'],
      fileTree: [
        { name: 'apps', path: 'apps', type: 'directory', children: [
          { name: 'app-a', path: 'apps/app-a', type: 'directory', children: [] },
          { name: 'app-b', path: 'apps/app-b', type: 'directory', children: [] },
        ]},
        { name: 'packages', path: 'packages', type: 'directory', children: [{ name: 'cli', path: 'packages/cli', type: 'directory', children: [] }] },
      ],
      readmeContent: '# My Platform\nA platform for building apps',
      dependencies: ['electron'],
    });
    const res = inferProjectKind(ctx);
    expect(res.kind).toBe('platform');
    expect(res.features.isPlatform).toBe(true);
    expect(res.reasons.join('')).toContain('平台');
  });

  it('does not classify platform when only one app', () => {
    const ctx = makeCtx({
      topLevelFiles: ['apps', 'packages', 'README.md'],
      fileTree: [
        { name: 'apps', path: 'apps', type: 'directory', children: [
          { name: 'app-a', path: 'apps/app-a', type: 'directory', children: [] },
        ]},
        { name: 'packages', path: 'packages', type: 'directory', children: [{ name: 'cli', path: 'packages/cli', type: 'directory', children: [] }] },
      ],
      readmeContent: '# MyApp\nA platform-like monorepo',
      dependencies: [],
    });
    const res = inferProjectKind(ctx);
    // needs explicit platform word + electron/expo; readme has platform but only one app -> should not be platform
    expect(res.kind).not.toBe('platform');
  });
});
