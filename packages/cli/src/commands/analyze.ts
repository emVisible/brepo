import { Command } from 'commander';
import { resolve, extname, basename } from 'node:path';
import { stat } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeProject } from '@briefrepo/analyzer-core';
import { writeJsonReport, writeHtmlReport, writeMarkdownReport } from '../utils/output.js';
import { tryHtmlToPdf } from '../utils/pdf.js';

      const ALLOWED_EXT: Record<string, Set<string>> = {
  json: new Set(['.json']),
  html: new Set(['.html', '.htm']),
  pdf: new Set(['.pdf']),
  markdown: new Set(['.md', '.markdown']),
};

function validateOutPath(raw: string, kind: 'json' | 'html' | 'pdf' | 'markdown'): string {
  if (!raw || raw.length > 512) throw new Error(`输出路径长度非法: ${raw?.slice(0, 80)}`);
  if (raw.includes('\0')) throw new Error('非法文件名');
  if (raw.includes('..')) throw new Error(`输出路径禁止包含 .. : ${raw}`);
  const resolved = resolve(process.cwd(), raw);
  // block sensitive system paths (allow /var/folders for macOS tmpdir)
  if (resolved === '/etc/passwd' || resolved.startsWith('/etc/') || resolved.startsWith('/usr/bin/')) {
    throw new Error(`禁止写入系统路径: ${raw}`);
  }
  const ext = extname(resolved).toLowerCase();
  if (!ALLOWED_EXT[kind]?.has(ext)) throw new Error(`输出文件扩展名必须为 ${[...(ALLOWED_EXT[kind] ?? [])].join('/')}，收到: ${raw}`);
  const base = basename(resolved);
  if (base.length > 255) throw new Error('文件名过长');
  return resolved;
}

export const analyzeCommand = new Command('analyze')
  .description('分析本地项目并生成导航报告（纯本地静态分析）')
  .argument('[path]', '项目路径', '.')
  .option('--include-ext <list>', '额外纳入的扩展名（逗号分隔，如 css,scss,png；锁文件始终排除）')
  .option('--no-cache', '禁用缓存（默认 Basic 启用）')
  .option('--verbose', '流式输出详细过程', false)
  .option('--json <path>', '额外输出 JSON 路径')
  .option('--html <path>', '输出 HTML 路径（默认 brief-report.html）')
  .option('--no-html', '不生成 HTML')
  .option('--markdown <path>', '额外输出 Markdown 报告')
  .option('--pdf <path>', '导出 PDF（需 puppeteer，未安装则提示浏览器打印）')
  .action(async (pathArg: string, opts) => {
    const target = resolve(process.cwd(), pathArg);

    try {
      const s = await stat(target);
      if (!s.isDirectory()) {
        console.error(chalk.red(`路径不是目录: ${target}`));
        process.exitCode = 1;
        return;
      }
    } catch {
      console.error(chalk.red(`路径不存在: ${target}`));
      process.exitCode = 1;
      return;
    }

    const spinner = ora(`正在分析 ${target} ...`).start();
    const started = Date.now();
    const verbose = Boolean(opts.verbose ?? process.env['BREPO_VERBOSE']);

    try {
      const events: Array<{ phase: string; msg: string; pct: number; level: string }> = [];
      const onEvent = (e: { phase: string; msg: string; pct: number; level: string }) => {
        events.push(e as never);
        const icon = e.level === 'error' ? '✗' : e.level === 'warn' ? '⚠' : '·';
        const line = `${String(e.pct).padStart(3, ' ')}% ${icon} [${e.phase}] ${e.msg}`;
        if (verbose) console.log(chalk.dim(line));
        else spinner.text = `正在分析 ${target} — ${e.msg} (${e.pct}%)`;
        if (e.level === 'error') console.error(chalk.red(`  ${e.msg}`));
      };
      const includeExts = String(opts.includeExt ?? '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      const result = await analyzeProject(target, {
        includeExts: includeExts.length ? includeExts : undefined,
        useCache: opts.cache !== false,
        onEvent: onEvent as never,
      });
      (result as unknown as { events?: unknown }).events = events;
      spinner.succeed(`分析完成 · ${Date.now() - started}ms`);

      const kindLabel: Record<string, string> = {
        product: '产品应用',
        library: '库/框架',
        documentation: '文档仓库',
        experimental: '实验性质',
        tutorial: '学习性质',
        hybrid: '混合型',
        other: '其他',
      };

      console.log('');
      console.log(chalk.bold(`📦 ${result.context.name}`));
      console.log(chalk.dim(`   ${result.context.description || '暂无描述'}`));
      console.log('');
      console.log(`   类型: ${chalk.cyan(kindLabel[result.basicInference.kind] ?? result.basicInference.kind)}  置信度 ${result.basicInference.confidence}% (${result.basicInference.level})`);
      console.log(`   理由: ${result.basicInference.reasons.join(' · ')}`);
      console.log(`   技术栈: ${result.level0.techStack.join(', ') || '—'}`);
      console.log(`   文件: ${result.level0.fileCount}  行数: ${result.level0.totalLines.toLocaleString()}  主语言: ${result.level0.primaryLanguage ?? '—'}`);
      console.log(`   Git: ${result.level0.git.totalCommits} 提交 · ${result.level0.git.contributors} 贡献者`);
      const health = (result.level1 as unknown as { health?: { score: number; label: string } }).health;
      const hot = (result.level1.hotspots?.length ?? 0);
      const cyc = (result.level1.cycles?.length ?? 0);
      console.log(`   依赖: ${result.level1.dependencyGraph.length} 条边 · 复杂度: ${result.level1.complexity.functions ?? 0} 函数 · ${result.level1.complexity.classes ?? 0} 类 · ${result.level1.complexity.branches ?? 0} 分支${health ? ` · 健康 ${health.score}(${health.label})` : ''}${hot ? ` · 热点 ${hot}` : ''}${cyc ? ` · 环 ${cyc}` : ''}`);
      console.log(chalk.dim(`   ${result.basicInference.disclaimer}`));

      const htmlPath = opts.html === false ? undefined : validateOutPath(opts.html ?? 'brief-report.html', 'html');
      if (htmlPath) {
        await writeHtmlReport(result, htmlPath);
        console.log(chalk.green(`\n✓ HTML 报告: ${htmlPath}`));
      }

      if (opts.json) {
        const jsonPath = validateOutPath(opts.json, 'json');
        await writeJsonReport(result, jsonPath);
        console.log(chalk.green(`✓ JSON 报告: ${jsonPath}`));
      }

      if (opts.markdown) {
        const mdPath = validateOutPath(opts.markdown, 'markdown');
        await writeMarkdownReport(result, mdPath);
        console.log(chalk.green(`✓ Markdown 报告: ${mdPath}`));
      }

      if (opts.pdf) {
        const pdfPath = validateOutPath(opts.pdf, 'pdf');
        // ensure html exists for pdf conversion
        const sourceHtml = htmlPath ?? validateOutPath('brief-report.html', 'html');
        if (!htmlPath) {
          await writeHtmlReport(result, sourceHtml);
        }
        const res = await tryHtmlToPdf(sourceHtml, pdfPath);
        if (res.ok) console.log(chalk.green(`✓ PDF: ${pdfPath}`));
        else console.log(chalk.yellow(`ℹ PDF: ${res.message}`));
      }

    } catch (err) {
      spinner.fail('分析失败');
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(msg));
      if (err instanceof Error && err.stack) console.error(chalk.dim(err.stack));
      process.exitCode = 1;
    }
  });
