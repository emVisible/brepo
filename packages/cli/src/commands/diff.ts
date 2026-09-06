import { Command } from 'commander';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeProject } from '@briefrepo/analyzer-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AnalysisResult } from '@briefrepo/types';
import { renderHtml } from '@briefrepo/web-reporter';

function delta(a: number, b: number): string {
  const d = b - a;
  if (d === 0) return '→ 0';
  return d > 0 ? `↗ +${d}` : `↘ ${d}`;
}

export const diffCommand = new Command('diff')
  .description('对比两个本地项目（或同一项目不同分支的两次检出）')
  .argument('<pathA>', '项目 A 路径')
  .argument('<pathB>', '项目 B 路径')
  .option('--json <path>', '输出 diff JSON')
  .option('--html <path>', '输出 diff HTML（默认 brepo-diff.html）')
  .option('--no-html', '不生成 HTML')
  .action(async (pathA: string, pathB: string, opts) => {
    const absA = resolve(process.cwd(), pathA);
    const absB = resolve(process.cwd(), pathB);

    for (const p of [absA, absB]) {
      try {
        const s = await stat(p);
        if (!s.isDirectory()) throw new Error();
      } catch {
        console.error(chalk.red(`路径不存在或非目录: ${p}`));
        process.exitCode = 1;
        return;
      }
    }

    const spinner = ora(`正在并行分析 ${pathA} ↔ ${pathB} ...`).start();
    const started = Date.now();
    try {
      const [a, b] = await Promise.all([analyzeProject(absA), analyzeProject(absB)]);
      spinner.succeed(`对比完成 · ${Date.now() - started}ms`);

      const techA = new Set(a.level0.techStack);
      const techB = new Set(b.level0.techStack);
      const techOnlyA = [...techA].filter((x) => !techB.has(x));
      const techOnlyB = [...techB].filter((x) => !techA.has(x));
      const techCommon = [...techA].filter((x) => techB.has(x));

      const depA = new Set(a.level1.dependencyGraph.map((e) => `${e.from}→${e.to}`));
      const depB = new Set(b.level1.dependencyGraph.map((e) => `${e.from}→${e.to}`));
      const depOnlyA = [...depA].filter((x) => !depB.has(x)).slice(0, 20);
      const depOnlyB = [...depB].filter((x) => !depA.has(x)).slice(0, 20);

      console.log('');
      console.log(chalk.bold(`📊 对比 ${a.context.name} ↔ ${b.context.name}`));
      console.log(`   文件 ${a.level0.fileCount} ${delta(a.level0.fileCount, b.level0.fileCount)}  → ${b.level0.fileCount}`);
      console.log(`   行数 ${a.level0.totalLines} ${delta(a.level0.totalLines, b.level0.totalLines)}  → ${b.level0.totalLines}`);
      console.log(`   依赖 ${a.level1.dependencyGraph.length} ${delta(a.level1.dependencyGraph.length, b.level1.dependencyGraph.length)}  → ${b.level1.dependencyGraph.length}`);
      console.log(`   函数 ${a.level1.complexity.functions ?? 0} ${delta(a.level1.complexity.functions ?? 0, b.level1.complexity.functions ?? 0)} → ${b.level1.complexity.functions ?? 0}`);
      console.log(`   类型 ${a.basicInference.kind} → ${b.basicInference.kind}`);
      console.log(`   技术栈 共有 ${techCommon.join(', ') || '—'} | 仅 A ${techOnlyA.join(', ') || '—'} | 仅 B ${techOnlyB.join(', ') || '—'}`);

      const diff = {
        a: { path: absA, name: a.context.name, level0: a.level0, level1: a.level1, basicInference: a.basicInference },
        b: { path: absB, name: b.context.name, level0: b.level0, level1: b.level1, basicInference: b.basicInference },
        deltas: {
          fileCount: b.level0.fileCount - a.level0.fileCount,
          totalLines: b.level0.totalLines - a.level0.totalLines,
          depEdges: b.level1.dependencyGraph.length - a.level1.dependencyGraph.length,
        },
        tech: { common: techCommon, onlyA: techOnlyA, onlyB: techOnlyB },
        deps: { onlyA: depOnlyA, onlyB: depOnlyB },
        generatedAt: new Date().toISOString(),
      };

      const combinedResult: AnalysisResult = {
        ...a,
        context: { ...a.context, name: `${a.context.name} ↔ ${b.context.name}` },
        basicInference: {
          ...a.basicInference,
          kind: 'hybrid',
          confidence: Math.round((a.basicInference.confidence + b.basicInference.confidence) / 2),
          reasons: [...a.basicInference.reasons, ...b.basicInference.reasons, `对比: ${a.context.name} (${a.basicInference.kind}) vs ${b.context.name} (${b.basicInference.kind})`],
          scores: { product: a.basicInference.scores.product + b.basicInference.scores.product, library: a.basicInference.scores.library + b.basicInference.scores.library },
        },
        keyFiles: [...a.keyFiles, ...b.keyFiles].slice(0, 10),
        onboardingTasks: [...a.onboardingTasks, ...b.onboardingTasks],
        durationMs: Date.now() - started,
      };

      if (opts.json) {
        const p = resolve(process.cwd(), opts.json);
        await mkdir(dirname(p), { recursive: true });
        await writeFile(p, JSON.stringify(diff, null, 2), 'utf-8');
        console.log(chalk.green(`\n✓ Diff JSON: ${p}`));
      }

      if (opts.html !== false) {
        const htmlPath = resolve(process.cwd(), opts.html ?? 'brepo-diff.html');
        const baseHtml = renderHtml(combinedResult);
        // 注入 diff 专属对比卡片（复用 template 的 card 样式与 tokens）
        const esc = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const diffCard = `
  <div class="card" id="diffCard">
    <div class="card-title">📊 对比详情 — ${esc(a.context.name)} <span class="muted" style="font-weight:500">↔</span> ${esc(b.context.name)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">技术栈</div>
        <div class="muted subtle">共有 ${esc(techCommon.join(', ') || '—')}</div>
        <div style="margin-top:8px;font-size:13px"><span style="color:#991b1b">仅 A:</span> ${esc(techOnlyA.join(', ') || '—')}</div>
        <div style="font-size:13px"><span style="color:#065f46">仅 B:</span> ${esc(techOnlyB.join(', ') || '—')}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">规模</div>
        <div style="font-size:13px">文件 ${a.level0.fileCount} ${esc(delta(a.level0.fileCount, b.level0.fileCount))} → ${b.level0.fileCount}</div>
        <div style="font-size:13px">行数 ${a.level0.totalLines.toLocaleString()} ${esc(delta(a.level0.totalLines, b.level0.totalLines))} → ${b.level0.totalLines.toLocaleString()}</div>
        <div style="font-size:13px">依赖边 ${a.level1.dependencyGraph.length} ${esc(delta(a.level1.dependencyGraph.length, b.level1.dependencyGraph.length))} → ${b.level1.dependencyGraph.length}</div>
        <div style="font-size:13px">类型 ${esc(a.basicInference.kind)} → ${esc(b.basicInference.kind)}</div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px">依赖差异（各前20）</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="border:1px solid #fecaca;border-radius:10px;overflow:hidden">
          <div style="background:#fef2f2;color:#991b1b;padding:6px 10px;font-size:12px;font-weight:600">仅 A</div>
          <div style="padding:10px;font-size:12px;white-space:pre-wrap;word-break:break-all">${esc(depOnlyA.join('\n') || '—')}</div>
        </div>
        <div style="border:1px solid #a7f3d0;border-radius:10px;overflow:hidden">
          <div style="background:#ecfdf5;color:#065f46;padding:6px 10px;font-size:12px;font-weight:600">仅 B</div>
          <div style="padding:10px;font-size:12px;white-space:pre-wrap;word-break:break-all">${esc(depOnlyB.join('\n') || '—')}</div>
        </div>
      </div>
    </div>
  </div>`;
        const html = baseHtml.replace('<div class="footer">', `${diffCard}\n  <div class="footer">`);
        await mkdir(dirname(htmlPath), { recursive: true });
        await writeFile(htmlPath, html, 'utf-8');
        console.log(chalk.green(`✓ Diff HTML: ${htmlPath}`));
      }
    } catch (err) {
      spinner.fail('对比失败');
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });
