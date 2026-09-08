'use client';
import { useMemo } from 'react';
import { squarify } from '@/lib/treemap';
import { extColorOf } from '@/lib/tokens';

// 确定性 24 格装饰数据（不代表真实仓库；扫描仪式纯 CSS，无状态）
// 语义：模拟一次“静态分析扫描”——扫描线自上而下，被扫过的块逐个点亮并标注行数
const DATA = [
  { key: 'a', n: 42 }, { key: 'b', n: 30 }, { key: 'c', n: 26 }, { key: 'd', n: 22 },
  { key: 'e', n: 18 }, { key: 'f', n: 15 }, { key: 'g', n: 13 }, { key: 'h', n: 12 },
  { key: 'i', n: 10 }, { key: 'j', n: 9 }, { key: 'k', n: 8 }, { key: 'l', n: 7 },
  { key: 'm', n: 6 }, { key: 'n', n: 6 }, { key: 'o', n: 5 }, { key: 'p', n: 5 },
  { key: 'q', n: 4 }, { key: 'r', n: 4 }, { key: 's', n: 3 }, { key: 't', n: 3 },
  { key: 'u', n: 2 }, { key: 'v', n: 2 }, { key: 'w', n: 2 }, { key: 'x', n: 1 },
] as const;

const W = 560; const H = 340;
const SWEEP_S = 5; // 一次扫描周期（秒）
const EXT = ['ts', 'tsx', 'js', 'py', 'go', 'md', 'json', 'png'] as const;

export function MicroMap() {
  const rects = useMemo(() => squarify(DATA as unknown as { key: string; n: number }[], 0, 0, W, H), []);
  return (
    <figure style={{ margin: 0, position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.1)' }}>
      {/* 坐标签 */}
      <figcaption className="mono" style={{ position: 'absolute', left: 10, top: 8, zIndex: 3, fontSize: 10, letterSpacing: '.08em', color: 'var(--subtle)' }}>
        FIG.01 — SCAN
      </figcaption>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${W}/${H}` }} className="bp-grid">
        {rects.map((r, i) => {
          const ext = EXT[i % EXT.length]!;
          const c = extColorOf(`x.${ext}`);
          const delay = ((r.y / H) * (SWEEP_S * 0.68)).toFixed(2);
          const big = r.w > 84 && r.h > 54;
          return (
            <div
              key={r.key}
              title={`${r.key} · ${DATA[i]!.n * 12} lines`}
              className="brepo-anim scan-tile"
              style={{
                position: 'absolute',
                left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`,
                width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%`,
                ['--d' as string]: `${delay}s`,
                ['--c' as string]: c,
                animationDuration: `${SWEEP_S}s`,
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 6,
              } as React.CSSProperties}
            >
              {big && (
                <span className="mono" style={{ position: 'absolute', left: 6, top: 4, fontSize: 9, color: 'rgba(237,239,240,.75)' }}>
                  {r.key} · {DATA[i]!.n * 12}
                </span>
              )}
            </div>
          );
        })}
        {/* 扫描线 */}
        <div className="brepo-anim scan-line" style={{ animationDuration: `${SWEEP_S}s` }} />
        {/* 角标 */}
        <span aria-hidden style={{ position: 'absolute', left: 6, top: 6, width: 10, height: 10, borderLeft: '1px solid rgba(255,255,255,.35)', borderTop: '1px solid rgba(255,255,255,.35)' }} />
        <span aria-hidden style={{ position: 'absolute', right: 6, top: 6, width: 10, height: 10, borderRight: '1px solid rgba(255,255,255,.35)', borderTop: '1px solid rgba(255,255,255,.35)' }} />
        <span aria-hidden style={{ position: 'absolute', left: 6, bottom: 26, width: 10, height: 10, borderLeft: '1px solid rgba(255,255,255,.35)', borderBottom: '1px solid rgba(255,255,255,.35)' }} />
        <span aria-hidden style={{ position: 'absolute', right: 6, bottom: 26, width: 10, height: 10, borderRight: '1px solid rgba(255,255,255,.35)', borderBottom: '1px solid rgba(255,255,255,.35)' }} />
      </div>
      {/* 状态行：装饰性 mono 读数 */}
      <div className="mono" style={{ display: 'flex', gap: 12, padding: '7px 10px', borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 10, color: 'var(--subtle)' }}>
        <span>target: preview</span>
        <span>cells: 24</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--success, #30a46c)' }}>● live</span>
      </div>
    </figure>
  );
}
