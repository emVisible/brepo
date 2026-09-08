import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { JobRegistry, JobCancelledError, JobTimeoutError, type WorkerLike } from './jobs.js';

class FakeWorker extends EventEmitter implements WorkerLike {
  terminated = false;
  constructor(public onSpawn?: (w: FakeWorker) => void) {
    super();
    onSpawn?.(this);
  }
  postMessage(): void {}
  async terminate(): Promise<number> {
    this.terminated = true;
    return 0;
  }
  emitMsg(m: unknown): void {
    this.emit('message', m);
  }
}

const spec = { target: '/tmp/x', opts: {} };

describe('JobRegistry', () => {
  it('按序转发事件并 resolve done 结果', async () => {
    let worker!: FakeWorker;
    const reg = new JobRegistry(
      () => '/fake/entry.js',
      () => (worker = new FakeWorker()),
    );
    const events: string[] = [];
    const { jobId, done } = reg.run(spec, { onEvent: (e) => events.push(`${e.pct}`) });
    expect(typeof jobId).toBe('string');
    worker.emitMsg({ type: 'event', event: { phase: 'scan', pct: 18 } });
    worker.emitMsg({ type: 'event', event: { phase: 'git', pct: 38 } });
    worker.emitMsg({ type: 'done', result: { ok: true } });
    await expect(done).resolves.toEqual({ ok: true });
    expect(events).toEqual(['18', '38']);
    expect(reg.size).toBe(0);
  });

  it('worker 发 error 时 reject 并清理', async () => {
    const cleaned: string[] = [];
    const reg = new JobRegistry(
      () => '/fake/entry.js',
      () =>
        new FakeWorker((w) => {
          queueMicrotask(() => w.emitMsg({ type: 'error', error: 'boom' }));
        }),
    );
    const { done } = reg.run(spec, { cleanup: async () => void cleaned.push('x') });
    await expect(done).rejects.toThrow('boom');
    expect(cleaned).toEqual(['x']);
    expect(reg.size).toBe(0);
  });

  it('超时 terminate 并报 JobTimeoutError', async () => {
    let worker!: FakeWorker;
    const reg = new JobRegistry(
      () => '/fake/entry.js',
      () => (worker = new FakeWorker()),
    );
    const { done } = reg.run(spec, { timeoutMs: 30 });
    await expect(done).rejects.toBeInstanceOf(JobTimeoutError);
    expect(worker.terminated).toBe(true);
    expect(reg.size).toBe(0);
  });

  it('cancel 真杀 worker 并跑清理', async () => {
    let worker!: FakeWorker;
    const reg = new JobRegistry(
      () => '/fake/entry.js',
      () => (worker = new FakeWorker()),
    );
    const cleaned: string[] = [];
    const { jobId } = reg.run(spec, { cleanup: async () => void cleaned.push('x'), timeoutMs: 60000 });
    expect(await reg.cancel(jobId)).toBe(true);
    // 关键断言是 terminate + 清理 + 注销（调用方已走开，done 保持 pending 是预期的）
    expect(worker.terminated).toBe(true);
    expect(cleaned).toEqual(['x']);
    expect(reg.size).toBe(0);
  });

  it('重复 cancel 返回 false', async () => {
    const reg = new JobRegistry(
      () => '/fake/entry.js',
      () => new FakeWorker(),
    );
    const { jobId } = reg.run(spec, { timeoutMs: 60000 });
    expect(await reg.cancel(jobId)).toBe(true);
    expect(await reg.cancel(jobId)).toBe(false);
  });
});
