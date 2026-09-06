'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult } from '@briefrepo/types';
import { extColorOf } from '@/styles/tokens';

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
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.filter((n) => n.type === 'directory').slice(0, 4).map((n) => n.path)));
  const total = data.level0.fileCount;

  const toggle = (p: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const sorted = (nodes: FileNode[]) =>
    [...nodes].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));

  const renderNodes = (nodes: FileNode[], depth: number): React.ReactNode => (
    <div style={depth > 0 ? { borderLeft: '1px solid rgba(255,255,255,.07)', marginLeft: 6, paddingLeft: 6 } : undefined}>
      {sorted(nodes).map((n) => {
        if (n.type === 'directory') {
          const isOpen = open.has(n.path);
          const cnt = n.children ? countFiles(n.children) : 0;
          const filtering = treemapRoot === n.path;
          return (
            <div key={n.path}>
              <div
                style={{
                  ...GRID,
                  boxShadow: filtering ? 'inset 2px 0 0 var(--primary)' : undefined,
                  paddingLeft: filtering ? 2 : 0,
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
                  title={`过滤到 ${n.path}`}
                  style={{
                    background: 'transparent', border: 0, cursor: 'pointer', padding: 0, minWidth: 0,
                    color: filtering ? 'var(--text)' : 'var(--muted)', fontWeight: 600, fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {n.name}
                </button>
                <span style={NUM}>{cnt}</span>
              </div>
              {isOpen && n.children && renderNodes(n.children, depth + 1)}
            </div>
          );
        }
        const active = selected === n.path;
        return (
          <button
            key={n.path}
            onClick={() => onSelect(active ? null : n.path)}
            onMouseEnter={() => onHover?.(n.path)}
            onMouseLeave={() => onHover?.(null)}
            title={n.path}
            style={{ ...GRID, boxShadow: active ? 'inset 2px 0 0 var(--primary)' : undefined, paddingLeft: active ? 2 : 0 }}
          >
            <span />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: active ? 'var(--text)' : extColorOf(n.name), opacity: active ? 1 : 0.85 }}>{EXT_BADGE[extOf(n.name)] ?? '··'}</span>
            <span
              style={{
                color: active ? 'var(--text)' : 'var(--muted)', fontSize: 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: active ? 'underline' : 'none', textUnderlineOffset: 3,
              }}
            >
              {n.name}
            </span>
            <span style={NUM} title={n.lineCount == null ? '行数未知' : undefined}>{n.lineCount ?? '?'}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ textShadow: '0 1px 12px rgba(0,0,0,.9), 0 1px 3px rgba(0,0,0,.9)' }}>
      <button onClick={() => { onPickRoot(null); onSelect(null); }} style={{ ...GRID, color: treemapRoot ? 'var(--muted)' : 'var(--text)', fontWeight: treemapRoot ? 400 : 700 }}>
        <span style={{ fontSize: 10, color: 'var(--subtle)' }}>≡</span>
        <span />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>全部文件</span>
        <span style={NUM}>{total}</span>
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

      <div style={{ borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 8, paddingTop: 6 }} role="tree" aria-label="目录">
        {renderNodes(tree, 0)}
      </div>
    </div>
  );
}
