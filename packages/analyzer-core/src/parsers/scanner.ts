import { readdir, lstat, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { SCAN } from '../constants.js';

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
  fileCount: number;
  totalLines: number;
  docFileCount: number;
  languages: Record<string, number>;
  primaryLanguage?: string;
  fileTree: FileNode[];
  topLevelFiles: string[];
  allFiles: string[];
  fileContents: Map<string, string>;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lineCount?: number;
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

function shouldIgnore(name: string, include?: Set<string>): boolean {
  if (IGNORED_DIRS.has(name)) return true;
  if (IGNORED_FILES.has(name)) return true;
  if (IGNORED_EXACT.has(name)) return true;
  const ext = extname(name).toLowerCase();
  if (IGNORED_EXTS.has(ext) && !include?.has(ext)) return true;
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
  };
}

async function scanDir(
  dir: string,
  root: string,
  languages: Record<string, number>,
  fileContents: Map<string, string>,
  include: Set<string> = new Set(),
): Promise<{ nodes: FileNode[]; fileCount: number; totalLines: number; docFileCount: number; allFiles: string[] }> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { nodes: [], fileCount: 0, totalLines: 0, docFileCount: 0, allFiles: [] };
  }

  const filtered = entries.filter((n) => !shouldIgnore(n, include));
  if (filtered.length === 0) return { nodes: [], fileCount: 0, totalLines: 0, docFileCount: 0, allFiles: [] };

  const results = await Promise.all(
    filtered.map((name) =>
      limitFs(async () => {
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
          };
        }

        if (s.isFile()) {
          if (IGNORED_EXACT.has(name)) return null;
          const ext2 = extname(name).toLowerCase();
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

          let lineCount = 0;
          const size = s.size;
          if (CODE_EXTENSIONS.has(ext) || DOC_EXTENSIONS.has(ext)) {
            if (s.size > SCAN.largeFileSize) {
              lineCount = Math.round(s.size / SCAN.linesPerByte);
            } else {
              try {
                const content = await readFile(fullPath, 'utf-8');
                lineCount = content.split('\n').length;
                if (fileContents.size < SCAN.contentsLimit && s.size < SCAN.contentsMaxSize && (CODE_EXTENSIONS.has(ext) || ext === '.md')) {
                  fileContents.set(rel, content);
                }
              } catch {
                // binary
              }
            }
          } else if (extra) {
            // 白名单非常规文件：文本按行计，二进制按 KB 折算并标注（不进 fileContents，不污染依赖分析）
            try {
              const content = await readFile(fullPath, 'utf-8');
              lineCount = content.includes('\0') ? Math.max(1, Math.round(s.size / 1024)) : content.split('\n').length;
            } catch {
              lineCount = Math.max(1, Math.round(s.size / 1024));
            }
          }

          return {
            node: { name, path: rel, type: 'file' as const, size, lineCount } as FileNode,
            fileCount: 1,
            totalLines: lineCount,
            docFileCount: docInc,
            allFiles: [rel],
            size,
            lineCount,
          };
        }

        return null;
      }),
    ),
  );

  const nodes: FileNode[] = [];
  let fileCount = 0;
  let totalLines = 0;
  let docFileCount = 0;
  const allFiles: string[] = [];

  for (const r of results) {
    if (!r) continue;
    nodes.push(r.node);
    fileCount += r.fileCount;
    totalLines += r.totalLines;
    docFileCount += r.docFileCount;
    allFiles.push(...r.allFiles);
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { nodes, fileCount, totalLines, docFileCount, allFiles };
}
