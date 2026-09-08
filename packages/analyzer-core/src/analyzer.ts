import { basename } from 'node:path';
import type { AnalysisResult, ProjectContext, Level0Result, Level1Result, AnalyzerEvent } from '@briefrepo/types';
import { scanProject } from './parsers/scanner.js';
import { parseTechStack } from './parsers/tech-stack.js';
import { parseGitInfo, parseChurn } from './parsers/git.js';
import { extractReadme } from './parsers/readme.js';
import { extractFeatures, inferProjectKind } from './inference/type-inference.js';
import { pickKeyFiles } from './inference/key-files.js';
import { buildOnboardingTasks } from './inference/onboarding.js';
import { parseDependencyGraph } from './parsers/imports.js';
import { analyzeComplexity } from './parsers/complexity.js';
import { computeHealth } from './analysis/health.js';
import { detectCycles } from './analysis/cycles.js';
import { computeHotspots, findDeadFiles } from './analysis/hotspots.js';
import { emit } from './events.js';

function buildOneLiner(ctx: ProjectContext): string {
  if (ctx.readmeSummary) {
    const firstLine = ctx.readmeSummary.split('\n').find((l) => l.trim().length > 20);
    if (firstLine) return firstLine.trim().slice(0, 120);
  }
  if (ctx.description) return ctx.description.slice(0, 120);
  return `${ctx.name} — ${ctx.primaryLanguage ?? '多语言'} 项目，${ctx.fileCount} 个文件`;
}

export interface AnalyzeOptions {
  useCache?: boolean;
  /** 额外纳入的扩展名（默认被忽略的样式/图片/数据文件） */
  includeExts?: string[];
  /** GitHub 仓库坐标（压缩包场景用于 API 补数，无 token） */
  gitHub?: { owner: string; repo: string };
  onEvent?: (e: AnalyzerEvent) => void;
}

