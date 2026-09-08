import { readdir, lstat, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import type { FilterId } from '@briefrepo/types';
import { DEFAULT_EXCLUDE, matchFilter } from '@briefrepo/types';
import { SCAN } from '../constants.js';
import { readHead } from './fsio.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  'coverage',
  '.cache',
  'vendor',
  '__pycache__',
  '.venv',
  'target',
  '.pnpm',
  '.vercel',
  '.output',
  'tmp',
]);

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.env.local']);
const IGNORED_EXTS = new Set([
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.map',
  '.mp4',
  '.mp3',
  '.pdf',
  '.zip',
  '.gz',
]);
const IGNORED_EXACT = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']);

const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.vue',
  '.svelte',
  '.astro',
]);

const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.rst', '.txt', '.adoc']);

export interface ScanResult {
  /** 未被过滤的有效文件数（用于 treemap/复杂度/依赖图等分析视图） */
  fileCount: number;
  totalLines: number;
  docFileCount: number;
  languages: Record<string, number>;
  primaryLanguage?: string;
  fileTree: FileNode[];
  topLevelFiles: string[];
  /** 未被过滤的有效文件相对路径 */
  allFiles: string[];
  fileContents: Map<string, string>;
  /** 含被过滤文件的总数（含 fileTree/allFilteredFiles） */
  fileCountAll: number;
  totalLinesAll: number;
  /** 被过滤文件（含原因，可用于左树打标与总数拆解） */
  filteredFiles: Array<{ path: string; reason: FilterId }>;
  allFilteredFiles: string[];
  filteredBy: Record<FilterId, number>;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lineCount?: number;
  filtered?: FilterId;
}

function extToLanguage(ext: string): string | undefined {
  const map: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.css': 'CSS',
    '.scss': 'CSS',
    '.less': 'CSS',
    '.html': 'HTML',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    '.pdf': 'PDF',
    '.woff': 'Font',
    '.woff2': 'Font',
    '.ttf': 'Font',
    '.otf': 'Font',
    '.eot': 'Font',
    '.mp3': 'Audio',
    '.wav': 'Audio',
    '.ogg': 'Audio',
    '.flac': 'Audio',
    '.mp4': 'Video',
    '.webm': 'Video',
    '.mov': 'Video',
    '.avi': 'Video',
    '.zip': 'Archive',
    '.tar': 'Archive',
    '.gz': 'Archive',
    '.7z': 'Archive',
    '.rar': 'Archive',
  };
  return map[ext];
}

/** 规范化用户传入的扩展名白名单：小写、补前导点、去重、上限 */
export function normalizeIncludeExts(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    let e = raw.trim().toLowerCase();
    if (!e) continue;
    if (!e.startsWith('.')) e = `.${e}`;
    if (!/^\.[a-z0-9]{1,10}$/.test(e)) continue;
    if (!out.includes(e)) out.push(e);
    if (out.length >= 24) break;
  }
  return out;
}

function shouldIgnore(name: string, _include?: Set<string>): boolean {
  if (IGNORED_DIRS.has(name)) return true;
  if (IGNORED_FILES.has(name)) return true;
  if (IGNORED_EXACT.has(name)) return true;
  // IGNORED_EXTS 的判定下沉到文件级：被过滤的资源（test/media/generated）需保留为 fileTree 标记，不在此直接丢弃
  if (name.startsWith('.')) {
    if (name === '.github') return false;
    if (name === '.env.example') return false;
    return true;
  }
  return false;
}

function isCodeLike(name: string): boolean {
  const ext = extname(name).toLowerCase();
  if (CODE_EXTENSIONS.has(ext)) return true;
  if (['.json', '.md', '.mdx', '.rst', '.txt', '.adoc'].includes(ext)) return false;
  return false;
}

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= concurrency) {
      await new Promise<void>((res) => queue.push(res));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  };
  return run;
}

const limitFs = createLimiter(SCAN.concurrency);

export interface ScanOptions {
  /** 额外纳入的扩展名（绕过 IGNORED_EXTS 与代码/文档门限；锁文件仍永久排除） */
  includeExts?: string[];
}

