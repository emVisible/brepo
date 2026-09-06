// Logo 单一入口：线稿指南针，currentColor 随主题自动反色
// favicon 用 app/icon.svg（同几何文件约定）；站内一律走本组件，勿另起形状
export function Logo({ size = 28, alt = 'BriefRepo' }: { size?: number; alt?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label={alt} style={{ display: 'block', color: 'var(--text)' }}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="17.5" x2="16" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="13" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="22" x2="25.5" y2="9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="25.5" cy="9.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
