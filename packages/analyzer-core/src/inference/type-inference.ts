import type { ProjectContext, ProjectFeatures } from '@briefrepo/types';
import type { BasicAnalysis } from '@briefrepo/types';

const DISCLAIMER = '基于静态规则推断，仅供参考。实际情况可能与推断结果存在差异。';

export function extractFeatures(ctx: ProjectContext): ProjectFeatures {
  const deps = [...ctx.dependencies, ...ctx.devDependencies].map((d) => d.toLowerCase());
  const has = (name: string): boolean => deps.includes(name.toLowerCase());

  const hasUI = has('react') || has('vue') || has('@angular/core') || has('svelte') || has('electron');

  // More precise UI detection via dependencies
  const uiDeps = ['react', 'vue', '@angular/core', 'svelte', 'electron', 'next', 'nuxt', 'gatsby'];
  const hasUIDeps = uiDeps.some((d) => has(d));

  const pkg = ctx.packageJson as Record<string, unknown> | undefined;
  const bin = pkg?.['bin'];
  const hasWorkspaceCLI =
    ctx.topLevelFiles.includes('packages') &&
    ctx.fileTree.some(
      (n) => n.name === 'packages' && n.type === 'directory' && (n.children ?? []).some((c) => c.name === 'cli'),
    );
  const hasCLI = Boolean(bin) || has('commander') || has('yargs') || has('oclif') || has('cac') || hasWorkspaceCLI;

  const hasDesktopApp = has('electron') || has('tauri') || ctx.topLevelFiles.includes('electron.config.js');

  const hasMobileApp = has('react-native') || has('flutter') || has('expo');

  const readmeLower = ctx.readmeContent.toLowerCase();
  const hasScreenshots = readmeLower.includes('![') || readmeLower.includes('<img') || readmeLower.includes('screenshot');
  const hasDemo = readmeLower.includes('demo') || ctx.topLevelFiles.includes('examples') || ctx.topLevelFiles.includes('demo');
  const hasDocsFolder = ctx.topLevelFiles.includes('docs') || ctx.fileTree.some((n) => n.name.toLowerCase() === 'docs');
  const hasAPIDocs = readmeLower.includes('api') && (readmeLower.includes('usage') || readmeLower.includes('example') || readmeLower.includes('install'));
  const hasAPIDocsStrong = hasAPIDocs || (hasDocsFolder && readmeLower.includes('api'));
  const hasUserGuide =
    readmeLower.includes('getting started') ||
    readmeLower.includes('installation') ||
    readmeLower.includes('quick start') ||
    readmeLower.includes('usage');

  const hasHomepage = Boolean((pkg?.['homepage'] as string | undefined) || readmeLower.includes('homepage') || readmeLower.includes('website'));
  const hasPricing = readmeLower.includes('pricing') || readmeLower.includes('price');
  const hasDownload = readmeLower.includes('download') || has('electron-builder') || Boolean(pkg?.['bin']);

  const hasTests =
    ctx.topLevelFiles.some((f) => f === '__tests__' || f === 'tests' || f === 'test') ||
    deps.some((d) => d.includes('jest') || d.includes('vitest') || d.includes('mocha'));

  const isFramework = has('react') && ctx.dependencies.includes('react') && readmeLower.includes('component');
  const isLibrary = Boolean(pkg && !(hasUIDeps && hasUserGuide) && hasAPIDocsStrong);

  const totalFiles = Math.max(ctx.fileCount, 1);
  const docRatio = ctx.docFileCount / totalFiles;

  const nameLower = ctx.name.toLowerCase();
  const tutorialHint = /tutorial|learn|example|starter|boilerplate|demo/.test(nameLower) || readmeLower.includes('tutorial');
  const experimentalHint = /experimental|poc|prototype|wip/.test(nameLower) || readmeLower.includes('experimental') || readmeLower.includes('proof of concept');
  const platformHint =
    hasWorkspaceCLI &&
    ctx.topLevelFiles.includes('apps') &&
    ctx.fileTree.some(
      (n) =>
        n.name === 'apps' &&
        n.type === 'directory' &&
        (n.children?.filter((c) => c.type === 'directory').length ?? 0) >= 2,
    ) &&
    (deps.some((d) => d.includes('expo') || d.includes('electron')) || readmeLower.includes('platform'));

  return {
    hasUI: hasUIDeps || hasUI,
    hasCLI,
    hasDesktopApp,
    hasMobileApp,
    hasUserGuide,
    hasAPIDocs: hasAPIDocsStrong,
    hasScreenshots,
    hasDemo,
    hasHomepage,
    hasPricing,
    hasDownload,
    hasTests,
    isFramework,
    isLibrary,
    isPlatform: platformHint,
    docRatio,
    tutorialHint,
    experimentalHint,
  };
}