export async function scanProject(root: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const include = new Set(normalizeIncludeExts(opts.includeExts));
  const languages: Record<string, number> = {};
  let topLevelFiles: string[] = [];
  try {
    topLevelFiles = await readdir(root);
  } catch {
    topLevelFiles = [];
  }

  const fileContents = new Map<string, string>();
  const tree = await scanDir(root, root, languages, fileContents, include);

  let primaryLanguage: string | undefined;
  let maxCount = 0;
  for (const [lang, count] of Object.entries(languages)) {
    if (count > maxCount) {
      maxCount = count;
      primaryLanguage = lang;
    }
  }

  const filteredBy: Record<FilterId, number> = { test: 0, generated: 0, text: 0, media: 0 };
  for (const f of tree.filteredFiles) filteredBy[f.reason]++;

  return {
    fileCount: tree.fileCount,
    totalLines: tree.totalLines,
    docFileCount: tree.docFileCount,
    languages,
    primaryLanguage,
    fileTree: tree.nodes,
    topLevelFiles,
    allFiles: tree.allFiles,
    fileContents,
    fileCountAll: tree.fileCountAll,
    totalLinesAll: tree.totalLinesAll,
    filteredFiles: tree.filteredFiles,
    allFilteredFiles: tree.allFilteredFiles,
    filteredBy,
  };
}

