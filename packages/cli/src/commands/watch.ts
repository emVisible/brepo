import { Command } from 'commander';
import { resolve } from 'node:path';
import { stat, watch as fsWatch } from 'node:fs/promises';
import { watch as fsWatchSync } from 'node:fs';
import chalk from 'chalk';
import { analyzeProject } from '@briefrepo/analyzer-core';
import { writeJsonReport, writeHtmlReport } from '../utils/output.js';

function debounce<T extends (...a: never[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let t: NodeJS.Timeout | undefined;
  const wrapped = (...args: Parameters<T>): void => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...(args as never[])), ms);
  };
  (wrapped as unknown as { cancel: () => void }).cancel = () => {
    if (t) clearTimeout(t);
  };
  return wrapped as T & { cancel: () => void };
}

export const watchCommand = new Command('watch')
  .description('监听项目变更，自动重分析（适合开发时常驻）')
  .argument('[path]', '项目路径', '.')
  .option('--json <path>', 'JSON 输出路径', 'brief-report.json')
  .option('--html <path>', 'HTML 输出路径', 'brief-report.html')
  .option('--debounce <ms>', '防抖毫秒', '600')
  .action(async (pathArg: string, opts) => {
    const target = resolve(process.cwd(), pathArg);
    try {
      const s = await stat(target);
      if (!s.isDirectory()) throw new Error();
    } catch {
      console.error(chalk.red(`路径不存在或非目录: ${target}`));
      process.exitCode = 1;
      return;
    }

    let runId = 0;
    const doAnalyze = async (reason: string): Promise<void> => {
      const id = ++runId;
      const start = Date.now();
      console.log(chalk.dim(`\n[${new Date().toLocaleTimeString()}] ${reason}`));
      try {
        const result = await analyzeProject(target, {});
        if (id !== runId) return; // superseded by newer run
        if (opts.json) await writeJsonReport(result, resolve(process.cwd(), opts.json));
        if (opts.html) await writeHtmlReport(result, resolve(process.cwd(), opts.html));
        console.log(
          chalk.green(`✓ #${id} 完成 · ${Date.now() - start}ms · ${result.basicInference.kind} ${result.basicInference.confidence}% · ${result.level0.fileCount} 文件`) +
            chalk.dim(` → ${opts.html ?? 'brief-report.html'}`),
        );
      } catch (err) {
        console.error(chalk.red(`✗ #${id} 失败: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    // initial run
    await doAnalyze('初始分析');

    const debounceMs = Math.max(200, Number(opts.debounce) || 600);
    const debounced = debounce(() => void doAnalyze('文件变更'), debounceMs);

    console.log(chalk.dim(`👀 监听中: ${target} (防抖 ${debounceMs}ms) — Ctrl+C 退出`));
    console.log(chalk.dim(`   提示: 搭配 pnpm dev 可在 WebUI 实时查看`));

    // use fs.watch (Node 20+ supports recursive)
    try {
      const watcher = fsWatch(target, { recursive: true } as never);
      // async iterator version (node:fs/promises watch)
      for await (const ev of watcher) {
        const filename = (ev as unknown as { filename?: string }).filename ?? '';
        if (!filename) {
          debounced();
          continue;
        }
        // ignore transient outputs
        if (filename.includes('brief-report.') || filename.includes('.brepo') || filename.includes('node_modules') || filename.includes('.git') || filename.includes('dist') || filename.includes('.turbo')) continue;
        debounced();
      }
    } catch {
      // fallback to sync watch
      const w = fsWatchSync(target, { recursive: true } as never, () => debounced());
      process.on('SIGINT', () => {
        w.close();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        w.close();
        process.exit(0);
      });
      await new Promise(() => {});
    }
  });
