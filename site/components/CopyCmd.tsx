'use client';
import { useState } from 'react';

// 安装命令复制块：纯展示工具，无后端、无跳转
export function CopyCmd({ cmd, copiedLabel }: { cmd: string; copiedLabel: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        try {
          void navigator.clipboard?.writeText(cmd).then(() => {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          });
        } catch { /* 剪贴板不可用则静默 */ }
      }}
      title={cmd}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        background: '#0d0d10', border: '1px solid var(--border)', borderRadius: 10,
        padding: '10px 12px', minHeight: 44, cursor: 'pointer', color: 'var(--text)',
        fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'left',
      }}
    >
      <span style={{ color: 'var(--subtle)' }}>$</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd}</span>
      <span style={{ color: ok ? 'var(--success)' : 'var(--subtle)', fontSize: 11, flexShrink: 0 }}>{ok ? copiedLabel : '⧉'}</span>
    </button>
  );
}
