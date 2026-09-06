'use client';

import { useWebStore } from '@/lib/store';

export default function HistoryPage() {
  const data = useWebStore((s) => s.data);
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>历史</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>历史报告保存在首页列表（本浏览器 localStorage）。</p>
      <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        {data ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{data.context.name} · {data.basicInference.kind} {data.basicInference.confidence}% · {data.durationMs}ms</div>
        ) : (
          <div style={{ color: 'var(--subtle)', fontSize: 12 }}>暂无历史</div>
        )}
      </div>
    </main>
  );
}
