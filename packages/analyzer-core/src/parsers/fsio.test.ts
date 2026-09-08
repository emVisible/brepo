import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readHead } from './fsio.js';

describe('readHead', () => {
  it('returns prefix without reading whole file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-fsio-'));
    const p = join(dir, 'big.txt');
    await writeFile(p, '0123456789'.repeat(1000));
    expect(await readHead(p, 25)).toBe('0123456789'.repeat(2) + '01234');
    await rm(dir, { recursive: true, force: true });
  });

  it('does not split multibyte chars at boundary', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-fsio-'));
    const p = join(dir, 'cjk.txt');
    await writeFile(p, '中文测试内容结尾');
    // 5 bytes cuts inside a 3-byte char; decoder must not emit U+FFFD garbage splitting
    const head = await readHead(p, 5);
    expect(head).toBe('中');
    await rm(dir, { recursive: true, force: true });
  });

  it('returns undefined for missing file', async () => {
    expect(await readHead(join(tmpdir(), 'brepo-nope', 'x.txt'), 100)).toBeUndefined();
  });
});
