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
});
