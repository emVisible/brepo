import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseDependencyGraph } from './imports.js';

describe('parseDependencyGraph', () => {
  it('extracts import and require', async () => {
    const root = join(tmpdir(), `brepo-imports-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), `import x from 'react';\nimport y from './b';\nconst z = require('express');\n`);
    await writeFile(join(root, 'src', 'b.ts'), `export const b=1;`);
    const edges = await parseDependencyGraph(root, ['src/a.ts', 'src/b.ts']);
    expect(edges.some((e) => e.to === 'react')).toBe(true);
    expect(edges.some((e) => e.to === './b')).toBe(true);
    expect(edges.some((e) => e.to === 'express' && e.type === 'require')).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it('concurrent safety: 20 files same result as serial', async () => {
    const root = join(tmpdir(), `brepo-conc-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    for (let i = 0; i < 20; i++) {
      await writeFile(join(root, `src/f${i}.ts`), `import x${i} from 'pkg${i}';\n`);
    }
    const files = Array.from({ length: 20 }, (_, i) => `src/f${i}.ts`);
    const edges = await parseDependencyGraph(root, files);
    expect(edges.length).toBe(20);
    await rm(root, { recursive: true, force: true });
  });

  it('ignores huge files', async () => {
    const root = join(tmpdir(), `brepo-huge-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const big = 'x'.repeat(90_000);
    await writeFile(join(root, 'big.ts'), big);
    const edges = await parseDependencyGraph(root, ['big.ts']);
    expect(edges.length).toBe(0);
    await rm(root, { recursive: true, force: true });
  });

  it('skips files over the parse cap via stat (no full read needed)', async () => {
    const root = join(tmpdir(), `brepo-overcap-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    // 200KB：超过 120KB 上限，即使含 import 也必须跳过（与旧行为一致）
    await writeFile(join(root, 'src', 'big.ts'), `import x from 'react';\n`.padEnd(200 * 1024, 'x'));
    await writeFile(join(root, 'src', 'small.ts'), `import y from './big';\n`);
    const edges = await parseDependencyGraph(root, ['src/big.ts', 'src/small.ts']);
    expect(edges.some((e) => e.from === 'src/big.ts')).toBe(false);
    expect(edges.some((e) => e.from === 'src/small.ts' && e.to === './big')).toBe(true);
    await rm(root, { recursive: true, force: true });
  });
});
