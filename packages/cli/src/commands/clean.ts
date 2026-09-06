import { Command } from 'commander';
import { unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';

export const cleanCommand = new Command('clean')
  .description('清理缓存与生成物（.brepo/cache.json、brief-report.*、brepo-diff.html）')
  .option('--dry-run', '仅预览将删除的文件', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const targets = [
      join(cwd, '.brepo', 'cache.json'),
      join(cwd, 'brief-report.html'),
      join(cwd, 'brief-report.json'),
      join(cwd, 'brief-report.md'),
      join(cwd, 'brepo-diff.html'),
      join(cwd, 'brepo-report.html'),
      join(cwd, 'brepo-report.json'),
    ];

    let removed = 0;
    for (const p of targets) {
      try {
        if (opts.dryRun) {
          // check exists
          const { stat } = await import('node:fs/promises');
          await stat(p);
          console.log(chalk.dim(`将删除: ${p}`));
        } else {
          await unlink(p);
          console.log(chalk.green(`✓ 已删除 ${p}`));
          removed++;
        }
      } catch {
        // not exists is fine
      }
    }

    if (opts.dryRun) {
      console.log(chalk.dim('\n--dry-run 未实际删除'));
      return;
    }

    // try remove .brepo dir if empty
    try {
      const { readdir } = await import('node:fs/promises');
      const entries = await readdir(join(cwd, '.brepo'));
      if (entries.length === 0) {
        await rm(join(cwd, '.brepo'), { recursive: true, force: true });
        console.log(chalk.dim('  已移除空 .brepo/'));
      }
    } catch {
      // ignore
    }

    if (removed === 0) console.log(chalk.dim('无可清理项'));
    else console.log(chalk.dim(`\n共清理 ${removed} 项`));
  });
