// @briefrepo/analyzer-core — 阈值单源（企业级收敛）
// 所有魔法数集中于此，禁止在 parsers/analysis 内硬编码

export const SCAN = {
  /** fs 并发上限 */
  concurrency: 64,
  /** 目录最大深度 */
  maxDepth: 14,
  /** 相对路径最大长度 */
  maxPathLen: 180,
  /** fileContents LRU 上限 */
  contentsLimit: 800,
  /** fileContents 单文件上限（字节） */
  contentsMaxSize: 80_000,
  /** 大文件估算阈值（字节，超此按 size/80 估行） */
  largeFileSize: 500_000,
  /** 行估算除数 */
  linesPerByte: 80,
  /** 白名单非常规文件内容读取上限（字节，超此按 KB 折算，不读） */
  extraContentMax: 262_144,
  /** 二进制嗅探字节数（只读头部判定，不读全文） */
  sniffBytes: 4096,
} as const;

export const IMPORTS = {
  jsLimit: 900,
  pyLimit: 200,
  goLimit: 200,
  /** 批处理并发 */
  batch: 48,
  /** 单文件最大解析长度 */
  maxContentLen: 120_000,
  /** py 最大行数 */
  pyMaxLines: 800,
  /** spec 最大长度 */
  maxSpecLen: 160,
  jsSpecLen: 160,
  pySpecLen: 120,
  /** 最终边上限 */
  maxEdges: 600,
} as const;

export const COMPLEXITY = {
  fileLimit: 900,
  batchSize: 64,
  maxContentLen: 120_000,
  topFiles: 20,
} as const;

export const HOTSPOTS = {
  scanLimit: 800,
  top: 12,
  minScore: 12,
  deadLimit: 16,
} as const;

export const CYCLES = {
  max: 8,
} as const;

// RENDER 已迁移至 @briefrepo/tokens（避免客户端引用 analyzer-core 拉起 node:fs）
// 此处 re-export 供后端兼容，客户端禁止从此文件导入
export { RENDER } from '@briefrepo/tokens';
