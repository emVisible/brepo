import type { OnboardingTask, ProjectContext, BasicAnalysis } from '@briefrepo/types';

export function buildOnboardingTasks(
  ctx: ProjectContext,
  inference: BasicAnalysis,
  entryFiles: string[] = [],
): OnboardingTask[] {
  const tasks: OnboardingTask[] = [];
  const isMonorepo = ctx.topLevelFiles.includes('pnpm-workspace.yaml') || ctx.topLevelFiles.includes('packages');
  const hasTests = ctx.features.hasTests;
  const primary = ctx.primaryLanguage ?? 'TypeScript';

  tasks.push({
    day: 'Day 1',
    title: '本地跑起来',
    description: isMonorepo ? '执行 pnpm install && pnpm build，验证 brepo analyze 可运行' : `安装依赖并运行 ${primary} 项目`,
    difficulty: 'easy',
  });

  if (inference.kind === 'product' || inference.kind === 'hybrid') {
    tasks.push({
      day: 'Day 2',
      title: '走通核心流程',
      description: '用 brepo analyze 分析一个示例仓库，对比报告与实际代码',
      difficulty: 'easy',
    });
  } else {
    tasks.push({
      day: 'Day 2',
      title: '阅读核心实现',
      description: `打开 ${entryFiles[0] ?? '入口文件'}，梳理扫描→解析→推断的主链路`,
      difficulty: 'easy',
    });
  }

  tasks.push({
    day: 'Day 3',
    title: hasTests ? '为关键函数补一个单测' : '为关键模块加一个最小验证脚本',
    description: hasTests ? '为 type-inference 或 scanner 增加边界用例' : '写一个 30 行的 Node 脚本验证扫描结果',
    difficulty: 'medium',
  });

  tasks.push({
    day: 'Day 4-5',
    title: '提交第一个改进',
    description: '优化一条推断规则或美化报告卡片，提交 PR 并补充文档',
    difficulty: 'medium',
  });

  return tasks.slice(0, 4);
}


