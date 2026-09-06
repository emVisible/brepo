// Squarified Treemap 纯函数（Bruls · Huizing · van Wijk）
// 固定容器、零滚动：文件再多也只是块变小
// 诚实三原则：
//   1. 面积守恒——可见块 + header + rest 块 ≈ 容器，无真空地带；
//   2. 总数守恒——shown + hidden + rest == totalFiles，一个文件都不丢；
//   3. rest 是尘埃仓——只收画不出来的尘埃（替 DOM 减负），不收大面积。
// 无 DOM、无 Three 依赖，可在 node 下直接验证。

export interface FileItem {
  path: string;
  area: number;
  /** 行数已知；未知行数权重为 1 并以斜纹标出，不参与面积竞争 */
  known: boolean;
}

export type Metric = 'lines' | 'count';

export interface PlacedTile {
  key: string;
  path: string;
  area: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UnitLayout {
  kind: 'group' | 'file' | 'rest';
  /** 组目录相对路径；file 为文件路径；rest 为伪 root（供下钻） */
  key: string;
  label: string;
  lines: number;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 绝对坐标子块；label-only 组 / rest 为空 */
  tiles: PlacedTile[];
  /** 未画出的文件数（左树可达，不丢数） */
  hidden: number;
}

export interface TreemapModel {
  units: UnitLayout[];
  /** 当前层文件总数（含 hidden） */
  totalFiles: number;
  scopedLines: number;
}

/** 伪目录后缀：从不出现在真实路径中 */
export const REST_SUFFIX = '~~rest~~';
export const HEADER_H = 22;
/** 尘埃线：低于此占比才有资格进 rest（高于此但画不下 → hidden） */
export const REST_MAX_SHARE = 0.0015;
/** 总占比低于此的整组并入 rest（只动真正的小目录） */
export const GROUP_MIN_SHARE = 0.004;
/** 画布门限：低于此连像素纹理都成不了 */
export const DRAW_MIN = 2;
/** 长宽比超过此且占比小的细条视为视觉噪音，优先进 rest */
export const SLIVER_AR = 48;
export const SLIVER_MAX_SHARE = 0.01;
/** rest 面积占比上限（可视化不撒谎的红线） */
export const REST_CAP_SHARE = 0.12;
/** rest 布局占位下限（保证可点击，≤1.2% 的面积注水，标准做法） */
export const REST_FLOOR_SHARE = 0.012;

export function parseRoot(root: string | null): { parent: string | null; rest: boolean } {
  if (!root) return { parent: null, rest: false };
  const i = root.indexOf(REST_SUFFIX);
  if (i >= 0) return { parent: root.slice(0, i) || null, rest: true };
  return { parent: root, rest: false };
}

export function restRoot(parent: string | null): string {
  return `${parent ?? ''}${REST_SUFFIX}`;
}

function under(path: string, dir: string | null): boolean {
  if (dir == null || dir === '') return true;
  return path === dir || path.startsWith(dir + '/');
}

/** 在 dir 下一层的分组键；dir 下直属文件返回 null（散块） */
function childKey(path: string, dir: string | null): string | null {
  const rel = dir == null || dir === '' ? path : path.slice(dir.length + 1);
  const i = rel.indexOf('/');
  if (i < 0) return null;
  return dir == null || dir === '' ? rel.slice(0, i) : `${dir}/${rel.slice(0, i)}`;
}

function worst(row: number[], side: number): number {
  // Bruls et al.：max( w²·max/s², s²/(w²·min) )，w 为剩余区最短边
  const s = row.reduce((a, b) => a + b, 0);
  if (s <= 0 || side <= 0.5) return Infinity;
  const mx = Math.max(...row);
  const mn = Math.min(...row);
  if (mn <= 0) return Infinity;
  return Math.max(((side * side) * mx) / (s * s), (s * s) / ((side * side) * mn));
}

export interface Weighted {
  key: string;
  n: number;
}

export interface Placed {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function squarify(items: Weighted[], x: number, y: number, W: number, H: number): Placed[] {
  const positive = items.filter((v) => v.n > 0);
  if (!positive.length || W <= 1 || H <= 1) return [];
  // 归一化到容器面积：面积守恒的前提
  const total = positive.reduce((a, v) => a + v.n, 0);
  const k = (W * H) / total;
  const vals = positive.map((v) => ({ key: v.key, n: v.n * k }));
  const out: Placed[] = [];
  let row: Weighted[] = [];
  let cx = x;
  let cy = y;
  let rw = W;
  let rh = H;
  const flush = () => {
    const s = row.reduce((a, b) => a + b.n, 0);
    if (s > 0 && rw > 0.5 && rh > 0.5) {
      if (rw >= rh) {
        let ox = cx;
        const hh = s / rw;
        for (const it of row) {
          const ww = (it.n / s) * rw;
          out.push({ key: it.key, x: ox, y: cy, w: ww, h: hh });
          ox += ww;
        }
        cy += hh;
        rh -= hh;
      } else {
        let oy = cy;
        const ww = s / rh;
        for (const it of row) {
          const hh = (it.n / s) * rh;
          out.push({ key: it.key, x: cx, y: oy, w: ww, h: hh });
          oy += hh;
        }
        cx += ww;
        rw -= ww;
      }
    }
    row = [];
  };
  for (let idx = 0; idx < vals.length; idx++) {
    const it = vals[idx]!;
    // w 取行铺展方向的边（最长边）：此时 worst() == 该行真实最大长宽比的估计；
    // 取最短边会系统性低估，导致行过早 flush、全变细条（已实锤）。
    const side = Math.max(rw, rh);
    if (!row.length) {
      row.push(it);
      continue;
    }
    // 尾行保护：只剩 ≤2 个时强制并入当前行，避免 1~2 个孤儿铺满整宽成细条
    if (vals.length - idx - 1 <= 2) {
      row.push(it);
      continue;
    }
    const cur = row.map((r) => r.n);
    if (worst([...cur, it.n], side) <= worst(cur, side)) row.push(it);
    else {
      flush();
      row.push(it);
    }
  }
  flush();
  return out.filter((r) => r.w >= 0.5 && r.h >= 0.5);
}

interface DraftUnit {
  kind: 'group' | 'file';
  key: string;
  label: string;
  files: FileItem[];
  /** 标签用行数（展示） */
  lines: number;
  /** 布局用权重（度量相关） */
  wt: number;
}

/** 分区：只分组，不合并（合并在布局函数中统一封顶，避免 rest 失控） */
function partition(scoped: FileItem[], parent: string | null, wt: (f: FileItem) => number): { groups: DraftUnit[]; loose: DraftUnit[] } {
  const byDir = new Map<string, FileItem[]>();
  const loose: DraftUnit[] = [];
  for (const f of scoped) {
    const g = childKey(f.path, parent);
    if (g == null) loose.push({ kind: 'file', key: f.path, label: f.path.split('/').pop() ?? f.path, files: [f], lines: f.area, wt: wt(f) });
    else {
      const arr = byDir.get(g) ?? [];
      arr.push(f);
      byDir.set(g, arr);
    }
  }
  const groups: DraftUnit[] = [...byDir.entries()].map(([key, files]) => ({
    kind: 'group' as const,
    key,
    label: key.split('/').pop() ?? key,
    files,
    lines: files.reduce((a, f) => a + f.area, 0),
    wt: files.reduce((a, f) => a + wt(f), 0),
  }));
  return { groups, loose };
}

function isDust(w: number, h: number): boolean {
  return w < DRAW_MIN || h < DRAW_MIN;
}

function isSliver(w: number, h: number): boolean {
  const m = Math.max(w, h);
  const n = Math.min(w, h);
  return n > 0 && m / n > SLIVER_AR;
}

export function layoutTreemap(all: FileItem[], root: string | null, W: number, H: number, metric: Metric = 'lines'): TreemapModel {
  const empty: TreemapModel = { units: [], totalFiles: 0, scopedLines: 0 };
  if (W <= 1 || H <= 1) return empty;
  const { parent, rest } = parseRoot(root);
  const scoped = all.filter((f) => under(f.path, parent));
  if (!scoped.length) return empty;
  const scopedLines = scoped.reduce((a, f) => a + f.area, 0);
  // 布局权重：count 模式等权平铺；shares 一律按权重算
  const wt = (f: FileItem) => (metric === 'count' ? 1 : f.area);
  const scopedWeight = scoped.reduce((a, f) => a + wt(f), 0);
  const shareOf = (w: number) => (scopedWeight > 0 ? w / scopedWeight : 0);
  // count 模式无 rest（均权下尘埃即 hidden，左树可达；避免封顶被均值击穿）
  const allowRest = metric === 'lines';

  // rest 伪视图：小文件平铺，无次级 rest（有界）；尘埃计 hidden
  if (rest) {
    const rects = squarify(
      scoped.map((f) => ({ key: f.path, n: wt(f) })),
      0,
      0,
      W,
      H,
    );
    const byKey = new Map(scoped.map((f) => [f.path, f]));
    const seen = new Set<string>();
    const tiles: PlacedTile[] = [];
    let hidden = 0;
    for (const r of rects) {
      const f = byKey.get(r.key)!;
      seen.add(r.key);
      if (isDust(r.w, r.h)) {
        hidden++;
        continue;
      }
      tiles.push({ path: f.path, area: f.area, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key });
    }
    for (const f of scoped) if (!seen.has(f.path)) hidden++;
    return {
      units: [{ kind: 'group', key: root!, label: '其余小文件', lines: scopedLines, count: scoped.length, x: 0, y: 0, w: W, h: H, tiles, hidden }],
      totalFiles: scoped.length,
      scopedLines,
    };
  }

  // —— 第一遍：全量布局，挑出尘埃（一切进 rest 的动作都过封顶） ——
  const p1 = partition(scoped, parent, wt);
  const restFiles: FileItem[] = [];
  let restWeight = 0;
  const tryRest = (f: FileItem): boolean => {
    if (!allowRest) return false;
    if (shareOf(wt(f)) >= REST_MAX_SHARE) return false;
    if (shareOf(restWeight + wt(f)) > REST_CAP_SHARE) return false;
    restFiles.push(f);
    restWeight += wt(f);
    return true;
  };
  // 小整组并入 rest（升序吃，吃到封顶为止；剩下的保留为组；count 模式不合并）
  const p1units: DraftUnit[] = [...p1.loose];
  for (const g of [...p1.groups].sort((a, b) => a.wt - b.wt)) {
    if (allowRest && p1.groups.length > 1 && shareOf(g.wt) < GROUP_MIN_SHARE && shareOf(restWeight + g.wt) <= REST_CAP_SHARE) {
      restFiles.push(...g.files);
      restWeight += g.wt;
    } else p1units.push(g);
  }
  if (!p1units.length) {
    // 全是小目录：不聚合（避免空视图），逐组画 label 芯片
    p1units.push(...p1.groups);
    restFiles.length = 0;
    restWeight = 0;
  }

  const unitRects = new Map(
    squarify(
      p1units.map((u) => ({ key: u.key, n: u.wt })),
      0,
      0,
      W,
      H,
    ).map((r) => [r.key, r]),
  );
  // 组内孩子矩形（第一遍只为分类，不输出）
  const kidRects = new Map<string, Placed[]>();
  for (const u of p1units) {
    if (u.kind !== 'group') continue;
    const r = unitRects.get(u.key);
    if (!r || r.h < HEADER_H + 26 || r.w < 64) continue;
    kidRects.set(
      u.key,
      squarify(
        [...u.files].sort((a, b) => wt(b) - wt(a)).map((f) => ({ key: f.path, n: wt(f) })),
        r.x,
        r.y + HEADER_H,
        r.w,
        r.h - HEADER_H,
      ),
    );
  }
  const restKeys = new Set(restFiles.map((f) => f.path));
  const sliverRest = (f: FileItem): void => {
    if (!allowRest) return;
    if (shareOf(wt(f)) < SLIVER_MAX_SHARE && shareOf(restWeight + wt(f)) <= REST_CAP_SHARE) {
      restFiles.push(f);
      restWeight += wt(f);
    }
  };
  for (const u of p1units) {
    if (u.kind === 'file') {
      const r = unitRects.get(u.key);
      const f = u.files[0]!;
      if (!r || isDust(r.w, r.h)) {
        tryRest(f); // 进不去就留待第二遍画纹理
      } else if (isSliver(r.w, r.h)) {
        sliverRest(f);
      }
      continue;
    }
    for (const kr of kidRects.get(u.key) ?? []) {
      const f = u.files.find((x) => x.path === kr.key)!;
      if (isDust(kr.w, kr.h)) {
        tryRest(f); // 进不去就留待第二遍画纹理
      } else if (isSliver(kr.w, kr.h)) {
        sliverRest(f);
      }
    }
    // 亚像素丢失的孩子：dust 待遇（进不去就留待第二遍画纹理）
    const seen = new Set((kidRects.get(u.key) ?? []).map((r) => r.key));
    for (const f of u.files) {
      if (!seen.has(f.path) && !restKeys.has(f.path)) tryRest(f);
    }
  }

  // —— 第二遍：rest 作为正式布局单元进场（面积注水保可点） ——
  const inRest = new Set(restFiles.map((f) => f.path));
  const remaining = scoped.filter((f) => !inRest.has(f.path));
  const p2 = partition(remaining, parent, wt);
  interface FinalUnit extends DraftUnit {
    isRest?: boolean;
  }
  const finalUnits: FinalUnit[] = [...p2.groups, ...p2.loose];
  if (restFiles.length) {
    finalUnits.push({
      kind: 'group',
      key: restRoot(parent),
      label: `+${restFiles.length}`,
      files: [],
      lines: restFiles.reduce((a, f) => a + f.area, 0),
      wt: Math.max(restWeight, scopedWeight * REST_FLOOR_SHARE),
      isRest: true,
    });
  }
  finalUnits.sort((a, b) => b.wt - a.wt);
  const rects2 = new Map(
    squarify(
      finalUnits.map((u) => ({ key: u.key, n: u.wt })),
      0,
      0,
      W,
      H,
    ).map((r) => [r.key, r]),
  );

  const out: UnitLayout[] = [];
  for (const u of finalUnits) {
    const r = rects2.get(u.key);
    if (!r) continue;
    if (u.isRest) {
      out.push({ kind: 'rest', key: u.key, label: u.label, lines: restFiles.reduce((a, f) => a + f.area, 0), count: restFiles.length, x: r.x, y: r.y, w: r.w, h: r.h, tiles: [], hidden: 0 });
      continue;
    }
    if (u.kind === 'file') {
      const f = u.files[0]!;
      if (isDust(r.w, r.h)) {
        out.push({ kind: 'file', label: u.label, lines: u.lines, count: 1, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key, tiles: [], hidden: 1 });
        continue;
      }
      out.push({ kind: 'file', label: u.label, lines: u.lines, count: 1, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key, tiles: [{ path: f.path, area: f.area, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key }], hidden: 0 });
      continue;
    }
    if (r.h < HEADER_H + 26 || r.w < 64) {
      out.push({ kind: 'group', label: u.label, lines: u.lines, count: u.files.length, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key, tiles: [], hidden: u.files.length });
      continue;
    }
    const kids = [...u.files].sort((a, b) => wt(b) - wt(a));
    const krs = squarify(
      kids.map((f) => ({ key: f.path, n: wt(f) })),
      r.x,
      r.y + HEADER_H,
      r.w,
      r.h - HEADER_H,
    );
    const kidByKey = new Map(kids.map((f) => [f.path, f]));
    const tiles: PlacedTile[] = [];
    let hidden = 0;
    const seen2 = new Set<string>();
    for (const kr of krs) {
      const f = kidByKey.get(kr.key)!;
      seen2.add(kr.key);
      if (isDust(kr.w, kr.h)) {
        hidden++;
        continue; // 第二遍残余尘埃：如实计数（面积可忽略，左树可达）
      }
      tiles.push({ path: f.path, area: f.area, x: kr.x, y: kr.y, w: kr.w, h: kr.h, key: kr.key });
    }
    for (const f of kids) if (!seen2.has(f.path)) hidden++;
    out.push({ kind: 'group', label: u.label, lines: u.lines, count: u.files.length, x: r.x, y: r.y, w: r.w, h: r.h, key: r.key, tiles, hidden });
  }

  return { units: out, totalFiles: scoped.length, scopedLines };
}
