'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult } from '@briefrepo/types';
import { DEFAULT_EXCLUDE, FILTER_RULES } from '@briefrepo/types';
import { extColorOf } from '@/styles/tokens';
import { useWebStore } from '@/lib/store';

interface Props {
  data: AnalysisResult;
  selected: string | null;
  onSelect: (p: string | null) => void;
  onHover?: (p: string | null) => void;
  treemapRoot: string | null;
  onPickRoot: (r: string | null) => void;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  lineCount?: number;
}

const EXT_BADGE: Record<string, string> = {
  ts: 'ts', tsx: 'ts', js: 'js', jsx: 'js', mjs: 'js', cjs: 'js',
  py: 'py', go: 'go', rs: 'rs', java: 'jv', rb: 'rb', php: 'php',
  css: 'css', scss: 'css', less: 'css', html: '<>', vue: 'vue',
  md: 'md', mdx: 'md', json: '{}', yml: 'yml', yaml: 'yml', toml: 'toml', xml: '</>',
  pdf: 'pdf', woff: 'fnt', woff2: 'fnt', ttf: 'fnt', otf: 'fnt', eot: 'fnt',
  mp4: 'vid', webm: 'vid', mov: 'vid', avi: 'vid',
  mp3: 'aud', wav: 'aud', ogg: 'aud', flac: 'aud',
  zip: 'zip', tar: 'zip', gz: 'zip', '7z': 'zip', rar: 'zip',
  png: 'img', jpg: 'img', jpeg: 'img', webp: 'img', gif: 'img', svg: 'img', ico: 'img',
};

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

function countFiles(nodes: FileNode[]): number {
  let n = 0;
  for (const x of nodes) {
    if (x.type === 'file') n++;
    else if (x.children) n += countFiles(x.children);
  }
  return n;
}

function countFiltered(nodes: FileNode[]): number {
  let n = 0;
  for (const x of nodes) {
    if (x.type === 'file' && (x as unknown as { filtered?: string }).filtered && (DEFAULT_EXCLUDE as readonly string[]).includes((x as unknown as { filtered?: string }).filtered!)) n++;
    else if (x.children) n += countFiltered(x.children);
  }
  return n;
}

const FILTER_LABEL = new Map(FILTER_RULES.map((r) => [r.id, r.labelZh]));

// 统一四列：caret 14px｜徽标 24px｜名称 flex｜数字右对齐
// 文件夹行与文件行同网格，名称永远竖直一条线；嵌套引导线 14px 步进
const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '14px 24px 1fr auto',
  alignItems: 'center',
  columnGap: 4,
  width: '100%',
  background: 'transparent',
  border: 0,
  padding: '3px 0',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 12,
};

const NUM: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--subtle)',
  textAlign: 'right',
};

