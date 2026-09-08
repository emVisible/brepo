'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWebStore } from '@/lib/store';
import { dict } from '@/lib/i18n';
import { getHistory } from '@/lib/history';
import { DirTree } from '@/components/hud/DirTree';
import { HotspotRail } from '@/components/hud/HotspotRail';
import { Logo } from '@/components/ui/Logo';
import { GitHubBtn, LangToggle } from '@/components/ui/TopActions';
import { kindColor } from '@/styles/tokens';

const CityScene = dynamic(() => import('@/components/scene/CityScene').then((m) => m.CityScene), { ssr: false });
const TreemapScene = dynamic(() => import('@/components/scene/TreemapScene').then((m) => m.TreemapScene), { ssr: false });

const VIEW_IDS = ['treemap', 'city'] as const;

const textShadow = '0 1px 12px rgba(0,0,0,.9), 0 1px 3px rgba(0,0,0,.9)';

// 常态沉浸：3D 即桌面，HUD 为上下两条透明线 + 按需出现的左栏；无卡片无背景
export default function ReportPage() {
  const data = useWebStore((s) => s.data);
  const view = useWebStore((s) => s.view);
  const setView = useWebStore((s) => s.setView);
  const selected = useWebStore((s) => s.selected);
  const setSelected = useWebStore((s) => s.setSelected);
  const hover = useWebStore((s) => s.hover);
  const setHover = useWebStore((s) => s.setHover);
  const treemapRoot = useWebStore((s) => s.treemapRoot);
  const setTreemapRoot = useWebStore((s) => s.setTreemapRoot);
  const metric = useWebStore((s) => s.metric);
  const lang = useWebStore((s) => s.lang);
  const t = dict[lang];

  const [leftW, setLeftW] = useState(240);
  const resizing = useRef(false);

  const params = useParams<{ id: string }>();
  // 直接访问 /r/:id 时用 cookie 语言初始化（站内导航则保持 store 现状）；
  // store 为空则按 id 从本地历史恢复（刷新/回退可复活）
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )bl=(zh|en)/);
      if (m?.[1]) useWebStore.getState().setLang(m[1] as 'zh' | 'en');
    } catch { /* 忽略 */ }
    const st = useWebStore.getState();
    if (!st.data && typeof params.id === 'string') {
      const found = getHistory(params.id);
      if (found) {
        st.setData(found.result);
        st.setView('treemap');
        st.setSelected(null);
        st.setTreemapRoot(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const VIEWS = [
    { id: 'treemap', label: t.viewTreemap },
    { id: 'city', label: t.viewCity },
  ] as const;
  // 每视图一句话自解释：不 hover 也能懂这张图
  const LEGENDS: Record<string, string> = {
    treemap_lines: t.legendTreemapLines,
    treemap_count: t.legendTreemapCount,
    city: t.legendCity,
  };

  const detail = useMemo(() => {
    if (!data || !selected) return null;
    const deps = data.level1.dependencyGraph;
    const out = deps.filter((d) => d.from === selected).slice(0, 5).map((d) => d.to);
    const inc = deps.filter((d) => d.to === selected).slice(0, 5).map((d) => d.from);
    return { out, inc };
  }, [data, selected]);

  if (!data) {
    return (
      <main style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--subtle)', fontSize: 12 }}>
          {t.emptyReport}
        </div>
      </main>
    );
  }

  const c = kindColor[data.basicInference.kind] ?? '#6E56CF';
  const readout = hover ?? selected;
  const langs = Object.entries(data.level0.languages).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}${v}`).join(' ');
  const health = data.level1.health;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* 内容层：全 bleed（视图切换淡入，选中态跨视图保留） */}
      <div key={view} className="brepo-view-in" style={{ position: 'absolute', inset: 0, left: view === 'treemap' ? leftW + 20 : 0 }}>
        {view === 'city' && <CityScene data={data} selected={selected} onSelect={setSelected} onHover={setHover} district={treemapRoot} onDistrictSelect={setTreemapRoot} />}
        {view === 'treemap' && <TreemapScene data={data} selected={selected} onSelect={setSelected} onHover={setHover} root={treemapRoot} onDrillRoot={setTreemapRoot} />}
      </div>

      {/* 可读性渐晕（非卡片） */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(rgba(10,10,11,.72), transparent 22%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(transparent 82%, rgba(10,10,11,.62))' }} />

      {/* 顶栏一行 */}
      <header
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px', pointerEvents: 'none',
          fontSize: 12, textShadow, whiteSpace: 'nowrap', overflow: 'hidden',
        }}
      >
        <Link href="/" aria-label="BriefRepo" style={{ pointerEvents: 'auto', flexShrink: 0, display: 'grid', placeItems: 'center' }}><Logo size={22} /></Link>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
          <span style={{ color: c, fontWeight: 700 }}>{data.basicInference.kind}</span>
          <span>{data.basicInference.confidence}%</span>
        </span>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.01em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.context.name}</span>
        <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>
          {t.kpiFiles} <strong style={{ color: 'var(--text)' }}>{data.level0.fileCount.toLocaleString()}</strong>
          {data.level0.filteredCount ? <span style={{ color: 'var(--warning)' }}>（已过滤 {data.level0.filteredCount}）</span> : null}
          {' · '}{data.level0.totalLines.toLocaleString()}{t.kpiLinesUnit}
          {' · '}{langs || '—'}
          {' · '}{t.kpiCommits} <strong style={{ color: 'var(--text)' }}>{data.level0.git.totalCommits}</strong>
          {' · '}{t.kpiHealth} <strong style={{ color: 'var(--text)' }}>{health ? health.score : '—'}</strong>
        </span>
        <span style={{ flex: 1 }} />
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0, pointerEvents: 'auto' }}>
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: active ? 'var(--text)' : 'var(--muted)',
                  fontSize: 12, fontWeight: active ? 700 : 500, padding: '4px 2px',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {v.label}
              </button>
            );
          })}
          <span style={{ display: 'flex', gap: 2, alignItems: 'center', marginLeft: 4 }}>
            <LangToggle />
            <GitHubBtn />
          </span>
        </nav>
      </header>

      {/* 左栏：分布=画布导航器（自适应可调宽度） */}
      {view === 'treemap' ? (
        <>
          <aside style={{ position: 'absolute', top: 104, left: 12, width: leftW, bottom: 56, overflow: 'hidden', pointerEvents: 'auto', background: 'rgba(10,10,11,.42)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '10px 8px', backdropFilter: 'blur(6px)' }}>
            <DirTree data={data} selected={selected} onSelect={setSelected} onHover={setHover} treemapRoot={treemapRoot} onPickRoot={setTreemapRoot} />
          </aside>
          <div
            onPointerDown={(e) => {
              resizing.current = true;
              const startX = e.clientX;
              const startW = leftW;
              const onMove = (ev: PointerEvent) => {
                if (!resizing.current) return;
                const nw = Math.min(420, Math.max(200, startW + ev.clientX - startX));
                setLeftW(nw);
              };
              const onUp = () => {
                resizing.current = false;
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
            style={{ position: 'absolute', top: 104, left: 12 + leftW, width: 10, bottom: 56, cursor: 'col-resize', zIndex: 4, display: 'grid', placeItems: 'center' }}
            title="拖拽调整宽度"
          >
            <div style={{ width: 3, height: 36, borderRadius: 9999, background: 'rgba(255,255,255,.14)' }} />
          </div>
        </>
      ) : (
        <aside style={{ position: 'absolute', left: 20, bottom: 52, width: 264, maxHeight: 'calc(100vh - 220px)', overflow: 'auto', pointerEvents: 'auto', scrollbarWidth: 'thin' }}>
          <HotspotRail data={data} selected={selected} onSelect={setSelected} onHover={setHover} />
        </aside>
      )}

      {/* 底栏一行：图例 + 读数/详情 */}
      <footer
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'baseline', gap: 12,
          padding: '10px 20px', pointerEvents: 'none',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
          textShadow, whiteSpace: 'nowrap', overflow: 'hidden',
        }}
      >
        <span style={{ flexShrink: 0 }}>{LEGENDS[view === 'treemap' ? `treemap_${metric}` : view] ?? LEGENDS[view]}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: readout ? 'var(--text)' : 'var(--subtle)' }}>
          {readout ?? (view === 'city' ? t.hintCity : t.hintTreemap)}
        </span>
        {detail && (
          <span style={{ flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '44vw' }}>
            {t.detailOut} {detail.out.join(', ') || '—'} · {t.detailIn} {detail.inc.join(', ') || '—'}
          </span>
        )}
        {selected && (
          <button
            onClick={() => setView(view === 'city' ? 'treemap' : 'city')}
            title={view === 'city' ? t.viewTreemap : t.viewCity}
            style={{
              flexShrink: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 9999,
              color: 'var(--text)', fontSize: 11, padding: '3px 10px', cursor: 'pointer', pointerEvents: 'auto',
              fontFamily: 'var(--font-mono)',
            }}
          >
            → {view === 'city' ? t.viewTreemap : t.viewCity}
          </button>
        )}
      </footer>
    </div>
  );
}
