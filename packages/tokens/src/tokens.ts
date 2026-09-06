// @briefrepo/tokens — 单一真相源（v4.0 新设计语言）
// 中性灰 + 单紫强调（Linear/Raycast 式），替代旧 sage/peach 双色
// 旧值保留于 legacy.ts 供迁移期兼容

export const colors = {
  // 中性基底
  bg: '#0A0A0B',
  card: '#141416',
  cardHover: '#1C1C1F',
  text: '#EDEEF0',
  muted: '#9A9AA0',
  subtle: '#6B6B74',
  border: '#232326',
  borderHover: '#2F2F34',
  input: '#141416',
  inputBorder: '#232326',
  // 单强调紫
  accent: {
    500: '#6E56CF',
    600: '#5B44C4',
    50: '#EDE9FE',
  },
  primary: {
    50: '#EDE9FE',
    100: '#D9D1FA',
    500: '#6E56CF',
    600: '#5B44C4',
    700: '#4C379F',
  },
  // 语义
  success: '#30A46C',
  warning: '#F76808',
  error: '#E5484D',
  info: '#0091FF',
} as const;

export const kindColor: Record<string, string> = {
  product: '#6E56CF',
  library: '#0091FF',
  documentation: '#AD5700',
  experimental: '#E5484D',
  tutorial: '#F76808',
  hybrid: '#6E56CF',
  other: '#9A9AA0',
  platform: '#30A46C',
};

export const kindBg: Record<string, string> = {
  product: '#EDE9FE',
  library: '#E5F4FF',
  documentation: '#FFF3E0',
  experimental: '#FDECEC',
  tutorial: '#FFF0E5',
  hybrid: '#EDE9FE',
  other: '#F4F4F5',
  platform: '#E6F4ED',
};

// 扩展名色板（WinDirStat 式差异化，暗色调校）：目录树徽标 + 分布 tile 共用单源
export const extTile: Record<string, string> = {
  ts: '#6E9FFF',
  tsx: '#6E9FFF',
  js: '#E5C558',
  jsx: '#E5C558',
  mjs: '#E5C558',
  cjs: '#E5C558',
  py: '#58B7A6',
  go: '#6FD3E7',
  rs: '#E08A5A',
  java: '#E06E6E',
  rb: '#E06E9E',
  php: '#9E8FE8',
  css: '#9E7FE8',
  html: '#E88AA0',
  vue: '#5FB87E',
  md: '#8E8EA0',
  mdx: '#8E8EA0',
  json: '#A8B04B',
  yml: '#A8B04B',
  yaml: '#A8B04B',
  toml: '#A8B04B',
  xml: '#A8B04B',
  pdf: '#C4A77D',
  woff: '#8E8EA0',
  woff2: '#8E8EA0',
  ttf: '#8E8EA0',
  otf: '#8E8EA0',
  eot: '#8E8EA0',
  mp4: '#E88AA0',
  webm: '#E88AA0',
  mov: '#E88AA0',
  avi: '#E88AA0',
  mp3: '#C49AE8',
  wav: '#C49AE8',
  ogg: '#C49AE8',
  flac: '#C49AE8',
  zip: '#71717A',
  tar: '#71717A',
  gz: '#71717A',
  '7z': '#71717A',
  rar: '#71717A',
  png: '#6FD3E7',
  jpg: '#6FD3E7',
  jpeg: '#6FD3E7',
  webp: '#6FD3E7',
  gif: '#6FD3E7',
  svg: '#6FD3E7',
  ico: '#6FD3E7',
  scss: '#9E7FE8',
  less: '#9E7FE8',
};

export function extColorOf(name: string): string {
  const i = name.lastIndexOf('.');
  const ext = i < 0 ? '' : name.slice(i + 1).toLowerCase();
  return extTile[ext] ?? '#71717A';
}

export const theme = {
  dark: {
    bg: colors.bg,
    card: colors.card,
    cardHover: colors.cardHover,
    text: colors.text,
    muted: colors.muted,
    subtle: colors.subtle,
    border: colors.border,
    borderHover: colors.borderHover,
    input: colors.input,
    inputBorder: colors.inputBorder,
  },
  light: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    cardHover: '#F4F4F5',
    text: '#18181B',
    muted: '#71717A',
    subtle: '#A1A1AA',
    border: '#E4E4E7',
    borderHover: '#D4D4D8',
    input: '#FFFFFF',
    inputBorder: '#E4E4E7',
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,.2)',
  md: '0 4px 16px rgba(0,0,0,.24)',
  lg: '0 8px 32px rgba(0,0,0,.28)',
  glow: '0 0 0 1px rgba(110,86,207,.25), 0 4px 16px rgba(110,86,207,.25)',
} as const;

export const duration = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.6,
  xslow: 1.0,
} as const;

export const easing = {
  smooth: 'cubic-bezier(.2,.8,.2,1)',
  snap: 'cubic-bezier(.16,1,.3,1)',
  bounce: 'cubic-bezier(.34,1.56,.64,1)',
  linear: 'linear',
} as const;

export const font = {
  sans: 'Geist Sans, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  mono: 'Geist Mono, JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

export const text = {
  xs: '11px',
  sm: '12px',
  base: '13px',
  lg: '15px',
  xl: '18px',
  '2xl': '24px',
} as const;

export const zIndex = {
  canvas: 0,
  hud: 10,
  header: 20,
  inspector: 30,
  modal: 50,
  toast: 60,
} as const;

// 3D 渲染阈值（UI 侧单源，analyzer-core 禁止在客户端被引用）
// 后端如需复用，请从 @briefrepo/tokens 导入
export const RENDER = {
  /** 3D 城市建筑上限（单 DrawCall） */
  cityBuildings: 900,
  /** 城市 district 上限 */
  districts: 24,
  /** 图谱边上限 */
  graphEdges: 400,
  /** 图谱节点上限 */
  graphNodes: 60,
  /** Treemap 上限 */
  treemapFiles: 80,
} as const;

export function cssVariables(themeMode: 'dark' | 'light' = 'dark'): string {
  const t = theme[themeMode];
  return [
    `--bg:${t.bg}`,
    `--card:${t.card}`,
    `--card-hover:${t.cardHover}`,
    `--text:${t.text}`,
    `--muted:${t.muted}`,
    `--subtle:${t.subtle}`,
    `--border:${t.border}`,
    `--border-hover:${t.borderHover}`,
    `--input:${t.input}`,
    `--input-border:${t.inputBorder}`,
    `--primary:${colors.primary[500]}`,
    `--primary-50:${colors.primary[50]}`,
    `--primary-700:${colors.primary[700]}`,
    `--accent:${colors.accent[500]}`,
    `--success:${colors.success}`,
    `--warning:${colors.warning}`,
    `--error:${colors.error}`,
    `--radius-sm:${radius.sm}`,
    `--radius-md:${radius.md}`,
    `--radius-lg:${radius.lg}`,
    `--radius-full:${radius.full}`,
    `--shadow-sm:${shadow.sm}`,
    `--shadow-md:${shadow.md}`,
    `--font-sans:${font.sans}`,
    `--font-mono:${font.mono}`,
  ].join(';') + ';';
}
