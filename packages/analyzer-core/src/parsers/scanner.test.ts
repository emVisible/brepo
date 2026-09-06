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
});
