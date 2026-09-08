import { Worker } from 'node:worker_threads';
import type { AnalysisResult, AnalyzerEvent } from '@briefrepo/types';

// 分析任务注册表：每个任务跑在独立 worker 线程里，取消/超时即 terminate 真杀。
// 设计取舍（见 plan）：单任务单 worker（而非线程池），因为首要目标是隔离与可杀，
// 速度靠 P0 的 I/O 削减；worker 内仍保持原有并发。

export interface JobSpec {
  target: string;
  opts: {
    includeExts?: string[];
    gitHub?: { owner: string; repo: string };
    /** 临时下载目录每次都是全新解压，缓存必 miss，直接跳过哈希与落盘 */
    useCache?: boolean;
  };
}

export type JobMessage =
  | { type: 'event'; event: AnalyzerEvent }
  | { type: 'done'; result: AnalysisResult }
  | { type: 'error'; error: string };

export interface JobCallbacks {
  onEvent?: (e: AnalyzerEvent) => void;
  /** 任务结束（成功/失败/取消/超时）后的清理，如删 tarball 临时目录 */
  cleanup?: () => Promise<void>;
  /** 单任务超时，默认 10 分钟（Vercel 侧另有 60s 平台上限） */
  timeoutMs?: number;
}

export interface WorkerLike {
  on(event: 'message' | 'error' | 'exit', cb: (arg: unknown) => void): void;
  postMessage(msg: unknown): void;
  terminate(): Promise<number>;
}

export type WorkerFactory = (entry: string, spec: JobSpec) => WorkerLike;

export class JobCancelledError extends Error {
  constructor(public jobId: string) {
    super(`任务已取消: ${jobId}`);
    this.name = 'JobCancelledError';
  }
}

export class JobTimeoutError extends Error {
  constructor(
    public jobId: string,
    public timeoutMs: number,
  ) {
    super(`任务超时（${Math.round(timeoutMs / 1000)}s）已终止: ${jobId}`);
    this.name = 'JobTimeoutError';
  }
}

interface JobRecord {
  worker: WorkerLike;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
  cleanup?: () => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
let seq = 0;

export class JobRegistry {
  private jobs = new Map<string, JobRecord>();
  constructor(
    private resolveEntry: () => string,
    private factory: WorkerFactory = (entry, spec) =>
      new Worker(entry, { workerData: spec }) as unknown as WorkerLike,
  ) {}

  get size(): number {
    return this.jobs.size;
  }

  run(spec: JobSpec, cb: JobCallbacks = {}): { jobId: string; done: Promise<AnalysisResult> } {
    const jobId = `job-${Date.now().toString(36)}-${seq++}`;
    const timeoutMs = cb.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let record!: JobRecord;
    const done = new Promise<AnalysisResult>((resolve, reject) => {
      const finish = async (fn: () => void) => {
        if (record.settled) return;
        record.settled = true;
        clearTimeout(record.timer);
        this.jobs.delete(jobId);
        try {
          await record.cleanup?.();
        } catch {
          // 清理失败不掩盖主结果
        }
        fn();
      };
      let worker: WorkerLike;
      try {
        worker = this.factory(this.resolveEntry(), spec);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      const timer = setTimeout(() => {
        void worker.terminate().catch(() => {});
        void finish(() => reject(new JobTimeoutError(jobId, timeoutMs)));
      }, timeoutMs);
      // 给 timer 一个兜底 unref，避免测试/短命进程被挂起（Node 环境才有 unref）
      (timer as unknown as { unref?: () => void }).unref?.();
      record = { worker, timer, settled: false, cleanup: cb.cleanup };
      this.jobs.set(jobId, record);
      worker.on('message', (m) => {
        const msg = m as JobMessage;
        if (msg.type === 'event') cb.onEvent?.(msg.event);
        else if (msg.type === 'done') void finish(() => resolve(msg.result));
        else if (msg.type === 'error') void finish(() => reject(new Error(msg.error)));
      });
      worker.on('error', (e) => {
        void finish(() => reject(e instanceof Error ? e : new Error(String(e))));
      });
      worker.on('exit', (code) => {
        // 正常 done/error 已 settled；此处只处理“未发消息就退出”（如被外部 kill）
        void finish(() => reject(new Error(`worker 异常退出 (code=${String(code)})`)));
      });
    });
    // 避免未处理的 rejection 在调用方尚未订阅时 noisy（调用方仍会收到）
    done.catch(() => {});
    return { jobId, done };
  }

  async cancel(jobId: string): Promise<boolean> {
    const record = this.jobs.get(jobId);
    if (!record || record.settled) return false;
    record.settled = true;
    clearTimeout(record.timer);
    this.jobs.delete(jobId);
    try {
      await record.worker.terminate();
    } catch {
      // ignore
    }
    try {
      await record.cleanup?.();
    } catch {
      // ignore
    }
    return true;
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.jobs.keys()].map((id) => this.cancel(id)));
  }
}
