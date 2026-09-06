import { describe, it, expect } from 'vitest';
import { buildOnboardingTasks } from './onboarding.js';
import type { ProjectContext, BasicAnalysis } from '@briefrepo/types';

function makeCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    name: 'demo',
    description: '',
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
    readmeContent: '',
    readmeSummary: '',
    packageJson: {},
    git: { isGitRepo: true, totalCommits: 10, contributors: 2, contributorList: [], recentActivity: 5, hasRemote: false },
    fileTree: [],
    topLevelFiles: ['package.json'],
    features: { hasUI: false, hasCLI: false, hasDesktopApp: false, hasMobileApp: false, hasUserGuide: false, hasAPIDocs: false, hasScreenshots: false, hasDemo: false, hasHomepage: false, hasPricing: false, hasDownload: false, hasTests: false, isFramework: false, isLibrary: false, docRatio: 0.1, tutorialHint: false, experimentalHint: false },
    ...overrides,
  } as unknown as ProjectContext;
}

function makeInference(kind: BasicAnalysis['kind']): BasicAnalysis {
  return { kind, confidence: 80, level: 'high', reasons: [], features: makeCtx().features, scores: { product: 10, library: 5 }, disclaimer: '' };
}

describe('buildOnboardingTasks', () => {
  it('monorepo product -> Day1 pnpm build', () => {
    const ctx = makeCtx({ topLevelFiles: ['pnpm-workspace.yaml', 'packages'], primaryLanguage: 'TypeScript' });
    const tasks = buildOnboardingTasks(ctx, makeInference('product'), ['packages/cli/src/index.ts']);
    expect(tasks[0].description).toContain('pnpm build');
    expect(tasks[1].title).toBe('走通核心流程');
  });

  it('library -> Day2 read core', () => {
    const ctx = makeCtx({ topLevelFiles: ['package.json'] });
    const tasks = buildOnboardingTasks(ctx, makeInference('library'), ['src/index.ts']);
    expect(tasks[1].description).toContain('src/index.ts');
  });

  it('hasTests true -> Day3 unit test', () => {
    const ctx = makeCtx({ features: { hasTests: true } as never });
    const tasks = buildOnboardingTasks(ctx, makeInference('other'), []);
    expect(tasks[2].title).toContain('单测');
  });

  it('hasTests false -> Day3 script', () => {
    const ctx = makeCtx({ features: { hasTests: false } as never });
    const tasks = buildOnboardingTasks(ctx, makeInference('other'), []);
    expect(tasks[2].title).toContain('验证脚本');
  });
});
