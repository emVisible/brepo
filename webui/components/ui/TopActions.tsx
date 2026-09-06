'use client';

// 顶栏动作组：GitHub / 语言。单色线稿，与 Logo 同语言。
// 语言单真相源 = URL：首页切换即导航（/ ↔ /en）；报告页无英文路由，原地翻 store。
import { usePathname, useRouter } from 'next/navigation';
import { useWebStore } from '@/lib/store';
import { dict } from '@/lib/i18n';

export const GITHUB_URL = 'https://github.com/emVisible/brepo';

const btn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  color: 'var(--muted)',
  borderRadius: 8,
  padding: 0,
};

export function GitHubBtn({ size = 17 }: { size?: number }) {
  const lang = useWebStore((s) => s.lang);
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={dict[lang].githubAria}
      title="GitHub"
      style={btn}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    </a>
  );
}

export function LangToggle() {
  const lang = useWebStore((s) => s.lang);
  const pathname = usePathname();
  const router = useRouter();
  const onReport = pathname.startsWith('/r/');
  const go = () => {
    if (onReport) {
      // 报告页无英文路由：原地翻 store + cookie
      useWebStore.getState().setLang(lang === 'zh' ? 'en' : 'zh');
      return;
    }
    router.push(lang === 'zh' ? '/en' : '/');
  };
  return (
    <button
      onClick={go}
      aria-label="Switch language / 切换语言"
      title="EN / 中"
      style={{ ...btn, width: 'auto', padding: '0 8px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
    >
      {dict[lang].langToggle}
    </button>
  );
}
