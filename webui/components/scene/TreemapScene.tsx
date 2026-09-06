'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult } from '@briefrepo/types';
import { layoutTreemap, parseRoot, type FileItem } from '@/lib/treemap';
import { extColorOf } from '@/styles/tokens';
import { useWebStore } from '@/lib/store';

interface Props {
  data: AnalysisResult;
  selected: string | null;
  onSelect: (p: string | null) => void;
  onHover?: (p: string | null) => void;
  /** 目录过滤：null = 全部；`~~rest~~` 后缀 = 其余伪目录 */
  root?: string | null;
  onDrillRoot?: (r: string | null) => void;
}

// 磁盘清理式 treemap：squarify 固定容器、零滚动；区=子目录；下钻倾斜 + 选中浮起（三渲二）
export function TreemapScene({ data, selected, onSelect, onHover, root, onDrillRoot }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const metric = useWebStore((s) => s.metric);
  const setMetric = useWebStore((s) => s.setMetric);
  const [size, setSize] = useState({ w: 0, h: 0, ow: 0, oh: 0 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const [tilt, setTilt] = useState(false);
  const firstRoot = useRef(true);

  useEffect(() => {
    const outer = outerRef.current;
    const el = areaRef.current;
    if (!outer || !el) return;
    const measure = () => {
      const o = outer.getBoundingClientRect();
      // content-box 实测（无 padding）：布局坐标与绘制坐标严格一致，杜绝右/下裁剪
      setSize({ w: el.clientWidth, h: el.clientHeight, ow: Math.floor(o.width), oh: Math.floor(o.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 下钻/切换度量瞬间：倾斜归位 320ms
  useEffect(() => {
    if (firstRoot.current) {
      firstRoot.current = false;
      return;
    }
    setTilt(true);
    const t = setTimeout(() => setTilt(false), 340);
    return () => clearTimeout(t);
  }, [root, metric]);

  const files = useMemo<FileItem[]>(() => {
    const tree = data.context.fileTree || [];
    const out: FileItem[] = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        if (n.type === 'file') {
          const lc = (n as { lineCount?: number }).lineCount;
          out.push({ path: n.path, area: Math.max(1, lc ?? 1), known: lc != null });
        }
        if (n.children) walk(n.children as unknown as typeof tree);
      }
    };
    walk(tree);
    return out;
  }, [data]);

  const knownMap = useMemo(() => new Map(files.map((f) => [f.path, f.known])), [files]);
  const hot = useMemo(() => new Set((data.level1.hotspots ?? []).map((h) => h.path)), [data]);
  const model = useMemo(
    () => (size.w > 10 && size.h > 10 ? layoutTreemap(files, root ?? null, size.w, size.h, metric) : null),
    [files, root, size, metric],
  );

  const { parent, rest } = parseRoot(root ?? null);
  const crumbs = useMemo(() => (parent ? parent.split('/') : []), [parent]);
  const hiddenTotal = useMemo(() => model?.units.reduce((a, u) => a + u.hidden, 0) ?? 0, [model]);
  const restUnit = model?.units.find((u) => u.kind === 'rest');
  const scopedKnown = useMemo(() => files.filter((f) => (parent ? f.path === parent || f.path.startsWith(parent + '/') : true) && f.known).map((f) => f.area), [files, parent]);
  const scaleNote = useMemo(() => {
    if (!scopedKnown.length || metric !== 'lines') return null;
    return `${Math.min(...scopedKnown).toLocaleString()}–${Math.max(...scopedKnown).toLocaleString()} 行`;
  }, [scopedKnown, metric]);

  // 图例：当前层出现的扩展名 + 计数
  const legendExts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of files) {
      if (parent && !(f.path === parent || f.path.startsWith(parent + '/'))) continue;
      const i = f.path.lastIndexOf('.');
      const e = i < 0 ? '·' : f.path.slice(i + 1).toLowerCase();
      m.set(e, (m.get(e) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [files, parent]);

  // lens 数据：全路径 / 行数·未知 / 占目录% / 占全仓% / 本层排名 / 热点
  const lens = useMemo(() => {
    if (!hoverKey || !model) return null;
    for (const u of model.units) {
      const t: { key: string; path: string; area: number } | undefined =
        u.kind === 'file' ? u.tiles[0] : u.tiles.find((x) => x.key === hoverKey);
      if (t && t.key === hoverKey) {
        const groupLines = u.kind === 'group' && !u.key.includes('~~rest~~') ? u.lines : model.scopedLines;
        const rank = [...model.units.flatMap((x) => x.tiles)].sort((a, b) => b.area - a.area).findIndex((x) => x.key === hoverKey) + 1;
        return {
          path: t.path, area: t.area, known: knownMap.get(t.path) ?? true,
          dirPct: groupLines > 0 ? (t.area / groupLines) * 100 : 0,
          repoPct: data.level0.totalLines > 0 ? (t.area / data.level0.totalLines) * 100 : 0,
          rank, hot: hot.has(t.path), ext: extColorOf(t.path),
        };
      }
    }
    return null;
  }, [hoverKey, model, data, hot, knownMap]);

  const hoverTile = (key: string | null, path?: string | null) => {
    setHoverKey(key);
    onHover?.(path ?? null);
  };

  const tileBg = (path: string, isSel: boolean, known: boolean): string => {
    if (isSel) return 'var(--primary)';
    if (!known) return 'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 6px), rgba(255,255,255,.03)';
    const c = extColorOf(path);
    // cushion 高光 + 类型底色：2D 本体，触感深度
    return `linear-gradient(135deg, rgba(255,255,255,.10), transparent 45%), color-mix(in srgb, ${c} 17%, transparent)`;
  };

  const tileStyle = (isSel: boolean, isHot: boolean, isHov: boolean, w: number, h: number): React.CSSProperties => ({
    position: 'absolute',
    border: isSel ? '1px solid var(--primary)' : w < 30 || h < 26 ? '0' : '1px solid rgba(255,255,255,.08)',
    boxShadow: isHot && !isSel ? 'inset 2px 0 0 #E8B04B' : undefined,
    borderRadius: w < 30 || h < 26 ? 2 : 7,
    padding: w < 30 || h < 26 ? 0 : '5px 7px',
    textAlign: 'left',
    cursor: 'pointer',
    color: isSel ? '#fff' : 'var(--muted)',
    overflow: 'hidden',
    transform: isSel ? 'translateZ(8px)' : isHov ? 'translateY(-1px)' : undefined,
    filter: isHov && !isSel ? 'brightness(1.5)' : undefined,
    transition: 'transform .15s ease-out, filter .15s ease-out',
  });

  const lensX = Math.min(mouse.x + 16, Math.max(8, size.ow - 300));
  const lensY = Math.min(mouse.y + 16, Math.max(8, size.oh - 150));

  return (
    <div
      ref={outerRef}
      onMouseMove={(e) => {
        const r = outerRef.current?.getBoundingClientRect();
        if (r) setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'transparent', perspective: '1200px', display: 'flex', flexDirection: 'column', padding: '104px 16px 56px' }}
    >
      {/* 面包屑 + 度量切换 + 图例 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
          textShadow: '0 1px 12px rgba(0,0,0,.9)', zIndex: 2, height: 26,
        }}
      >
        <button onClick={() => onDrillRoot?.(null)} style={{ background: 'transparent', border: 0, color: parent ? 'var(--muted)' : 'var(--text)', fontWeight: parent ? 400 : 700, fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          全部
        </button>
        {crumbs.map((cseg, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--subtle)' }}>/</span>
            <span style={{ color: i === crumbs.length - 1 && !rest ? 'var(--text)' : 'var(--muted)', fontWeight: i === crumbs.length - 1 && !rest ? 700 : 400 }}>{cseg}</span>
          </span>
        ))}
        {rest && <span style={{ color: 'var(--text)', fontWeight: 700 }}>/ 其余小文件</span>}
        <span style={{ color: 'var(--subtle)' }}>
          · {model ? `${model.totalFiles} 文件` : ''}{scaleNote ? ` · 本层 ${scaleNote}` : ''}{hiddenTotal > 0 ? ` · ${hiddenTotal} 过小` : ''}
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setMetric(metric === 'lines' ? 'count' : 'lines')}
          title="切换面积度量"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9999, color: 'var(--text)', fontSize: 10, cursor: 'pointer', padding: '2px 9px', fontFamily: 'inherit' }}
        >
          {metric === 'lines' ? '按行数' : '按文件数'}
        </button>
        <button
          onClick={() => setShowLegend((v) => !v)}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9999, color: showLegend ? 'var(--text)' : 'var(--muted)', fontSize: 10, cursor: 'pointer', padding: '2px 9px', fontFamily: 'inherit' }}
        >
          图例
        </button>
      </div>

      {/* 图例浮层 */}
      {showLegend && (
        <div style={{ position: 'absolute', top: 140, right: 16, zIndex: 5, background: 'rgba(10,10,11,.88)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {legendExts.map(([e, n]) => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', color: 'var(--muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: extColorOf(`x.${e}`) }} />
              <span style={{ color: 'var(--text)' }}>.{e}</span>
              <span style={{ marginLeft: 'auto', paddingLeft: 12 }}>{n}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', color: 'var(--muted)', borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#E8B04B' }} />
            <span>热点</span>
          </div>
        </div>
      )}

      {/* 布局区（实测 content-box） */}
      <div ref={areaRef} style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 6 }}>
        <div
          style={{
            position: 'relative', width: '100%', height: '100%',
            transform: tilt ? 'rotateX(5deg) scale(.985)' : 'none',
            transition: 'transform .32s ease-out',
            transformStyle: 'preserve-3d',
          }}
        >
          {model?.units.map((u) => {
            if (u.kind === 'rest') return null; // 就地块见下
            if (u.kind === 'file') {
              const t = u.tiles[0];
              if (!t) return null;
              const isSel = selected === t.path;
              const isHov = hoverKey === t.key;
              const known = knownMap.get(t.path) ?? true;
              return (
                <button
                  key={u.key}
                  title={`${t.path} · ${known ? `${t.area} 行` : '行数未知'}`}
                  onClick={() => onSelect(isSel ? null : t.path)}
                  onMouseEnter={() => hoverTile(t.key, t.path)}
                  onMouseLeave={() => hoverTile(null)}
                  style={{ ...tileStyle(isSel, hot.has(t.path), isHov, t.w, t.h), background: tileBg(t.path, isSel, known), left: t.x, top: t.y, width: t.w, height: t.h }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: isSel ? '#fff' : 'var(--text)', opacity: isSel ? 1 : 0.92 }}>{u.label}</div>
                  {t.h >= 38 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isSel ? 'rgba(255,255,255,.85)' : 'var(--subtle)', marginTop: 1 }}>{known ? `${t.area.toLocaleString()} 行` : '未知'}</div>}
                </button>
              );
            }
            const labelOnly = u.tiles.length === 0;
            return (
              <div key={u.key} style={{ position: 'absolute', left: u.x, top: u.y, width: u.w, height: u.h }}>
                {!labelOnly && (
                  <button
                    onClick={() => onDrillRoot?.(u.key)}
                    title={`进入 ${u.key}`}
                    style={{
                      position: 'absolute', left: 0, top: 0, width: u.w, height: 22,
                      display: 'flex', alignItems: 'baseline', gap: 6,
                      background: 'transparent', border: 0, cursor: 'pointer', padding: '2px 2px 0', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', opacity: 0.9, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--subtle)', flexShrink: 0 }}>
                      {metric === 'lines' ? `${u.lines.toLocaleString()}行 · ` : ''}{u.count}
                    </span>
                  </button>
                )}
                {labelOnly && (
                  <button
                    onClick={() => onDrillRoot?.(u.key)}
                    title={`进入 ${u.key}（${u.count} 文件）`}
                    style={{
                      position: 'absolute', inset: 0, background: 'rgba(110,86,207,.07)',
                      border: '1px solid rgba(255,255,255,.08)', borderRadius: 7, cursor: 'pointer',
                      color: 'var(--muted)', fontSize: 11, fontWeight: 600, overflow: 'hidden', padding: 4,
                    }}
                  >
                    {u.label} · {u.count}
                  </button>
                )}
                {u.tiles.map((t) => {
                  const isSel = selected === t.path;
                  const isHov = hoverKey === t.key;
                  const known = knownMap.get(t.path) ?? true;
                  return (
                    <button
                      key={t.key}
                      title={`${t.path} · ${known ? `${t.area} 行` : '行数未知'}`}
                      onClick={() => onSelect(isSel ? null : t.path)}
                      onMouseEnter={() => hoverTile(t.key, t.path)}
                      onMouseLeave={() => hoverTile(null)}
                      style={{ ...tileStyle(isSel, hot.has(t.path), isHov, t.w, t.h), background: tileBg(t.path, isSel, known), left: t.x - u.x, top: t.y - u.y, width: t.w, height: t.h }}
                    >
                      {t.h >= 20 && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: isSel ? '#fff' : 'var(--text)', opacity: isSel ? 1 : 0.92 }}>
                          {(t.path.split('/').pop() || t.path) as string}
                        </div>
                      )}
                      {t.h >= 38 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isSel ? 'rgba(255,255,255,.85)' : 'var(--subtle)', marginTop: 1 }}>{known ? `${t.area.toLocaleString()} 行` : '未知'}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* rest 就地块：虚线琥珀边，面积即其行数占比 */}
          {restUnit && restUnit.w > 10 && restUnit.h > 10 && (
            <button
              onClick={() => onDrillRoot?.(restUnit.key)}
              title={`${restUnit.count} 个小文件 · ${restUnit.lines.toLocaleString()} 行`}
              style={{
                position: 'absolute', left: restUnit.x, top: restUnit.y, width: restUnit.w, height: restUnit.h,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                color: 'var(--text)', background: 'rgba(232,176,75,.07)',
                border: '1px dashed rgba(232,176,75,.5)', borderRadius: 7,
                padding: 4, cursor: 'pointer', overflow: 'hidden',
              }}
            >
              +{restUnit.count}
              {restUnit.h >= 38 && <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>{metric === 'lines' ? `${restUnit.lines.toLocaleString()} 行` : '小文件集合'}</div>}
            </button>
          )}
        </div>
      </div>

      {/* hover lens：全路径 / 行数 / 占目录% / 占全仓% / 排名 / 热点 */}
      {lens && (
        <div
          style={{
            position: 'absolute', left: lensX, top: lensY, zIndex: 6, pointerEvents: 'none',
            background: 'rgba(10,10,11,.92)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10,
            padding: '8px 10px', maxWidth: 300, fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text)', overflow: 'hidden' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: lens.ext, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lens.path.split('/').pop()}</span>
            {lens.hot && <span style={{ color: '#E8B04B', flexShrink: 0 }}>●热点</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lens.path}</div>
          <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 4 }}>
            {lens.known ? `${lens.area.toLocaleString()} 行` : '行数未知'}
            <span style={{ color: 'var(--muted)' }}> · 占目录 {lens.dirPct.toFixed(1)}% · 占全仓 {lens.repoPct.toFixed(2)}% · #{lens.rank}</span>
          </div>
          <button
            onClick={() => {
              onSelect?.(lens.path);
              useWebStore.getState().setView('city');
            }}
            style={{
              pointerEvents: 'auto', marginTop: 6, background: 'transparent', border: 0, cursor: 'pointer',
              color: 'var(--primary)', fontSize: 11, fontWeight: 700, padding: 0, fontFamily: 'inherit',
            }}
          >
            在 3D 中查看 →
          </button>
        </div>
      )}
    </div>
  );
}
