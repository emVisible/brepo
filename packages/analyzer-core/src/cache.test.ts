import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeCacheKey, readCache, writeCache, clearCache, getCachePath } from './cache.js';

describe('cache', () => {
  it('computeCacheKey is deterministic for same head', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-cache-'));
    await writeFile(join(dir, 'package.json'), '{"name":"a"}', 'utf-8');
    const k1 = await computeCacheKey(dir, 'abc');
    const k2 = await computeCacheKey(dir, 'abc');
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^[0-9a-f]{16}$/);
  });

  it('readCache returns undefined when version mismatch or missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-cache-2-'));
    const key = await computeCacheKey(dir, 'head');
    expect(await readCache(dir, key)).toBeUndefined();
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(dir, '.brepo'), { recursive: true });
    await writeFile(join(dir, '.brepo', 'cache.json'), JSON.stringify({ version: 1, key, result: { ok: true } }), 'utf-8');
    expect(await readCache(dir, key)).toBeUndefined();
  });

  it('write and read round-trip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brepo-cache-3-'));
    const key = await computeCacheKey(dir, 'h');
    const payload = { a: 1 };
    await writeCache(dir, key, payload);
    const out = await readCache(dir, key);
    expect(out).toEqual(payload);
    const p = getCachePath(dir);
    expect(p).toContain('.brepo/cache.json');
    expect(await clearCache(dir)).toBe(true);
    expect(await readCache(dir, key)).toBeUndefined();
  });
});
