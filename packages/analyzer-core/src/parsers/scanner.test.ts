import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanProject } from './scanner.js';

describe('scanProject', () => {
  it('scans temp project and ignores node_modules', async () => {
    const root = join(tmpdir(), `brepo-test-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'foo'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'console.log(1)\n'.repeat(10));
    await writeFile(join(root, 'README.md'), '# Hello\n');
    await writeFile(join(root, 'node_modules', 'foo', 'index.js'), 'ignored');

    const res = await scanProject(root);
    expect(res.fileCount).toBeGreaterThanOrEqual(2);
    expect(res.languages['TypeScript']).toBe(1);
    expect(res.allFiles.includes('node_modules/foo/index.js')).toBe(false);
    expect(res.topLevelFiles).toContain('src');

    await rm(root, { recursive: true, force: true });
  });

  it('does not deadlock when directories in flight exceed limiter slots (70 dirs)', async () => {
    const root = join(tmpdir(), `brepo-test-dead-${Date.now()}`);
    for (let i = 0; i < 70; i++) {
      await mkdir(join(root, `d${i}`), { recursive: true });
      await writeFile(join(root, `d${i}`, 'f.txt'), 'x\n');
    }
    const res = await scanProject(root);
    // .txt 属 DOC 会被纳入；关键是必须 resolve 而非 hang
    expect(res.fileCount).toBe(70);

    await mkdir(join(root, 'solo'), { recursive: true });
    await writeFile(join(root, 'solo', 'a.ts'), 'const a = 1;\n');
    const res2 = await scanProject(root);
    expect(res2.allFiles).toContain('solo/a.ts');

    await rm(root, { recursive: true, force: true });
  }, 15000);

  it('excludes css/png by default, includes them via includeExts', async () => {
    const root = join(tmpdir(), `brepo-test-ext-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), 'const a = 1;\n');
    await writeFile(join(root, 'src', 'a.css'), '.a { color: red; }\n.x {}\n');
    await writeFile(join(root, 'src', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const def = await scanProject(root);
    expect(def.allFiles.includes('src/a.css')).toBe(false);
    expect(def.allFiles.includes('src/a.png')).toBe(false);

    const inc = await scanProject(root, { includeExts: ['css', '.PNG'] });
    expect(inc.allFiles.includes('src/a.css')).toBe(true);
    expect(inc.allFiles.includes('src/a.png')).toBe(true);
    expect(inc.languages['CSS']).toBe(1);

    await rm(root, { recursive: true, force: true });
  });

  it('estimates extra whitelisted files over the read cap instead of reading them', async () => {
    const root = join(tmpdir(), `brepo-test-cap-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    // 300KB 文本但只有 10 行：若被全量读取行数为 10，走上限分支则为 KB 折算值
    await writeFile(join(root, 'src', 'big.css'), '.a{color:red}\n'.repeat(10).padEnd(300 * 1024, ' '));
    const res = await scanProject(root, { includeExts: ['css'] });
    expect(res.allFiles.includes('src/big.css')).toBe(true);
    expect(res.fileTree[0]?.children?.[0]).toBeDefined();
    const node = res.fileTree.flatMap((n) => n.children ?? []).find((n) => n.name === 'big.css');
    expect(node?.lineCount).toBe(Math.round(300));
    await rm(root, { recursive: true, force: true });
  });
});
