'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult } from '@briefrepo/types';
import { DEFAULT_EXCLUDE } from '@briefrepo/types';
import { layoutTreemap, parseRoot, type FileItem } from '@/lib/treemap';
import { buildSemanticClusters } from '@/lib/islands';
import { extColorOf } from '@/styles/tokens';
import { useWebStore } from '@/lib/store';

interface Props {
  data: AnalysisResult;
  selected: string | null;
  onSelect: (p: string | null) => void;
  onHover?: (p: string | null) => void;
  root?: string | null;
  onDrillRoot?: (r: string | null) => void;
}

// 自适应岛屿 + 无固定 Tile + 星系懒加载
export function TreemapScene({ data, selected, onSelect, onHover, root, onDrillRoot }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const metric = useWebStore((s) => s.metric);
  const setMetric = useWebStore((s) => s.setMetric);
  const search = useWebStore((s) => s.search);
  const [size, setSize] = useState({ w: 0, h: 0, ow: 0, oh: 0 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const [tilt, setTilt] = useState(false);
  const firstRoot = useRef(true);

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPt = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const clampScale = (s: number) => Math.min(5, Math.max(0.12, s));
  const fitWorld = useCallback(() => {
    if (!size.w || !size.h) return;
    const pad = 48;
    const scale = clampScale(Math.min((size.ow - pad * 2) / Math.max(1, size.w), (size.oh - pad * 2) / Math.max(1, size.h)));
    setView({ x: (size.ow - size.w * scale) / 2, y: (size.oh - size.h * scale) / 2, scale });
  }, [size]);
  const resetView = useCallback(() => fitWorld(), [fitWorld]);

  useEffect(() => {
    const outer = outerRef.current;
    const el = areaRef.current;
    if (!outer || !el) return;
    const measure = () => {
      const o = outer.getBoundingClientRect();
      setSize({ w: el.clientWidth, h: el.clientHeight, ow: Math.floor(o.width), oh: Math.floor(o.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (size.w > 10 && size.h > 10) fitWorld();
  }, [size.w, size.h, fitWorld]);
  useEffect(() => {
    if (firstRoot.current) { firstRoot.current = false; return; }
    setTilt(true);
    const t = setTimeout(() => setTilt(false), 340);
    resetView();
    setExpanded({});
    return () => clearTimeout(t);
  }, [root, metric, resetView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const step = 80;
      if (e.key === 'ArrowLeft') setView((v) => ({ ...v, x: v.x + step }));
      else if (e.key === 'ArrowRight') setView((v) => ({ ...v, x: v.x - step }));
      else if (e.key === 'ArrowUp') setView((v) => ({ ...v, y: v.y + step }));
      else if (e.key === 'ArrowDown') setView((v) => ({ ...v, y: v.y - step }));
      else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, scale: clampScale(v.scale * 1.18) }));
      else if (e.key === '-') setView((v) => ({ ...v, scale: clampScale(v.scale * 0.85) }));
      else if (e.key === 'Escape') resetView();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetView]);

  // 有效文件（排除已过滤）
  const files = useMemo<FileItem[]>(() => {
    const tree = data.context.fileTree || [];
    const out: FileItem[] = [];
    const excluded = new Set<string>(DEFAULT_EXCLUDE as readonly string[]);
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        if (n.type === 'file') {
          const f = n as unknown as { path: string; lineCount?: number; filtered?: string };
          if (f.filtered && excluded.has(f.filtered)) continue;
          const lc = f.lineCount;
          out.push({ path: f.path, area: Math.max(1, lc ?? 1), known: lc != null });
        }
        if (n.children) walk(n.children as unknown as typeof tree);
      }
    };
    walk(tree);
    return out;
  }, [data]);

  const knownMap = useMemo(() => new Map(files.map((f) => [f.path, f.known])), [files]);
  const hot = useMemo(() => new Set((data.level1.hotspots ?? []).map((h) => h.path)), [data]);
  // 岛屿聚类：语义簇（入口/热点/类型主导...）而非纯目录罗列
  const { parent, rest } = parseRoot(root ?? null);
  const clusters = useMemo(() => buildSemanticClusters(files, { parent, entryFiles: data.level1.entryFiles ?? [], hotFiles: [...hot] }), [files, parent, data.level1.entryFiles, hot]);
  const islands = useMemo(() => clusters.flatMap((c) => c.islands), [clusters]);
  const model = useMemo(() => (size.w > 10 && size.h > 10 ? layoutTreemap(files, root ?? null, size.w, size.h, metric) : null), [files, root, size, metric]);

  const crumbs = useMemo(() => (parent ? parent.split('/') : []), [parent]);
  const hiddenTotal = useMemo(() => model?.units.reduce((a, u) => a + u.hidden, 0) ?? 0, [model]);
  const restUnit = model?.units.find((u) => u.kind === 'rest');
  const scopedKnown = useMemo(() => files.filter((f) => (parent ? f.path === parent || f.path.startsWith(parent + '/') : true) && f.known).map((f) => f.area), [files, parent]);
  const scaleNote = useMemo(() => {
    if (!scopedKnown.length || metric !== 'lines') return null;
    return `${Math.min(...scopedKnown).toLocaleString()}–${Math.max(...scopedKnown).toLocaleString()} 行`;
  }, [scopedKnown, metric]);
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

  const rankMap = useMemo(() => {
    if (!model) return new Map<string, number>();
    const all = model.units.flatMap((x) => x.tiles).sort((a, b) => b.area - a.area);
    const m = new Map<string, number>();
    all.forEach((t, i) => m.set(t.key, i + 1));
    return m;
  }, [model]);

  const searchLower = search.trim().toLowerCase();
  const searchSet = useMemo(() => {
    if (!searchLower) return null;
    const s = new Set<string>();
    for (const f of files) if (f.path.toLowerCase().includes(searchLower)) s.add(f.path);
    return s;
  }, [files, searchLower]);

  const lens = useMemo(() => {
    if (!hoverKey || !model) return null;
    for (const u of model.units) {
      const t: { key: string; path: string; area: number } | undefined = u.kind === 'file' ? u.tiles[0] : u.tiles.find((x) => x.key === hoverKey);
      if (t && t.key === hoverKey) {
        const groupLines = u.kind === 'group' && !u.key.includes('~~rest~~') ? u.lines : model.scopedLines;
        const rank = rankMap.get(hoverKey) ?? 0;
        return { path: t.path, area: t.area, known: knownMap.get(t.path) ?? true, dirPct: groupLines > 0 ? (t.area / groupLines) * 100 : 0, repoPct: data.level0.totalLines > 0 ? (t.area / data.level0.totalLines) * 100 : 0, rank, hot: hot.has(t.path), ext: extColorOf(t.path) };
      }
    }
    return null;
  }, [hoverKey, model, data, hot, knownMap, rankMap]);

  const hoverTile = (key: string | null, path?: string | null) => { setHoverKey(key); onHover?.(path ?? null); };
  const tileBg = (path: string, isSel: boolean, known: boolean, faded: boolean): string => {
    if (isSel) return 'var(--primary)';
    if (faded) return 'rgba(255,255,255,.04)';
    if (!known) return 'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 6px), rgba(255,255,255,.03)';
    const c = extColorOf(path);
    return `linear-gradient(135deg, rgba(255,255,255,.10), transparent 45%), color-mix(in srgb, ${c} 17%, transparent)`;
  };
  const tileStyle = (isSel: boolean, isHot: boolean, isHov: boolean, faded: boolean): React.CSSProperties => ({
    border: faded ? '1px dashed rgba(255,255,255,.14)' : isSel ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,.08)',
    boxShadow: isHot && !isSel && !faded ? 'inset 2px 0 0 #E8B04B' : undefined,
    borderRadius: 10,
    padding: '10px 12px',
    textAlign: 'left',
    cursor: faded ? 'default' : 'pointer',
    color: faded ? 'var(--subtle)' : isSel ? '#fff' : 'var(--muted)',
    overflow: 'visible',
    transform: isSel ? 'translateZ(6px)' : isHov && !faded ? 'translateY(-1px)' : undefined,
    filter: isHov && !isSel && !faded ? 'brightness(1.4)' : undefined,
    transition: 'transform .15s ease-out, filter .15s ease-out',
    minHeight: 56,
  });

  const lensX = Math.min(mouse.x + 16, Math.max(8, size.ow - 300));
  const lensY = Math.min(mouse.y + 16, Math.max(8, size.oh - 150));
  const mouseRaf = useRef<number | null>(null);

  // 星系懒加载：每岛独立展开数，hover 自动展开（触屏保留点击）
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const hoverExpandTimer = useRef<Record<string, number>>({});
  const getVisibleCount = (key: string, total: number) => Math.min(total, expanded[key] ?? 12);
  const canHover = typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : true;
  const filteredByDir = useMemo(() => {
    const m = new Map<string, number>();
    const tree = data.context.fileTree || [];
    const excluded = new Set<string>(DEFAULT_EXCLUDE as readonly string[]);
    const walk = (nodes: typeof tree, dir: string | null) => {
      for (const n of nodes) {
        if (n.type === 'file') {
          const f = n as unknown as { path: string; filtered?: string };
          if (f.filtered && excluded.has(f.filtered)) {
            const d = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.';
            m.set(d, (m.get(d) ?? 0) + 1);
            if (dir) m.set(dir, (m.get(dir) ?? 0) + 1);
          }
        }
        if (n.children) walk(n.children as unknown as typeof tree, n.type === 'directory' ? n.path : dir);
      }
    };
    walk(tree as unknown as typeof tree, null);
    return m;
  }, [data]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  };
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        const nextScale = clampScale(viewRef.current.scale * (1 + delta));
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const wx = (cx - viewRef.current.x) / viewRef.current.scale;
        const wy = (cy - viewRef.current.y) / viewRef.current.scale;
        setView({ x: cx - wx * nextScale, y: cy - wy * nextScale, scale: nextScale });
      } else {
        // 纵向/横向滚轮均转为画布平移，拦截页面级前后导航与滚动穿透
        if (Math.abs(e.deltaX) > 2 || Math.abs(e.deltaY) > 2) e.preventDefault();
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, []);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStart.current = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y };
    lastPt.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!isPanning.current) {
      if (Math.hypot(dx, dy) < 4) return;
      isPanning.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const mdx = e.clientX - lastPt.current.x;
    const mdy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({ ...v, x: v.x + mdx, y: v.y + mdy }));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const wasPanning = isPanning.current;
    isPanning.current = false;
    dragStart.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (wasPanning) {
      // 拖拽结束，阻止后续 click 误触（由 capture 自然处理）
    }
  };

  return (
    <div
      ref={outerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={resetView}
      onMouseMove={(e) => {
        if (mouseRaf.current != null) return;
        const cx = e.clientX; const cy = e.clientY;
        mouseRaf.current = requestAnimationFrame(() => {
          mouseRaf.current = null;
          const r = outerRef.current?.getBoundingClientRect();
          if (r) setMouse({ x: cx - r.left, y: cy - r.top });
        });
      }}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', overscrollBehavior: 'none', touchAction: 'pan-y', background: 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(110,86,207,.05), transparent 60%), transparent', perspective: '1200px', display: 'flex', flexDirection: 'column', padding: '104px 16px 56px', cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textShadow: '0 1px 12px rgba(0,0,0,.9)', zIndex: 2, height: 26 }}>
        <button onClick={() => onDrillRoot?.(null)} style={{ background: 'transparent', border: 0, color: parent ? 'var(--muted)' : 'var(--text)', fontWeight: parent ? 400 : 700, fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>全部</button>
        {crumbs.map((cseg, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: 'var(--subtle)' }}>/</span><span style={{ color: i === crumbs.length - 1 && !rest ? 'var(--text)' : 'var(--muted)', fontWeight: i === crumbs.length - 1 && !rest ? 700 : 400 }}>{cseg}</span></span>
        ))}
        {rest && <span style={{ color: 'var(--text)', fontWeight: 700 }}>/ 其余小文件</span>}
        <span style={{ color: 'var(--subtle)' }}>· {islands.reduce((a, b) => a + b.count, 0)} 文件{scaleNote ? ` · 本层 ${scaleNote}` : ''}{hiddenTotal ? ` · ${hiddenTotal} 过小` : ''}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--subtle)', fontSize: 10 }}>{Math.round(view.scale * 100)}%</span>
        <button onClick={resetView} title="重置视图（双击画布亦可）" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9999, color: 'var(--text)', fontSize: 10, cursor: 'pointer', padding: '2px 9px', fontFamily: 'inherit' }}>重置</button>
        <button onClick={() => setMetric(metric === 'lines' ? 'count' : 'lines')} title="切换面积度量" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9999, color: 'var(--text)', fontSize: 10, cursor: 'pointer', padding: '2px 9px', fontFamily: 'inherit' }}>{metric === 'lines' ? '按行数' : '按文件数'}</button>
        <button onClick={() => setShowLegend((v) => !v)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9999, color: showLegend ? 'var(--text)' : 'var(--muted)', fontSize: 10, cursor: 'pointer', padding: '2px 9px', fontFamily: 'inherit' }}>图例</button>
      </div>

      {showLegend && (
        <div style={{ position: 'absolute', top: 140, right: 16, zIndex: 5, background: 'rgba(10,10,11,.88)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {legendExts.map(([e, n]) => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', color: 'var(--muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: extColorOf(`x.${e}`) }} /><span style={{ color: 'var(--text)' }}>.{e}</span><span style={{ marginLeft: 'auto', paddingLeft: 12 }}>{n}</span></div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', color: 'var(--muted)', borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#E8B04B' }} /><span>热点</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', color: 'var(--muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,.18)', border: '1px dashed rgba(255,255,255,.3)' }} /><span>已过滤</span></div>
        </div>
      )}

      {/* 自适应岛屿流：语义簇 + 多行 masonry */}
      <div ref={areaRef} style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 12, overflow: 'hidden', overscrollBehavior: 'none' }}>
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 24, padding: 16,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            transition: isPanning.current ? 'none' : 'transform .22s ease-out',
            width: '100%', maxWidth: '100%',
          }}
        >
          {clusters.map((cluster) => (
            <div key={cluster.key} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', letterSpacing: '.04em' }}>{cluster.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--subtle)' }}>{cluster.islands.reduce((a, b) => a + b.count, 0)} 文件</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignContent: 'flex-start' }}>
                {cluster.islands.map((isl) => {
                  const isFadedIsland = (filteredByDir.get(isl.key) ?? 0) > 0 && isl.count === 0;
                  const visible = getVisibleCount(isl.key, isl.count);
                  const toShow = isl.files.slice(0, visible);
                  const remain = isl.count - visible;
                  const totalLines = isl.lines;
                  const baseW = Math.min(520, Math.max(280, 260 + Math.log2(Math.max(1, totalLines)) * 22));
                  return (
                    <div
                      key={isl.key}
                      style={{
                        flex: `1 1 ${baseW}px`, minWidth: 280, maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10,
                        background: isFadedIsland ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.015)',
                        border: isFadedIsland ? '1px dashed rgba(232,176,75,.32)' : '1px solid rgba(255,255,255,.06)',
                        borderRadius: 14, padding: '12px 12px 10px', opacity: isFadedIsland ? 0.45 : 1,
                        transform: tilt ? 'rotateX(2deg)' : 'none', transition: 'transform .32s ease-out',
                      }}
                    >
                      <button
                        onClick={() => onDrillRoot?.(isl.key)}
                        style={{ display: 'flex', alignItems: 'baseline', gap: 8, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isl.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--subtle)', flexShrink: 0 }}>{totalLines.toLocaleString()}行 · {isl.count}</span>
                        {filteredByDir.get(isl.key) ? <span style={{ fontSize: 9, color: 'var(--warning)', background: 'rgba(232,176,75,.14)', border: '1px dashed rgba(232,176,75,.32)', borderRadius: 9999, padding: '1px 6px' }}>+{filteredByDir.get(isl.key)}已滤</span> : null}
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, alignContent: 'start' }}>
                        {toShow.map((f) => {
                          const isSel = selected === f.path;
                          const isHov = hoverKey === f.path;
                          const known = f.known;
                          const isSearchDim = Boolean(searchSet && !searchSet.has(f.path));
                          const isHot = hot.has(f.path);
                          return (
                            <button
                              key={f.path}
                              title={`${f.path} · ${known ? `${f.area} 行` : '行数未知'}`}
                              onClick={() => isSearchDim ? undefined : onSelect(isSel ? null : f.path)}
                              onMouseEnter={() => hoverTile(f.path, f.path)}
                              onMouseLeave={() => hoverTile(null)}
                              style={{ ...tileStyle(isSel, isHot, isHov, isSearchDim), background: tileBg(f.path, isSel, known, isSearchDim), opacity: isSearchDim ? 0.22 : 1 } as React.CSSProperties}
                            >
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: isSel ? '#fff' : isSearchDim ? 'var(--subtle)' : 'var(--text)', wordBreak: 'break-word', lineHeight: 1.35 }}>{f.path.split('/').pop()}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isSel ? 'rgba(255,255,255,.75)' : 'var(--subtle)', marginTop: 4, wordBreak: 'break-word' }}>{f.path}<br />{known ? `${f.area.toLocaleString()} 行` : '未知'}</div>
                            </button>
                          );
                        })}
                      </div>
                      {remain > 0 && (
                        <div
                          onMouseEnter={() => {
                            if (!canHover) return;
                            const t = window.setTimeout(() => setExpanded((prev) => ({ ...prev, [isl.key]: Math.min(isl.count, (prev[isl.key] ?? 12) + 12) })), 350);
                            hoverExpandTimer.current[isl.key] = t;
                          }}
                          onMouseLeave={() => {
                            const t = hoverExpandTimer.current[isl.key];
                            if (t) { clearTimeout(t); delete hoverExpandTimer.current[isl.key]; }
                          }}
                          style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'center', paddingTop: 4 }}
                        >
                          <button
                            onClick={() => setExpanded((prev) => ({ ...prev, [isl.key]: Math.min(isl.count, (prev[isl.key] ?? 12) + 12) }))}
                            style={{ background: 'rgba(110,86,207,.14)', border: '1px solid rgba(110,86,207,.28)', color: 'var(--text)', borderRadius: 9999, fontSize: 11, fontWeight: 600, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
                            {canHover ? `悬停展开 ${Math.min(12, remain)} · 剩余 ${remain}` : `展开 ${Math.min(12, remain)} · 剩余 ${remain}`}
                            <span style={{ opacity: 0.7 }}>↗</span>
                          </button>
                        </div>
                      )}
                      {remain === 0 && isl.count > 12 && (
                        <button onClick={() => setExpanded((prev) => ({ ...prev, [isl.key]: 12 }))} style={{ alignSelf: 'center', background: 'transparent', border: 0, color: 'var(--subtle)', fontSize: 10, cursor: 'pointer', padding: 2 }}>收起</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {restUnit && (
            <div style={{ width: 280, background: 'rgba(232,176,75,.07)', border: '1px dashed rgba(232,176,75,.5)', borderRadius: 14, padding: 14, display: 'grid', placeItems: 'center', minHeight: 120 }}>
              <button onClick={() => onDrillRoot?.(restUnit.key)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text)', fontWeight: 700 }}>+{restUnit.count} 小文件<br /><span style={{ fontSize: 10, color: 'var(--muted)' }}>{restUnit.lines.toLocaleString()} 行</span></button>
            </div>
          )}
          {clusters.length === 0 && <div style={{ color: 'var(--subtle)', fontSize: 12, padding: 24 }}>该目录下无有效文件</div>}
        </div>
      </div>

      {/* 右侧纵览图 Overlay - VSCode 风格，可拖拽/点击 */}
      {model && islands.length > 0 && (
        <div
          onPointerDown={(e) => {
            // 点击纵览图空白处不处理
            e.stopPropagation();
          }}
          style={{ position: 'absolute', right: 8, top: 140, bottom: 16, width: 96, background: 'rgba(10,10,11,.82)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', zIndex: 3 }}
        >
          <div style={{ padding: '6px 8px', fontSize: 9, fontWeight: 700, color: 'var(--subtle)', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>纵览</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'thin' }}>
            {islands.slice(0, 60).map((isl) => {
              const isActive = parent === isl.key || (parent && parent.startsWith(isl.key + '/'));
              return (
                <button
                  key={isl.key}
                  onClick={() => onDrillRoot?.(isl.key)}
                  title={`${isl.key} · ${isl.count} 文件`}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
                    background: isActive ? 'rgba(110,86,207,.22)' : 'rgba(255,255,255,.04)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,.08)',
                    borderRadius: 6, padding: '6px 6px 4px', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? 'var(--text)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isl.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--subtle)' }}>{isl.count} · {isl.lines.toLocaleString()}行</span>
                  <span style={{ height: 3, borderRadius: 9999, background: 'rgba(110,86,207,.32)', width: `${Math.min(100, Math.max(12, Math.log2(isl.lines) * 8))}%`, display: 'block', marginTop: 2 }} />
                </button>
              );
            })}
          </div>
          <div style={{ padding: '4px 6px', fontSize: 8, color: 'var(--subtle)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>{islands.length} 簇 · {islands.reduce((a,b)=>a+b.count,0)} 文件</div>
        </div>
      )}

      {lens && (
        <div style={{ position: 'absolute', left: lensX, top: lensY, zIndex: 6, pointerEvents: 'none', background: 'rgba(10,10,11,.92)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: '8px 10px', maxWidth: 300, fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text)', overflow: 'hidden' }}><span style={{ width: 7, height: 7, borderRadius: 2, background: lens.ext, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lens.path.split('/').pop()}</span>{lens.hot && <span style={{ color: '#E8B04B', flexShrink: 0 }}>●热点</span>}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lens.path}</div>
          <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 4 }}>{lens.known ? `${lens.area.toLocaleString()} 行` : '行数未知'}<span style={{ color: 'var(--muted)' }}> · 占目录 {lens.dirPct.toFixed(1)}% · 占全仓 {lens.repoPct.toFixed(2)}% · #{lens.rank}</span></div>
          <button onClick={() => { onSelect?.(lens.path); useWebStore.getState().setView('city'); }} style={{ pointerEvents: 'auto', marginTop: 6, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}>在 3D 中查看 →</button>
        </div>
      )}
    </div>
  );
}
