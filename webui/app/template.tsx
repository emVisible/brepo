'use client';

// 路由级页面过渡：站内跳转（/ ↔ /r/[id]）淡入 + 8px 上浮，220ms
// 注意：浏览器前进/后退不触发（App Router 限制）；prefers-reduced-motion 熄火
import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
