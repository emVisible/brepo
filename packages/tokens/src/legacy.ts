// legacy — 旧 sage/peach 调色（v3.1），仅供迁移期兼容
// 新代码禁止引用此文件；待旧报告模板下线后删除

export const legacyKindColor: Record<string, string> = {
  product: '#7aa89e',
  library: '#9a8fb8',
  documentation: '#c4a77d',
  experimental: '#d4a0a0',
  tutorial: '#8fb8b8',
  hybrid: '#7aa89e',
  other: '#71717a',
  platform: '#5a8f7d',
};

export const legacyTheme = {
  dark: {
    bg: '#0f1412',
    card: '#1a2220',
    text: '#e8f0ec',
    muted: '#8da89e',
    subtle: '#6b8a7e',
    border: '#1e2e29',
  },
} as const;
