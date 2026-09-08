// 语义簇：岛屿不再是纯 topDir 罗列，而是按可解释维度聚类
// 输入为有效文件（已排除 filtered），输出簇 -> 岛屿 -> 文件
import type { FileItem } from './treemap';

export type Island = { key: string; label: string; files: FileItem[]; lines: number; count: number };
export type Cluster = { key: string; label: string; islands: Island[] };

function extOf(path: string): string {
  const i = path.lastIndexOf('.');
  return i < 0 ? '' : path.slice(i + 1).toLowerCase();
}
const FE_EXTS = new Set(['ts','tsx','js','jsx','mjs','cjs','vue','svelte','astro']);
const BE_EXTS = new Set(['py','go','rs','java','rb','php','swift','kt']);
const DOC_EXTS = new Set(['md','mdx','rst','txt','adoc']);

function kindOf(path: string, entrySet: Set<string>, hotSet: Set<string>): string {
  if (entrySet.has(path)) return 'entry';
  if (hotSet.has(path)) return 'hot';
  const e = extOf(path);
  if (DOC_EXTS.has(e)) return 'doc';
  if (FE_EXTS.has(e)) return 'fe';
  if (BE_EXTS.has(e)) return 'be';
  return 'other';
}

export function buildSemanticClusters(
  files: FileItem[],
  opts: { parent: string | null; entryFiles: string[]; hotFiles: string[] }
): Cluster[] {
  const entrySet = new Set(opts.entryFiles ?? []);
  const hotSet = new Set(opts.hotFiles ?? []);
  const parent = opts.parent;

  // 先按目录聚岛，再按岛内主导语义定簇，避免同一目录拆到多簇导致 key 重复
  const byDir = new Map<string, FileItem[]>();
  for (const f of files) {
    if (parent && !(f.path === parent || f.path.startsWith(parent + '/'))) continue;
    let dirKey: string;
    if (!parent) {
      const seg = f.path.split('/')[0] ?? '.';
      dirKey = f.path.includes('/') ? seg : '.';
    } else {
      const rel = f.path.slice(parent.length + 1);
      const seg = rel.split('/')[0] ?? rel;
      dirKey = rel.includes('/') ? `${parent}/${seg}` : parent;
      if (!f.path.includes('/') || rel === f.path) dirKey = parent;
    }
    const a = byDir.get(dirKey) ?? [];
    a.push(f);
    byDir.set(dirKey, a);
  }

  const labelMap: Record<string, string> = {
    entry: '入口',
    hot: '热点',
    fe: '前端逻辑',
    be: '后端/脚本',
    doc: '文档',
    other: '其他',
  };
  const order = ['entry','hot','fe','be','doc','other'];
  const priority = new Map(order.map((k, i) => [k, i] as const));

  const buckets = new Map<string, Island[]>();
  for (const [dirKey, dirFiles] of byDir) {
    dirFiles.sort((a,b)=>b.area-a.area);
    const lines = dirFiles.reduce((a,b)=>a+b.area,0);
    // 统计岛内各文件 kind，主导 kind 决定簇
    const counts = new Map<string, number>();
    for (const f of dirFiles) {
      const k = kindOf(f.path, entrySet, hotSet);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    let best: string = 'other';
    let bestScore = -1;
    for (const [k, c] of counts) {
      const pri = priority.get(k) ?? 99;
      const score = c * 100 - pri; // 数量优先，优先级次之
      if (score > bestScore) { bestScore = score; best = k; }
    }
    const island: Island = { key: dirKey, label: dirKey.split('/').pop() ?? dirKey, files: dirFiles, lines, count: dirFiles.length };
    const arr = buckets.get(best) ?? [];
    arr.push(island);
    buckets.set(best, arr);
  }

  const clusters: Cluster[] = [];
  for (const k of order) {
    const islands = buckets.get(k);
    if (!islands || !islands.length) continue;
    islands.sort((a,b)=>b.lines - a.lines);
    clusters.push({ key: k, label: labelMap[k] ?? k, islands });
  }
  return clusters;
}
