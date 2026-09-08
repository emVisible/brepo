'use client';
import { useEffect, useRef, type ReactNode } from 'react';

// 滚动入场：进入视口加 .on（CSS transition 完成剩余工作）；reduced-motion 下 CSS 直接终态
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('on'); return; }
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { el.classList.add('on'); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="rv" style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}