export function inferProjectKind(ctx: ProjectContext): BasicAnalysis {
  const features = ctx.features ?? extractFeatures(ctx);

  // Doc repo shortcut
  if (features.docRatio > 0.8 && ctx.totalLines < 5000) {
    return {
      kind: 'documentation',
      confidence: 85,
      level: 'high',
      reasons: ['文档文件占比超过 80%', '代码量较少', hasReadmeReason(ctx)],
      features,
      scores: { product: 0, library: 0 },
      disclaimer: DISCLAIMER,
    };
  }

  if (features.tutorialHint && ctx.totalLines < 10000) {
    return {
      kind: 'tutorial',
      confidence: 75,
      level: 'medium',
      reasons: ['项目名称或文档包含教程关键词', '代码规模较小', '适合学习用途'],
      features,
      scores: { product: 0, library: 0 },
      disclaimer: DISCLAIMER,
    };
  }

  if (features.experimentalHint && ctx.git.totalCommits < 30) {
    return {
      kind: 'experimental',
      confidence: 70,
      level: 'medium',
      reasons: ['标记为实验性项目', '提交历史较短', '探索性质明显'],
      features,
      scores: { product: 0, library: 0 },
      disclaimer: DISCLAIMER,
    };
  }

  let productScore = 0;
  let libraryScore = 0;
  const reasons: string[] = [];

  if (features.hasUI) {
    productScore += 20;
    reasons.push('包含 UI 界面');
  }
  if (features.hasCLI) {
    productScore += 15;
  }
  if (features.hasUserGuide) {
    productScore += 15;
  }
  if (features.hasScreenshots) {
    productScore += 15;
  }
  if (features.hasDownload) {
    productScore += 20;
  }
  if (features.hasHomepage) {
    productScore += 10;
  }
  if (features.hasPricing) {
    productScore += 15;
  }
  if (features.hasDemo) {
    productScore += 10;
  }

  if (features.hasAPIDocs && !features.hasUI) {
    libraryScore += 20;
  }
  if (features.isFramework) {
    libraryScore += 25;
  }
  if (features.isLibrary) {
    libraryScore += 15;
  }
  if (features.hasTests && !features.hasUI) {
    libraryScore += 10;
  }

  let kind: BasicAnalysis['kind'] = 'other';
  if (productScore >= libraryScore + 20) kind = 'product';
  else if (libraryScore >= productScore + 20) kind = 'library';
  else if (productScore > 0 && libraryScore > 0) kind = 'hybrid';
  else if (productScore > 0) kind = 'product';
  else if (libraryScore > 0) kind = 'library';

  if (features.isPlatform) kind = 'platform';

  const totalScore = productScore + libraryScore;
  let confidence: number;
  if (totalScore === 0) {
    confidence = 45;
  } else {
    const diffScore = Math.abs(productScore - libraryScore);
    const separation = diffScore / totalScore;
    confidence = Math.round(55 + separation * 35 + Math.min(totalScore / 100, 10));
    // weak signal penalty
    if (totalScore < 15) confidence = Math.min(confidence, 58);
    else if (totalScore < 25) confidence = Math.min(confidence, 68);
    confidence = Math.max(45, Math.min(95, confidence));
    if (kind === 'hybrid') confidence = Math.min(confidence, 72);
    if (kind === 'other') confidence = Math.min(confidence, 50);
    if (kind === 'platform') confidence = Math.min(confidence, 88);
  }

  const finalReasons = buildReasons(features, kind, reasons);
  const level: BasicAnalysis['level'] = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';

  return {
    kind,
    confidence,
    level,
    reasons: finalReasons,
    features,
    scores: { product: productScore, library: libraryScore },
    disclaimer: DISCLAIMER,
  };
}

function hasReadmeReason(ctx: ProjectContext): string {
  return ctx.hasReadme ? '包含 README 文档' : '缺少 README';
}

function buildReasons(features: ProjectFeatures, kind: string, base: string[]): string[] {
  const out: string[] = [...base];

  if (features.hasCLI && !out.includes('提供 CLI 能力')) out.push('提供 CLI 能力');
  if (features.hasDemo && !out.includes('包含示例/演示')) out.push('包含示例/演示');
  if (features.hasHomepage && !out.includes('有独立官网')) out.push('有独立官网');
  if (features.hasDownload && !out.includes('提供下载入口')) out.push('提供下载入口');

  if (kind === 'platform') {
    if (features.isPlatform) out.push('多包/多应用平台结构');
    if (features.hasCLI) out.push('提供 CLI 能力');
    if (features.hasUI) out.push('包含 UI 能力');
    return out.slice(0, 3);
  }
  if (kind === 'library' || kind === 'hybrid') {
    if (features.hasAPIDocs && !out.includes('有 API 文档')) out.push('有 API 文档');
    if (features.isFramework) out.push('框架/库特征明显');
  }
  if (kind === 'product') {
    if (features.hasScreenshots && !out.includes('有产品截图')) out.push('有产品截图');
    if (features.hasUserGuide && !out.includes('包含用户指南')) out.push('包含用户指南');
  }
  if (features.hasTests) out.push('包含测试');
  if (out.length === 0) {
    if (kind === 'product') out.push('呈现产品形态');
    else if (kind === 'library') out.push('呈现库形态');
    else if (kind === 'platform') out.push('呈现平台形态');
    else out.push('以混合形态组织');
  }
  return out.slice(0, 3);
}
