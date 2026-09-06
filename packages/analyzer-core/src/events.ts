import type { AnalyzerEvent } from '@briefrepo/types';

export type EventSink = (ev: AnalyzerEvent) => void;

export function createEventCollector(): { sink: EventSink; events: AnalyzerEvent[] } {
  const events: AnalyzerEvent[] = [];
  const sink: EventSink = (ev) => events.push(ev);
  return { sink, events };
}

export function emit(sink: EventSink | undefined, phase: AnalyzerEvent['phase'], step: string, pct: number, msg: string, meta?: Record<string, unknown>, level: AnalyzerEvent['level'] = 'info'): void {
  if (!sink) return;
  sink({ phase, step, pct, msg, level, ts: new Date().toISOString(), meta });
}
