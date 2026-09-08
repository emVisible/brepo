// 文件过滤规则单源（引擎标记 + 前端徽标/开关共用同一语义）。
// 被过滤的文件保留在 fileTree/左树中（打标展示），只排除出 treemap/City/依赖图等分析视图。

export type FilterId = 'test' | 'generated' | 'text' | 'media';

export interface FilterRule {
  id: FilterId;
  /** 左树徽标与开关文案（中英由调用方按 lang 取） */
  labelZh: string;
  labelEn: string;
  /** 默认是否排除出分析视图（左树始终展示） */
  defaultOn: boolean;
}

export const FILTER_RULES: FilterRule[] = [
  { id: 'test', labelZh: '测试', labelEn: 'tests', defaultOn: true },
  { id: 'generated', labelZh: '生成物', labelEn: 'generated', defaultOn: true },
  { id: 'text', labelZh: '文本', labelEn: 'text', defaultOn: false },
  { id: 'media', labelZh: '资源', labelEn: 'assets', defaultOn: true },
];

export const DEFAULT_EXCLUDE: FilterId[] = FILTER_RULES.filter((r) => r.defaultOn).map((r) => r.id);

const TEST_DIRS = new Set(['__tests__', '__test__', 'test', 'tests', 'spec', 'specs', 'e2e', 'testing', '__snapshots__']);

/** 命中返回规则 id（首个命中优先：test > generated > text > media），否则 null */
export function matchFilter(relativePath: string): FilterId | null {
  const rel = relativePath.replace(/\\/g, '/');
  const segs = rel.split('/');
  const name = segs[segs.length - 1] ?? '';
  const lower = name.toLowerCase();

  if (segs.slice(0, -1).some((s) => TEST_DIRS.has(s.toLowerCase()))) return 'test';
  if (/[._-]test\.[^.]+$/.test(lower) || /^test_[^.]*\.[^.]+$/.test(lower) || /\.spec\.[^.]+$/.test(lower)) return 'test';
  if (/\.min\.(js|css)$/.test(lower) || /\.bundle\.(js|css)$/.test(lower) || /\.generated\.[^.]+$/.test(lower)) return 'generated';
  if (lower.endsWith('.txt')) return 'text';

  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : '';
  if (MEDIA_EXTS.has(ext)) return 'media';
  return null;
}

// 与 scanner 历史忽略集同源的资源扩展名（图片/字体/音视频/压缩包/文档二进制）
const MEDIA_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg', 'flac',
  'zip', 'tar', 'gz', '7z', 'rar', 'pdf', 'map',
]);
