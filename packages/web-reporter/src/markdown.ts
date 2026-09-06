import type { AnalysisResult } from '@briefrepo/types';

export function renderMarkdown(result: AnalysisResult): string {
  const { context, level0, level1, basicInference, keyFiles, onboardingTasks } = result;
  const kindLabel: Record<string, string> = {
    product: '产品应用',
    library: '库 / 框架',
    documentation: '文档仓库',
    experimental: '实验性质',
    tutorial: '学习性质',
    hybrid: '混合型',
    other: '其他',
    platform: '平台',
  };

  const lines: string[] = [];
  lines.push(`# ${context.name} — BriefRepo 导航报告`);
  lines.push('');
  lines.push(`> ${context.description || '暂无描述'}`);
  lines.push('');
  lines.push(`- **类型**: ${kindLabel[basicInference.kind] ?? basicInference.kind} · 置信度 ${basicInference.confidence}% · ${basicInference.level}`);
  lines.push(`- **理由**: ${basicInference.reasons.join(' · ') || '—'}`);
  lines.push(`- **技术栈**: ${level0.techStack.join(', ') || '—'}`);
  lines.push(`- **规模**: ${level0.fileCount} 文件 · ${level0.totalLines.toLocaleString()} 行 · 主语言 ${level0.primaryLanguage ?? '—'}`);
  lines.push(`- **Git**: ${level0.git.totalCommits} 提交 · ${level0.git.contributors} 贡献者 · 近30天 ${level0.git.recentActivity}`);
  lines.push(`- **依赖**: ${level1.dependencyGraph.length} 条边 · 函数 ${level1.complexity.functions ?? 0} · 类 ${level1.complexity.classes ?? 0} · 分支 ${level1.complexity.branches ?? 0}`);
  lines.push(`- **生成**: ${new Date(result.generatedAt).toLocaleString('zh-CN')} · 耗时 ${result.durationMs}ms`);
  lines.push('');
  lines.push(`> ${basicInference.disclaimer}`);
  lines.push('');

  lines.push('## 🧩 入口与模块');
  lines.push('');
  lines.push(`- 入口: ${level1.entryFiles.join(', ') || '未识别'}`);
  lines.push(`- 核心目录: ${level1.coreModules.join(', ') || '—'}`);
  lines.push(`- 深度: ${level1.complexity.maxDepth} · ${level1.complexity.hasTests ? '含测试' : '暂无测试'}`);
  lines.push('');

  if (level1.dependencyGraph.length > 0) {
    lines.push('## 🕸️ 依赖图谱（前 20 条）');
    lines.push('');
    lines.push('| From | To | Type |');
    lines.push('|------|----|------|');
    for (const e of level1.dependencyGraph.slice(0, 20)) {
      lines.push(`| \`${e.from}\` | \`${e.to}\` | ${e.type} |`);
    }
    lines.push('');
  }

  lines.push('## 🔑 新人必读 Top 5');
  lines.push('');
  for (let i = 0; i < keyFiles.length; i++) {
    const k = keyFiles[i]!;
    lines.push(`${i + 1}. **\`${k.path}\`** — ${k.reason}`);
  }
  if (keyFiles.length === 0) lines.push('- 未识别');
  lines.push('');

  lines.push('## 👶 第一周上手');
  lines.push('');
  for (const t of onboardingTasks) {
    lines.push(`- **${t.day} ${t.title}** (${t.difficulty}) — ${t.description}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('BriefRepo · 本地优先 · 代码不出本机 · `brepo analyze` 生成');
  lines.push('');
  return lines.join('\n');
}
