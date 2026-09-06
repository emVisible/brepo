import type { HealthScore, CycleInfo, DependencyEdge } from '@briefrepo/types';

export function computeHealth(opts: {
  fileCount: number;
  totalLines: number;
  dependencyGraph: DependencyEdge[];
  functions: number;
  branches: number;
  cycles: CycleInfo[];
  hasTests: boolean;
  recentActivity: number;
}): HealthScore {
  const { fileCount, totalLines, dependencyGraph, functions, branches, cycles, hasTests, recentActivity } = opts;

  const avgLines = fileCount ? totalLines / fileCount : 0;
  const complexityScore = Math.max(0, 100 - Math.min(60, (branches / Math.max(functions, 1)) * 12) - Math.min(30, avgLines / 8));
  const coupling = dependencyGraph.length;
  const couplingScore = Math.max(0, 100 - Math.min(50, coupling / 8) - cycles.length * 12);
  const structureScore = Math.max(0, 100 - cycles.length * 18 - Math.min(30, fileCount / 120));
  const testsScore = hasTests ? 85 : 45;
  const freshnessScore = recentActivity > 10 ? 90 : recentActivity > 3 ? 70 : recentActivity > 0 ? 55 : 35;

  const score = Math.round(complexityScore * 0.3 + couplingScore * 0.25 + structureScore * 0.2 + testsScore * 0.15 + freshnessScore * 0.1);
  const label: HealthScore['label'] = score >= 75 ? 'healthy' : score >= 50 ? 'warning' : 'critical';

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: {
      complexity: Math.round(complexityScore),
      structure: Math.round(structureScore),
      coupling: Math.round(couplingScore),
      tests: Math.round(testsScore),
      freshness: Math.round(freshnessScore),
    },
    label,
  };
}
