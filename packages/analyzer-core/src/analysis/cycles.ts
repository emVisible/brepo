import type { DependencyEdge, CycleInfo } from '@briefrepo/types';
import { CYCLES } from '../constants.js';

export function detectCycles(edges: DependencyEdge[]): CycleInfo[] {
  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();
  for (const e of edges) {
    if (e.to.startsWith('.')) {
      nodes.add(e.from);
      nodes.add(e.to);
      const arr = adj.get(e.from) ?? [];
      arr.push(e.to);
      adj.set(e.from, arr);
    }
  }
  if (nodes.size === 0) return [];

  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: CycleInfo[] = [];
  let idx = 0;

  const strongconnect = (v: string) => {
    index.set(v, idx);
    low.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }

    if (low.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (w) {
          onStack.delete(w);
          scc.push(w);
        }
      } while (w !== v && w !== undefined);
      if (scc.length > 1) {
        const severity: CycleInfo['severity'] = scc.length > 4 ? 'high' : scc.length > 2 ? 'medium' : 'low';
        cycles.push({ members: scc, length: scc.length, severity });
      } else if (scc.length === 1) {
        const selfLoop = (adj.get(v) ?? []).includes(v);
        if (selfLoop) cycles.push({ members: scc, length: 1, severity: 'low' });
      }
    }
  };

  for (const n of nodes) if (!index.has(n)) strongconnect(n);

  return cycles.slice(0, CYCLES.max);
}
