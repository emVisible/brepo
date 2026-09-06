'use client';

import type { AnalysisResult } from '@briefrepo/types';
import { useWebStore } from '@/lib/store';
import { dict } from '@/lib/i18n';

interface Props {
  data: AnalysisResult;
  selected: string | null;
  onSelect: (p: string | null) => void;
  onHover?: (p: string | null) => void;
  limit?: number;
}

// 左下角热点榜：透明文本行，无卡片；城市视图用
export function HotspotRail({ data, selected, onSelect, onHover, limit = 6 }: Props) {
  const lang = useWebStore((s) => s.lang);
  const hotspots = (data.level1.hotspots ?? []).slice(0, limit);
  if (!hotspots.length) return null;
  return (
    <div style={{ textShadow: '0 1px 12px rgba(0,0,0,.9), 0 1px 3px rgba(0,0,0,.9)' }}>
      <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>
        {dict[lang].railHotspot}
      </div>
      <div style={{ marginTop: 2 }}>
        {hotspots.map((h, i) => {
          const active = selected === h.path;
          return (
            <button
              key={h.path}
              onClick={() => onSelect(active ? null : h.path)}
              onMouseEnter={() => onHover?.(h.path)}
              onMouseLeave={() => onHover?.(null)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                background: 'transparent',
                border: 0,
                padding: '3px 0',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--subtle)', width: 12 }}>{i + 1}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: active ? 'var(--text)' : 'var(--muted)',
                  fontWeight: active ? 700 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  textDecoration: active ? 'underline' : 'none',
                  textUnderlineOffset: 3,
                }}
              >
                {h.path}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: h.score > 70 ? 'var(--error)' : h.score > 45 ? 'var(--warning)' : 'var(--primary)',
                }}
              >
                {h.score}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
