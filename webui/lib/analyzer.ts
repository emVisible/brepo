// 服务端薄封装：直接复用 analyzer-core（零重写）
// 仅在 Route Handlers（nodejs runtime）中引用，禁止客户端导入
import { analyzeProject as coreAnalyze } from '@briefrepo/analyzer-core';
import type { AnalysisResult } from '@briefrepo/types';

export async function analyzeLocal(
  target: string,
  opts: {
    includeExts?: string[];
    onEvent?: (e: { phase: string; msg: string; pct: number; level: string }) => void;
  },
): Promise<AnalysisResult> {
  return coreAnalyze(target, {
    includeExts: opts.includeExts,
    onEvent: opts.onEvent as never,
  } as never) as Promise<AnalysisResult>;
}
