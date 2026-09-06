import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const CACHE_DIR = '.brepo';
const CACHE_FILE = 'cache.json';
const CACHE_VERSION = 2;

export interface CacheEntry {
  version: number;
  key: string;
  result: unknown;
  createdAt: string;
}

function cachePath(root: string): string {
  return join(root, CACHE_DIR, CACHE_FILE);
}

export async function computeCacheKey(root: string, head: string | undefined, includeExts: string[] = []): Promise<string> {
  // key = hash( head + topLevelFiles mtime list + 过滤选项 )
  const h = createHash('sha256');
  h.update(`v${CACHE_VERSION}:`);
  h.update(head ?? 'no-head');
  h.update(':');
  h.update(`exts:${[...includeExts].sort().join(',')};`);
  // sample top-level mtimes for quick invalidation (package.json, pnpm-workspace.yaml, README)
  const samples = ['package.json', 'pnpm-workspace.yaml', 'README.md', 'pnpm-lock.yaml'];
  for (const f of samples) {
    try {
      const s = await stat(join(root, f));
      h.update(`${f}:${s.mtimeMs}:${s.size};`);
    } catch {
      h.update(`${f}:missing;`);
    }
  }
  return h.digest('hex').slice(0, 16);
}

export async function readCache(root: string, key: string): Promise<unknown | undefined> {
  try {
    const raw = await readFile(cachePath(root), 'utf-8');
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.version !== CACHE_VERSION) return undefined;
    if (entry.key !== key) return undefined;
    return entry.result;
  } catch {
    return undefined;
  }
}

export async function writeCache(root: string, key: string, result: unknown): Promise<void> {
  const entry: CacheEntry = { version: CACHE_VERSION, key, result, createdAt: new Date().toISOString() };
  const dir = join(root, CACHE_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(cachePath(root), JSON.stringify(entry), 'utf-8');
}

export async function clearCache(root: string): Promise<boolean> {
  const p = cachePath(root);
  try {
    const { unlink } = await import('node:fs/promises');
    await unlink(p);
    return true;
  } catch {
    return false;
  }
}

export function getCachePath(root: string): string {
  return cachePath(root);
}
