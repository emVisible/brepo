import { describe, it, expect } from 'vitest';
import { renderHtml } from './template.js';
import { renderMarkdown } from './markdown.js';
import type { AnalysisResult } from '@briefrepo/types';

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const base: AnalysisResult = {
    context: {
      name: 'demo',
      description: 'demo desc',
      absolutePath: '/tmp/demo',
      fileCount: 10,
      totalLines: 1000,
      docFileCount: 1,
      languages: { TypeScript: 5, JavaScript: 3 },
      primaryLanguage: 'TypeScript',
      techStack: ['TypeScript', 'React'],
      frameworks: ['React'],
      dependencies: ['react'],
      devDependencies: ['vitest'],
      hasReadme: true,
      readmeContent: '# Demo',
      readmeSummary: 'Demo',
      packageJson: { name: 'demo' },
      git: { isGitRepo: true, totalCommits: 10, contributors: 2, contributorList: ['a'], recentActivity: 3, hasRemote: false },
      fileTree: [],
      topLevelFiles: ['README.md'],
      features: {} as never,
    },
    level0: {
      projectName: 'demo',
      description: 'demo desc',
      fileCount: 10,
      totalLines: 1000,
      languages: { TypeScript: 5 },
      primaryLanguage: 'TypeScript',
      techStack: ['TypeScript', 'React'],
      dependencies: ['react'],
      git: { isGitRepo: true, totalCommits: 10, contributors: 2, contributorList: ['a'], recentActivity: 3, hasRemote: false },
    },
    level1: {
      entryFiles: ['src/index.ts'],
      coreModules: ['src'],
      dependencyGraph: [{ from: 'src/index.ts', to: 'react', type: 'import' }],
      complexity: { totalFiles: 10, averageLinesPerFile: 100, maxDepth: 3, hasTests: true, functions: 5, classes: 2, branches: 4 },
    },
    basicInference: {
      kind: 'product',
      confidence: 85,
      level: 'high',
      reasons: ['包含 UI 界面', '提供 CLI 能力'],
      features: {} as never,
      scores: { product: 40, library: 0 },
      disclaimer: '基于静态规则推断，仅供参考。',
    },
    keyFiles: [{ path: 'README.md', reason: '项目说明', priority: 1 }],
    onboardingTasks: [{ day: 'Day 1', title: '本地跑起来', description: '安装依赖', difficulty: 'easy' }],
    generatedAt: new Date().toISOString(),
    durationMs: 123,
  };
  return { ...base, ...overrides } as AnalysisResult;
}

describe('renderHtml', () => {
  it('renders product report', () => {
    const html = renderHtml(makeResult());
    expect(html).toContain('demo');
    expect(html).toContain('产品应用');
    expect(html).toContain('TypeScript');
  });

  it('renders platform kind with correct color', () => {
    const r = makeResult({ basicInference: { kind: 'platform', confidence: 78, level: 'medium', reasons: ['多包/多应用平台结构'], features: {} as never, scores: { product: 30, library: 0 }, disclaimer: 'x' } });
    const html = renderHtml(r);
    expect(html).toContain('平台');
    // kindColor for platform is new单源 #30A46C（见 @briefrepo/tokens）
    expect(html).toContain('#30A46C');
  });

  it('ignores legacy llmEnhancement payloads', () => {
    const r = makeResult({ llmEnhancement: { tier: 'pro', model: 'deepseek-chat', costHint: '$0.003', parsed: {}, raw: '' } } as unknown as Partial<AnalysisResult>);
    const html = renderHtml(r);
    expect(html).toContain('demo');
    expect(html).not.toContain('deepseek-chat');
  });

  it('escapes html', () => {
    const r = makeResult({ context: { ...makeResult().context, name: '<script>alert(1)</script>' } });
    const html = renderHtml(r);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('renderMarkdown', () => {
  it('renders markdown with platform', () => {
    const r = makeResult({ basicInference: { kind: 'platform', confidence: 80, level: 'high', reasons: ['平台'], features: {} as never, scores: { product: 20, library: 0 }, disclaimer: 'x' } });
    const md = renderMarkdown(r);
    expect(md).toContain('平台');
    expect(md).toContain('demo');
  });
});
