import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeComplexity } from './complexity.js';

describe('analyzeComplexity', () => {
  it('counts functions/classes/branches', async () => {
    const root = join(tmpdir(), `brepo-cplx-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), `class Foo {}\nfunction bar(){ if(true && false){ for(let i=0;i<10;i++){ } } }\nconst x = () => {};\n`);
    const stats = await analyzeComplexity(root, ['src/a.ts']);
    expect(stats.classes).toBeGreaterThanOrEqual(1);
    expect(stats.functions).toBeGreaterThanOrEqual(1);
    expect(stats.branches).toBeGreaterThanOrEqual(1);
    await rm(root, { recursive: true, force: true });
  });

  it('handles empty', async () => {
    const root = join(tmpdir(), `brepo-cplx-empty-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const stats = await analyzeComplexity(root, []);
    expect(stats.functions).toBe(0);
    await rm(root, { recursive: true, force: true });
  });

  it('samples files over the parse cap instead of reading them fully', async () => {
    const root = join(tmpdir(), `brepo-cplx-sample-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    // 200KB 全是函数定义：头部样本应计数 > 0（与旧 slice 行为一致）
    await writeFile(join(root, 'src', 'big.ts'), 'function f(){} if(a){}\n'.repeat(10000).slice(0, 200 * 1024));
    const stats = await analyzeComplexity(root, ['src/big.ts']);
    expect(stats.functions).toBeGreaterThan(100);
    await rm(root, { recursive: true, force: true });
  });
});
