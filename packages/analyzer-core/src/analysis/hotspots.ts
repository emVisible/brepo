import type { Hotspot, DependencyEdge } from '@briefrepo/types';
import { HOTSPOTS } from '../constants.js';

export function computeHotspots(opts: {
  dependencyGraph: DependencyEdge[];
  allFiles: string[];
  perFileComplexity?: Array<{ path: string; functions: number; branches: number }>;
  churn?: Map<string, number>;
}): Hotspot[] {
  const { dependencyGraph, allFiles, perFileComplexity, churn } = opts;

  const dependents = new Map<string, number>();
  const dependencies = new Map<string, number>();
  for (const e of dependencyGraph) {
    dependencies.set(e.from, (dependencies.get(e.from) ?? 0) + 1);
    dependents.set(e.to, (dependents.get(e.to) ?? 0) + 1);
  }

  const complexityMap = new Map<string, number>();
  for (const f of perFileComplexity ?? []) complexityMap.set(f.path, f.branches + f.functions * 2);

  const scores: Hotspot[] = [];
  for (const file of allFiles.slice(0, HOTSPOTS.scanLimit)) {
    const depCount = dependencies.get(file) ?? 0;
    const depdCount = dependents.get(file) ?? 0;
    const comp = complexityMap.get(file) ?? 0;
    const ch = churn?.get(file) ?? 0;
    const score = Math.min(100, Math.round(depdCount * 6 + depCount * 2 + comp * 0.6 + ch * 8));
    if (score < HOTSPOTS.minScore) continue;
    const reasons: string[] = [];
    if (depdCount > 5) reasons.push(`${depdCount} 个入度`);
    if (depCount > 8) reasons.push(`${depCount} 个出度`);
    if (comp > 18) reasons.push(`复杂度 ${comp}`);
    if (ch > 2) reasons.push(`近90天 ${ch} 次变更`);
    if (reasons.length === 0) reasons.push('中心节点');
    scores.push({ path: file, score, reasons: reasons.slice(0, 2), dependents: depdCount, dependencies: depCount });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, HOTSPOTS.top);
}

export function findDeadFiles(allFiles: string[], dependencyGraph: DependencyEdge[], entryFiles: string[]): string[] {
  const hasIncoming = new Set<string>();
  for (const e of dependencyGraph) hasIncoming.add(e.to);
  const entrySet = new Set(entryFiles);
  const dead: string[] = [];
  for (const f of allFiles) {
    if (f.includes('.test.') || f.includes('__tests__') || f.endsWith('.spec.ts')) continue;
    if (entrySet.has(f)) continue;
    if (!hasIncoming.has(f)) {
      const base = f.split('/').pop() ?? f;
      if (['index.ts', 'main.ts', 'app.ts'].includes(base)) continue;
      dead.push(f);
    }
  }
  return dead.slice(0, HOTSPOTS.deadLimit);
}
