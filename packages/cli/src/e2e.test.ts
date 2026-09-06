import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(process.cwd(), 'packages/cli/dist/index.js');

function run(args: string): { status: number; stdout: string; stderr: string } {
  const r = spawnSync('node', [CLI, ...args.split(' ').filter(Boolean)], { encoding: 'utf-8' });
  return { status: r.status ?? 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('brepo e2e', () => {
  it('--version', () => {
    const r = run('--version');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/0\.1\.0/);
  });

  it('--help lists commands', () => {
    const r = run('--help');
    expect(r.stdout).toContain('analyze');
    expect(r.stdout).toContain('doctor');
    expect(r.stdout).not.toContain('serve');
    expect(r.stdout).not.toContain('init');
  });

  it('analyze --help', () => {
    const r = run('analyze --help');
    expect(r.stdout).toContain('--include-ext');
    expect(r.stdout).toContain('--markdown');
  });

  it('analyze basic produces json/html', () => {
    const outJson = join(tmpdir(), `brepo-e2e-${Date.now()}.json`);
    const outHtml = join(tmpdir(), `brepo-e2e-${Date.now()}.html`);
    const r = run(`analyze . --json ${outJson} --html ${outHtml}`);
    expect(r.status).toBe(0);
    expect(existsSync(outJson)).toBe(true);
    expect(existsSync(outHtml)).toBe(true);
    const j = JSON.parse(readFileSync(outJson, 'utf-8'));
    expect(j.basicInference).toBeDefined();
    expect(j.level0).toBeDefined();
    expect(j.level1.dependencyGraph).toBeDefined();
  });

  it('doctor passes', () => {
    const r = run('doctor');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Node');
  });

  it('analyze --help lists include-ext', () => {
    const r = run('analyze --help');
    expect(r.stdout).toContain('--include-ext');
  });

  it('bin is executable (shebang)', () => {
    const content = readFileSync(CLI, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('validateOutPath blocks traversal', () => {
    const r = run('analyze . --json ../../tmp/pwn.json');
    expect(r.stdout + r.stderr).toContain('禁止包含 ..');
    expect(r.status).not.toBe(0);
  });
});