export async function analyzeProject(absolutePath: string, opts: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const started = Date.now();
  const sink = opts.onEvent;
  const ev = (phase: AnalyzerEvent['phase'], step: string, pct: number, msg: string, meta?: Record<string, unknown>, level: AnalyzerEvent['level'] = 'info') =>
    emit(sink, phase, step, pct, msg, meta, level);

  ev('scan', 'start', 2, '开始扫描文件');
  const useCache = opts.useCache !== false;
  // git 只算一次：缓存预检与正式阶段复用同一 promise（曾调两次）
  const preGitP = parseGitInfo(absolutePath, { github: opts.gitHub }).catch(() => ({ isGitRepo: false }) as never);
  let cacheKey: string | undefined;
  if (useCache) {
    try {
      const { computeCacheKey, readCache } = await import('./cache.js');
      const preGit = await preGitP;
      const head = (preGit as { lastCommitDate?: string })?.lastCommitDate ?? undefined;
      cacheKey = await computeCacheKey(absolutePath, head, opts.includeExts);
      const cached = (await readCache(absolutePath, cacheKey)) as AnalysisResult | undefined;
      if (cached && cached.context && (cached as { generatedAt?: string }).generatedAt) {
        ev('done', 'cache-hit', 100, '命中缓存');
        return { ...cached, generatedAt: new Date().toISOString(), durationMs: Date.now() - started, events: [] };
      }
    } catch {
      // ignore
    }
  }

  const scanP = scanProject(absolutePath, { includeExts: opts.includeExts });
  const techP = parseTechStack(absolutePath);
  const gitP = preGitP.then(
    (v) => v as import('@briefrepo/types').GitInfo,
    (): import('@briefrepo/types').GitInfo => ({
      isGitRepo: false,
      totalCommits: 0,
      contributors: 0,
      contributorList: [],
      recentActivity: 0,
      hasRemote: false,
    }),
  );
  const readmeP = extractReadme(absolutePath);

  const [scan, tech, git, readme] = await Promise.all([
    scanP.then((v) => {
      ev('scan', 'scan', 18, `扫描完成 · ${v.fileCount} 文件 · ${v.totalLines.toLocaleString()} 行`);
      return v;
    }),
    techP.then((v) => {
      ev('tech', 'tech', 30, `技术栈 · ${v.techStack.slice(0, 3).join(', ') || '—'} · ${v.dependencies.length} 依赖`);
      return v;
    }),
    gitP.then((v) => {
      if (!v.isGitRepo && v.source === 'github-api') {
        ev('git', 'git', 38, `GitHub · ${v.totalCommits} 提交 · ${v.contributors} 人（API 补数，压缩包无本地历史）`);
      } else if (!v.isGitRepo) {
        ev('git', 'git', 38, '无本地 Git 历史', undefined, 'warn');
      } else {
        ev('git', 'git', 38, `Git · ${v.totalCommits} 提交 · ${v.contributors} 人`);
      }
      return v;
    }),
    readmeP.then((v) => {
      ev('scan', 'readme', 42, v.hasReadme ? '已读取 README' : '未发现 README');
      return v;
    }),
  ]);

  const name = tech.packageJson?.['name'] ? String(tech.packageJson['name']) : basename(absolutePath);
  const description =
    (tech.packageJson?.['description'] as string | undefined) ?? readme.summary.split('\n').slice(0, 2).join(' ').slice(0, 200) ?? '';

  const ctx: ProjectContext = {
    name,
    description,
    absolutePath,
    fileCount: scan.fileCount,
    totalLines: scan.totalLines,
    fileCountAll: scan.fileCountAll,
    totalLinesAll: scan.totalLinesAll,
    filteredCount: scan.filteredFiles.length,
    filteredBy: scan.filteredBy as Record<string, number>,
    docFileCount: scan.docFileCount,
    languages: scan.languages,
    primaryLanguage: scan.primaryLanguage,
    techStack: tech.techStack,
    frameworks: tech.frameworks,
    dependencies: tech.dependencies,
    devDependencies: tech.devDependencies,
    hasReadme: readme.hasReadme,
    readmeContent: readme.content,
    readmeSummary: readme.summary,
    packageJson: tech.packageJson,
    git,
    fileTree: scan.fileTree as unknown as ProjectContext['fileTree'],
    topLevelFiles: scan.topLevelFiles,
    features: {} as ProjectContext['features'],
  };

  ctx.features = extractFeatures(ctx);
  if (ctx.primaryLanguage && !ctx.techStack.includes(ctx.primaryLanguage)) ctx.techStack = [ctx.primaryLanguage, ...ctx.techStack];
  if (ctx.techStack.length === 0 && ctx.primaryLanguage) ctx.techStack = [ctx.primaryLanguage];

  const level0: Level0Result = {
    projectName: ctx.name,
    description: ctx.description,
    fileCount: ctx.fileCount,
    totalLines: ctx.totalLines,
    fileCountAll: ctx.fileCountAll,
    totalLinesAll: ctx.totalLinesAll,
    filteredCount: ctx.filteredCount,
    filteredBy: ctx.filteredBy,
    languages: ctx.languages,
    primaryLanguage: ctx.primaryLanguage,
    techStack: ctx.techStack,
    dependencies: ctx.dependencies,
    git: ctx.git,
  };

  ev('graph', 'deps', 55, '解析依赖图谱');
  // 长考阶段节流进度（≥600ms 一条，保证大仓也有心跳；pct 落在阶段区间内）
  const throttled = (phase: AnalyzerEvent['phase'], step: string, fromPct: number, toPct: number, label: string) => {
    let last = 0;
    return (done: number, total: number) => {
      if (total <= 0) return;
      const now = Date.now();
      if (now - last < 600 && done < total) return;
      last = now;
      ev(phase, step, Math.round(fromPct + ((toPct - fromPct) * done) / total), `${label} · ${done}/${total} 文件`);
    };
  };
  const [dependencyGraph, stats, churn] = await Promise.all([
    parseDependencyGraph(absolutePath, scan.allFiles, scan.fileContents, throttled('graph', 'deps', 55, 67, '依赖解析中'))
      .then((v) => {
        ev('graph', 'deps', 68, `依赖 · ${v.length} 边`);
        return v;
      })
      .catch(() => [] as never),
    analyzeComplexity(absolutePath, scan.allFiles, scan.fileContents, throttled('graph', 'complexity', 68, 71, '复杂度计算中'))
      .then((v) => {
        ev('graph', 'complexity', 72, `复杂度 · ${v.functions} fn · ${v.classes} cls`);
        return v;
      })
      .catch(() => ({ functions: 0, classes: 0, branches: 0 }) as never),
    parseChurn(absolutePath)
      .then((v) => {
        if (v.size) ev('git', 'churn', 76, `Churn · ${v.size} 文件近90天变更`);
        return v;
      })
      .catch(() => new Map<string, number>() as never),
  ]);

  const cycles = detectCycles(dependencyGraph);
  if (cycles.length) ev('graph', 'cycles', 78, `环依赖 · ${cycles.length} 个`, { cycles: cycles.length });
  else ev('graph', 'cycles', 78, '无环依赖');

  const hotspots = computeHotspots({ dependencyGraph, allFiles: scan.allFiles, perFileComplexity: stats.perFile, churn });
  const deadFiles = findDeadFiles(scan.allFiles, dependencyGraph, detectEntryFiles(ctx));

  const health = computeHealth({
    fileCount: ctx.fileCount,
    totalLines: ctx.totalLines,
    dependencyGraph,
    functions: stats.functions,
    branches: stats.branches,
    cycles,
    hasTests: ctx.features.hasTests,
    recentActivity: ctx.git.recentActivity,
  });
  ev('health', 'health', 84, `健康分 · ${health.score} · ${health.label}`);

  const level1: Level1Result = {
    entryFiles: detectEntryFiles(ctx),
    coreModules: detectCoreModules(scan),
    dependencyGraph,
    complexity: {
      totalFiles: ctx.fileCount,
      averageLinesPerFile: ctx.fileCount ? Math.round(ctx.totalLines / ctx.fileCount) : 0,
      maxDepth: computeDepth(scan.fileTree),
      hasTests: ctx.features.hasTests,
      functions: stats.functions,
      classes: stats.classes,
      branches: stats.branches,
    },
    hotspots,
    cycles,
    health,
    deadFiles,
    layers: [],
  };

  ev('inference', 'infer', 90, '类型推断');
  const basicInference = inferProjectKind(ctx);
  const keyFiles = pickKeyFiles(ctx);
  const onboardingTasks = buildOnboardingTasks(ctx, basicInference, level1.entryFiles);
  ev('inference', 'infer', 92, `推断 · ${basicInference.kind} ${basicInference.confidence}%`);

  const result: AnalysisResult = {
    context: ctx,
    level0,
    level1,
    basicInference,
    keyFiles,
    onboardingTasks,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    events: [],
  };

  if (useCache && cacheKey) {
    try {
      const { writeCache } = await import('./cache.js');
      await writeCache(absolutePath, cacheKey, result);
    } catch {
      // ignore
    }
  }

  ev('done', 'done', 100, `完成 · ${Date.now() - started}ms`);
  return result;
}