export function DirTree({ data, selected, onSelect, onHover, treemapRoot, onPickRoot }: Props) {
  const tree = useMemo(() => ((data.context.fileTree ?? []) as unknown as FileNode[]), [data]);
  const hotspots = useMemo(() => (data.level1.hotspots ?? []).slice(0, 3), [data]);
  const search = useWebStore((s) => s.search);
  const setSearch = useWebStore((s) => s.setSearch);
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.filter((n) => n.type === 'directory').slice(0, 4).map((n) => n.path)));
  const total = data.level0.fileCountAll ?? data.level0.fileCount;
  const filteredTotal = data.level0.filteredCount ?? 0;
  const q = search.trim().toLowerCase();
  const matchSet = useMemo(() => {
    if (!q) return null;
    const s = new Set<string>();
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.path.toLowerCase().includes(q)) s.add(n.path);
        if (n.children) walk(n.children as unknown as FileNode[]);
      }
    };
    walk(tree as unknown as FileNode[]);
    return s;
  }, [tree, q]);

  const toggle = (p: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const sorted = (nodes: FileNode[]) =>
    [...nodes].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));

  // 虚拟列表：拍平可见行，仅渲染视口附近，避免 react 等大仓一次性创建数千 DOM 导致卡死
  const ROW_H = 22;
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(420);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  type FlatRow = { node: FileNode; depth: number; kind: 'dir' | 'file' };
  const flat = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    const walk = (nodes: FileNode[], depth: number) => {
      for (const n of sorted(nodes)) {
        if (n.type === 'directory') {
          out.push({ node: n, depth, kind: 'dir' });
          if (open.has(n.path) && n.children) walk(n.children, depth + 1);
        } else {
          out.push({ node: n, depth, kind: 'file' });
        }
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, open]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const visibleCount = Math.ceil(viewportH / ROW_H) + 16;
  const end = Math.min(flat.length, start + visibleCount);
  const slice = flat.slice(start, end);
  const topPad = start * ROW_H;
  const bottomPad = (flat.length - end) * ROW_H;

  const renderRow = (row: FlatRow) => {
    const n = row.node;
    const depth = row.depth;
    if (n.type === 'directory') {
      const isOpen = open.has(n.path);
      const cnt = n.children ? countFiles(n.children) : 0;
      const fcnt = n.children ? countFiltered(n.children) : 0;
      const filtering = treemapRoot === n.path;
      const dirMatched = !matchSet || n.path.toLowerCase().includes(q) || (n.children && Array.from(matchSet).some((p) => p.startsWith(n.path + '/')));
      return (
        <div key={n.path} style={{ height: ROW_H, display: 'flex', alignItems: 'center', marginLeft: depth * 12, opacity: matchSet && !dirMatched ? 0.28 : 1 }}>
          <div
            style={{
              ...GRID,
              height: ROW_H,
              boxShadow: filtering ? 'inset 2px 0 0 var(--primary)' : undefined,
              borderLeft: depth ? '1px solid rgba(255,255,255,.07)' : undefined,
              paddingLeft: depth ? 6 : 0,
            }}
            role="treeitem"
            aria-expanded={isOpen}
          >
            <button onClick={() => toggle(n.path)} aria-label={isOpen ? '收起' : '展开'} style={{ background: 'transparent', border: 0, color: 'var(--subtle)', fontSize: 10, cursor: 'pointer', padding: 0 }}>
              {isOpen ? '▾' : '▸'}
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--primary)', opacity: 0.8 }}>▤</span>
            <button
              onClick={() => onPickRoot(filtering ? null : n.path)}
              onMouseEnter={() => onHover?.(n.path)}
              onMouseLeave={() => onHover?.(null)}
              title={`过滤到 ${n.path}${fcnt ? ` · 已过滤 ${fcnt}` : ''}`}
              style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 0, minWidth: 0,
                color: filtering ? 'var(--text)' : 'var(--muted)', fontWeight: 600, fontSize: 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {n.name}
            </button>
            <span style={NUM} title={fcnt ? `已过滤 ${fcnt}` : undefined}>
              {cnt}
              {fcnt ? <span style={{ color: 'var(--warning)', marginLeft: 4 }}>·{fcnt}已滤</span> : null}
            </span>
          </div>
        </div>
      );
    }
    const active = selected === n.path;
    const f = (n as unknown as { filtered?: string }).filtered;
    const isFiltered = Boolean(f && (DEFAULT_EXCLUDE as readonly string[]).includes(f));
    const badge = f ? FILTER_LABEL.get(f as never) ?? f : null;
    const matched = !matchSet || matchSet.has(n.path);
    return (
      <button
        key={n.path}
        onClick={() => onSelect(active ? null : n.path)}
        onMouseEnter={() => onHover?.(n.path)}
        onMouseLeave={() => onHover?.(null)}
        title={n.path + (badge ? ` · 已过滤:${badge}` : '') + (matchSet && !matched ? ' · 非匹配' : '')}
        style={{
          ...GRID,
          height: ROW_H,
          boxShadow: active ? 'inset 2px 0 0 var(--primary)' : isFiltered ? 'inset 2px 0 0 rgba(232,176,75,.5)' : matched ? 'inset 2px 0 0 var(--primary)' : undefined,
          marginLeft: depth * 12,
          borderLeft: depth ? '1px solid rgba(255,255,255,.07)' : undefined,
          paddingLeft: depth ? 6 : 0,
          opacity: isFiltered ? 0.55 : matched ? 1 : 0.28,
          background: matched && matchSet ? 'rgba(110,86,207,.12)' : 'transparent',
        }}
      >
        <span />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: active ? 'var(--text)' : isFiltered ? 'var(--warning)' : extColorOf(n.name), opacity: active ? 1 : 0.85 }}>{EXT_BADGE[extOf(n.name)] ?? '··'}</span>
        <span
          style={{
            color: active ? 'var(--text)' : isFiltered ? 'var(--subtle)' : 'var(--muted)', fontSize: 12,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: active ? 'underline' : 'none', textUnderlineOffset: 3,
            fontStyle: isFiltered ? 'italic' : undefined,
          }}
        >
          {n.name}
          {isFiltered ? <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--warning)', border: '1px solid rgba(232,176,75,.35)', borderRadius: 9999, padding: '0 4px' }}>已滤·{badge}</span> : null}
        </span>
        <span style={NUM} title={n.lineCount == null ? '行数未知' : undefined}>{n.lineCount ?? '?'}</span>
      </button>
    );
  };

  return (
    <div style={{ textShadow: '0 1px 12px rgba(0,0,0,.9), 0 1px 3px rgba(0,0,0,.9)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索文件/目录…"
          style={{ flex: 1, height: 28, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '0 8px', outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: 'var(--muted)', fontSize: 11, padding: '0 8px', cursor: 'pointer' }}>清除</button>
        )}
      </div>
      <button onClick={() => { onPickRoot(null); onSelect(null); }} style={{ ...GRID, color: treemapRoot ? 'var(--muted)' : 'var(--text)', fontWeight: treemapRoot ? 400 : 700 }}>
        <span style={{ fontSize: 10, color: 'var(--subtle)' }}>≡</span>
        <span />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>全部文件</span>
        <span style={NUM} title={filteredTotal ? `已过滤 ${filteredTotal}` : undefined}>
          {total}
          {filteredTotal ? <span style={{ color: 'var(--warning)', marginLeft: 6 }}>·{filteredTotal}已滤</span> : null}
        </span>
      </button>

      {hotspots.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 8, paddingTop: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>热点</div>
          <div style={{ marginTop: 2 }}>
            {hotspots.map((h) => {
              const active = selected === h.path;
              const short = h.path.split('/').slice(-2).join('/');
              return (
                <button
                  key={h.path}
                  onClick={() => onSelect(active ? null : h.path)}
                  onMouseEnter={() => onHover?.(h.path)}
                  onMouseLeave={() => onHover?.(null)}
                  title={h.path}
                  style={GRID}
                >
                  <span />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: h.score > 70 ? 'var(--error)' : h.score > 45 ? 'var(--warning)' : 'var(--primary)' }}>{h.score}</span>
                  <span style={{ color: active ? 'var(--text)' : 'var(--muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: active ? 'underline' : 'none', textUnderlineOffset: 3 }}>{short}</span>
                  <span />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div ref={listRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} style={{ borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 8, paddingTop: 6, maxHeight: '52vh', overflow: 'auto', scrollbarWidth: 'thin' }} role="tree" aria-label="目录">
        <div style={{ height: flat.length * ROW_H, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${start * ROW_H}px)` }}>
            {slice.map(renderRow)}
          </div>
        </div>
        {flat.length > 120 && (
          <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(transparent, rgba(10,10,11,.9))', height: 18, pointerEvents: 'none' }} />
        )}
      </div>
      {filteredTotal > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>
          已过滤 {filteredTotal} 个（测试/生成物/资源默认不进分布与 3D，左树照常展示）
        </div>
      )}
    </div>
  );
}
