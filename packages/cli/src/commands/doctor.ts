import { Command } from 'commander';
import chalk from 'chalk';
import { access, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const doctorCommand = new Command('doctor')
  .description('诊断环境与配置')
  .option('--verbose', '详细输出')
  .action(async (opts) => {
    const checks: { name: string; ok: boolean; msg: string }[] = [];
    const verbose = Boolean(opts.verbose);

    // Node
    const nodeOk = Number(process.versions.node.split('.')[0] ?? 0) >= 18;
    checks.push({ name: 'Node >=18', ok: nodeOk, msg: process.versions.node });

    // pnpm
    try {
      const { execSync } = await import('node:child_process');
      const v = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
      checks.push({ name: 'pnpm', ok: true, msg: v });
    } catch (e) {
      checks.push({ name: 'pnpm', ok: false, msg: e instanceof Error ? e.message : String(e) });
    }

    // git
    try {
      const { execSync } = await import('node:child_process');
      const v = execSync('git --version', { encoding: 'utf-8' }).trim();
      checks.push({ name: 'git', ok: true, msg: v });
    } catch {
      checks.push({ name: 'git', ok: false, msg: '未安装' });
    }

    if (verbose) {
      checks.push({ name: '分析', ok: true, msg: '纯本地静态分析' });
    }

    // writable
    const testPath = join(process.cwd(), `.brepo-doctor-${Date.now()}.tmp`);
    try {
      await writeFile(testPath, 'ok');
      await access(testPath);
      await unlink(testPath);
      checks.push({ name: '目录可写', ok: true, msg: process.cwd() });
    } catch (e) {
      checks.push({ name: '目录可写', ok: false, msg: e instanceof Error ? e.message : String(e) });
    }

    // report file
    const canWriteReport = checks.find((c) => c.name === '目录可写')?.ok;
    checks.push({ name: '报告生成', ok: Boolean(canWriteReport), msg: canWriteReport ? '可写 brief-report.html' : '不可写' });

    // output
    console.log(chalk.bold('\nbrepo doctor\n'));
    for (const c of checks) {
      const icon = c.ok ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${c.name.padEnd(12)} ${chalk.dim(c.msg)}`);
    }
    const failed = checks.filter((c) => !c.ok);
    if (failed.length === 0) {
      console.log(chalk.green('\n✓ 环境就绪'));
    } else {
      console.log(chalk.yellow(`\n⚠ ${failed.length} 项需关注`));
      process.exitCode = 1;
    }
  });
