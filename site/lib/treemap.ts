// 纯函数 squarify — 同源拷贝自 webui/lib/treemap，用于 Hero 装饰（零依赖）
export interface Weighted { key: string; n: number }
export interface Placed { key: string; x: number; y: number; w: number; h: number }

function worst(row: number[], side: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  if (s <= 0 || side <= 0.5) return Infinity;
  const mx = Math.max(...row);
  const mn = Math.min(...row);
  if (mn <= 0) return Infinity;
  return Math.max(((side * side) * mx) / (s * s), (s * s) / ((side * side) * mn));
}
export function squarify(items: Weighted[], x: number, y: number, W: number, H: number): Placed[] {
  const positive = items.filter((v) => v.n > 0);
  if (!positive.length || W <= 1 || H <= 1) return [];
  const total = positive.reduce((a, v) => a + v.n, 0);
  const k = (W * H) / total;
  const vals = positive.map((v) => ({ key: v.key, n: v.n * k }));
  const out: Placed[] = [];
  let row: Weighted[] = [];
  let cx = x, cy = y, rw = W, rh = H;
  const flush = () => {
    const s = row.reduce((a, b) => a + b.n, 0);
    if (s > 0 && rw > 0.5 && rh > 0.5) {
      if (rw >= rh) {
        let ox = cx; const hh = s / rw;
        for (const it of row) { const ww = (it.n / s) * rw; out.push({ key: it.key, x: ox, y: cy, w: ww, h: hh }); ox += ww; }
        cy += hh; rh -= hh;
      } else {
        let oy = cy; const ww = s / rh;
        for (const it of row) { const hh = (it.n / s) * rh; out.push({ key: it.key, x: cx, y: oy, w: ww, h: hh }); oy += hh; }
        cx += ww; rw -= ww;
      }
    }
    row = [];
  };
  for (let idx = 0; idx < vals.length; idx++) {
    const it = vals[idx]!;
    const side = Math.max(rw, rh);
    if (!row.length) { row.push(it); continue; }
    if (vals.length - idx - 1 <= 2) { row.push(it); continue; }
    const cur = row.map((r) => r.n);
    if (worst([...cur, it.n], side) <= worst(cur, side)) row.push(it);
    else { flush(); row.push(it); }
  }
  flush();
  return out.filter((r) => r.w >= 0.5 && r.h >= 0.5);
}