function detectEntryFiles(ctx: ProjectContext): string[] {
  const candidates = [
    'src/main.ts',
    'src/index.ts',
    'src/app.ts',
    'src/main.js',
    'src/index.js',
    'app.ts',
    'index.ts',
    'main.ts',
    'src/main.tsx',
    'src/App.tsx',
    'packages/cli/src/index.ts',
    'packages/report-ui/src/index.ts',
  ];
  const allFiles = new Set<string>();
  function collect(nodes: ProjectContext['fileTree']): void {
    for (const n of nodes) {
      if (n.type === 'file') allFiles.add(n.path);
      if (n.children) collect(n.children as unknown as ProjectContext['fileTree']);
    }
  }
  collect(ctx.fileTree);
  const hits = candidates.filter((c) => allFiles.has(c));
  if (hits.length) return hits.slice(0, 4);
  for (const f of allFiles) {
    if (/^(src|app|packages\/[^/]+\/src)\/(main|index|app)\.(t|j)sx?$/.test(f)) return [f];
  }
  return [];
}

function detectCoreModules(scan: Awaited<ReturnType<typeof scanProject>>): string[] {
  const dirs = scan.fileTree.filter((n) => n.type === 'directory').map((n) => n.name);
  return dirs.filter((d) => ['src', 'lib', 'app', 'packages', 'components', 'pages', 'api', 'apps', 'skills', 'scripts'].includes(d));
}

function computeDepth(nodes: { children?: unknown[] }[], depth = 1): number {
  let max = depth;
  for (const n of nodes) {
    const children = (n as { children?: { children?: unknown[] }[] }).children;
    if (children && children.length > 0) {
      const d = computeDepth(children as never, depth + 1);
      if (d > max) max = d;
    }
  }
  return max;
}

export { buildOneLiner };
