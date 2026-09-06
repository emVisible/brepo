import type { KeyFile, ProjectContext } from '@briefrepo/types';

interface Candidate {
  path: string;
  reason: string;
  priority: number;
}

export function pickKeyFiles(ctx: ProjectContext): KeyFile[] {
  const all = new Set<string>();
  function collect(nodes: ProjectContext['fileTree']): void {
    for (const n of nodes) {
      if (n.type === 'file') all.add(n.path);
      if (n.children) collect(n.children as unknown as ProjectContext['fileTree']);
    }
  }
  collect(ctx.fileTree);

  const has = (p: string): boolean => all.has(p);

  const candidates: Candidate[] = [];

  if (has('README.md')) candidates.push({ path: 'README.md', reason: '项目说明与快速开始', priority: 1 });
  else if (has('readme.md')) candidates.push({ path: 'readme.md', reason: '项目说明', priority: 1 });

  if (has('package.json')) candidates.push({ path: 'package.json', reason: '依赖与脚本入口', priority: 2 });
  if (has('pnpm-workspace.yaml')) candidates.push({ path: 'pnpm-workspace.yaml', reason: 'Monorepo 工作区配置', priority: 3 });
  if (has('turbo.json')) candidates.push({ path: 'turbo.json', reason: '构建流水线', priority: 4 });

  const entryCandidates = ['packages/cli/src/index.ts', 'packages/analyzer-core/src/index.ts', 'src/index.ts', 'src/main.ts', 'src/main.tsx', 'app.ts', 'main.ts'];
  for (const e of entryCandidates) {
    if (has(e)) {
      candidates.push({ path: e, reason: '应用/包入口', priority: 2 });
      break;
    }
  }

  if (has('PROJECT-PLAN.md')) candidates.push({ path: 'PROJECT-PLAN.md', reason: '产品规划与架构决策', priority: 3 });

  // fallback: pick largest code file
  const largest = [...all].filter((p) => p.endsWith('.ts') || p.endsWith('.js')).slice(0, 1);
  for (const p of largest) {
    if (!candidates.some((c) => c.path === p)) candidates.push({ path: p, reason: '核心实现', priority: 5 });
  }

  // deduplicate and sort
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.path)) return false;
    seen.add(c.path);
    return true;
  });

  return deduped.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