async function scanDir(
  dir: string,
  root: string,
  languages: Record<string, number>,
  fileContents: Map<string, string>,
  include: Set<string> = new Set(),
): Promise<{
  nodes: FileNode[];
  fileCount: number;
  totalLines: number;
  docFileCount: number;
  allFiles: string[];
  fileCountAll: number;
  totalLinesAll: number;
  filteredFiles: Array<{ path: string; reason: FilterId }>;
  allFilteredFiles: string[];
}> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { nodes: [], fileCount: 0, totalLines: 0, docFileCount: 0, allFiles: [], fileCountAll: 0, totalLinesAll: 0, filteredFiles: [], allFilteredFiles: [] };
  }

  const filtered = entries.filter((n) => !shouldIgnore(n, include));
  if (filtered.length === 0) return { nodes: [], fileCount: 0, totalLines: 0, docFileCount: 0, allFiles: [], fileCountAll: 0, totalLinesAll: 0, filteredFiles: [], allFilteredFiles: [] };

  // 注意：limiter 只包裹叶子内容读取，目录元数据（lstat/readdir）与递归不占槽。
  // 曾经整个条目（含递归）都在槽内，导致在途目录数超过并发数时永久死锁（70+ 子目录必现）。
  const results = await Promise.all(
    filtered.map(async (name) => {
      const fullPath = join(dir, name);
      const rel = relative(root, fullPath);
      if (rel.split('/').length > SCAN.maxDepth) return null;
      if (rel.length > SCAN.maxPathLen) return null;

      let s;
      try {
        s = await lstat(fullPath);
      } catch {
        return null;
      }
      if (s.isSymbolicLink()) return null;

      if (s.isDirectory()) {
        const sub = await scanDir(fullPath, root, languages, fileContents, include);
        return {
          node: { name, path: rel, type: 'directory' as const, children: sub.nodes } as FileNode,
          fileCount: sub.fileCount,
          totalLines: sub.totalLines,
          docFileCount: sub.docFileCount,
          allFiles: sub.allFiles,
          size: 0,
          lineCount: 0,
          fileCountAll: sub.fileCountAll,
          totalLinesAll: sub.totalLinesAll,
          filteredFiles: sub.filteredFiles,
          allFilteredFiles: sub.allFilteredFiles,
        };
      }

      if (s.isFile()) {
        const ext2 = extname(name).toLowerCase();
        const rawFiltered = matchFilter(rel) as FilterId | null;
        const nodeFiltered: FilterId | undefined = rawFiltered && !include.has(ext2) ? rawFiltered : undefined;
        const isExcluded = Boolean(nodeFiltered && (DEFAULT_EXCLUDE as readonly string[]).includes(nodeFiltered));
        const size = s.size;

        // 被排除文件（默认过滤的 test/generated/media）：仍需 fileTree 左树展示与总数拆解，但不计入有效集、不读内容
        // 需先于 IGNORED_EXTS/代码门限判断，否则 png 等资源会被直接丢弃而无法在左树打标
        if (isExcluded) {
          const lineCount = Math.max(1, Math.round(size / 1024));
          return {
            node: { name, path: rel, type: 'file' as const, size, lineCount, filtered: nodeFiltered! } as FileNode,
            fileCount: 0,
            totalLines: 0,
            docFileCount: 0,
            allFiles: [],
            size,
            lineCount,
            fileCountAll: 1,
            totalLinesAll: lineCount,
            filteredFiles: [{ path: rel, reason: nodeFiltered! }],
            allFilteredFiles: [rel],
          };
        }

        if (IGNORED_EXACT.has(name)) return null;
        if (IGNORED_EXTS.has(ext2) && !include.has(ext2)) return null;
        const extra = include.has(ext2);
        // 代码 / 文档 / 用户白名单放行，其余忽略
        if (!isCodeLike(name) && !CODE_EXTENSIONS.has(ext2) && !DOC_EXTENSIONS.has(ext2) && !extra) {
          return null;
        }

        const ext = extname(name).toLowerCase();
        const lang = extToLanguage(ext);
        if (lang) languages[lang] = (languages[lang] ?? 0) + 1;

        let docInc = 0;
        if (DOC_EXTENSIONS.has(ext)) docInc = 1;
        // 内容读取是唯一的重 IO：先按 stat 限流，超限直接估算，绝不把 GB 级文件读进内存
        const lineCount = await limitFs(async () => {
          if (CODE_EXTENSIONS.has(ext) || DOC_EXTENSIONS.has(ext)) {
            if (size > SCAN.largeFileSize) {
              return Math.round(size / SCAN.linesPerByte);
            }
            try {
              const content = await readFile(fullPath, 'utf-8');
              const n = content.split('\n').length;
              if (fileContents.size < SCAN.contentsLimit && size < SCAN.contentsMaxSize && (CODE_EXTENSIONS.has(ext) || ext === '.md')) {
                fileContents.set(rel, content);
              }
              return n;
            } catch {
              return 0; // binary
            }
          }
          if (extra) {
            if (size > SCAN.extraContentMax) {
              return Math.max(1, Math.round(size / 1024));
            }
            try {
              const head = await readHead(fullPath, SCAN.sniffBytes);
              if (head === undefined) return Math.max(1, Math.round(size / 1024));
              if (head.includes('\0')) return Math.max(1, Math.round(size / 1024));
              if (size <= SCAN.sniffBytes) return head.split('\n').length;
              const content = await readFile(fullPath, 'utf-8');
              return content.split('\n').length;
            } catch {
              return Math.max(1, Math.round(size / 1024));
            }
          }
          return 0;
        });

        return {
          node: { name, path: rel, type: 'file' as const, size, lineCount, ...(nodeFiltered ? { filtered: nodeFiltered } : {}) } as FileNode,
          fileCount: 1,
          totalLines: lineCount,
          docFileCount: docInc,
          allFiles: [rel],
          size,
          lineCount,
          fileCountAll: 1,
          totalLinesAll: lineCount,
          filteredFiles: [],
          allFilteredFiles: [],
        };
      }

      return null;
    }),
  );

  const nodes: FileNode[] = [];
  let fileCount = 0;
  let totalLines = 0;
  let docFileCount = 0;
  const allFiles: string[] = [];
  let fileCountAll = 0;
  let totalLinesAll = 0;
  const filteredFiles: Array<{ path: string; reason: FilterId }> = [];
  const allFilteredFiles: string[] = [];

  for (const r of results) {
    if (!r) continue;
    nodes.push(r.node);
    fileCount += r.fileCount;
    totalLines += r.totalLines;
    docFileCount += r.docFileCount;
    allFiles.push(...r.allFiles);
    fileCountAll += r.fileCountAll;
    totalLinesAll += r.totalLinesAll;
    filteredFiles.push(...r.filteredFiles);
    allFilteredFiles.push(...r.allFilteredFiles);
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { nodes, fileCount, totalLines, docFileCount, allFiles, fileCountAll, totalLinesAll, filteredFiles, allFilteredFiles };
}
