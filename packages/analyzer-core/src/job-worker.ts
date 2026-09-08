// 分析任务 worker 入口（node:worker_threads 运行，非 SSR/浏览器）。
// 由 JobRegistry spawn；与 analyzer.ts 同构，事件经 parentPort 转发。
// 注意：本文件必须能被 tsc 独立编译进 dist（路由按文件路径加载，不经过打包器）。
import { parentPort, workerData } from 'node:worker_threads';
import { analyzeProject } from './analyzer.js';
import type { AnalyzerEvent } from '@briefrepo/types';

interface Spec {
  target: string;
  opts: {
    includeExts?: string[];
    gitHub?: { owner: string; repo: string };
    useCache?: boolean;
  };
}

async function main(): Promise<void> {
  const spec = workerData as Spec;
  const post = (m: unknown): void => {
    parentPort?.postMessage(m);
  };
  try {
    const result = await analyzeProject(spec.target, {
      includeExts: spec.opts.includeExts,
      gitHub: spec.opts.gitHub,
      useCache: spec.opts.useCache,
      onEvent: (e: AnalyzerEvent) => post({ type: 'event', event: e }),
    });
    post({ type: 'done', result });
  } catch (e) {
    post({ type: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

void main();
