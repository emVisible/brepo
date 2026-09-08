import type { ProjectKind, ProjectFeatures, ProjectContext } from './project.js';

export interface BasicAnalysis {
  kind: ProjectKind;
  confidence: number;
  level: 'high' | 'medium' | 'low';
  reasons: string[];
  features: ProjectFeatures;
  scores: {
    product: number;
    library: number;
  };
  disclaimer: string;
}

export interface Level0Result {
  projectName: string;
  description: string;
  fileCount: number;
  totalLines: number;
  /** 含已过滤的总数（左树真实总数） */
  fileCountAll?: number;
  totalLinesAll?: number;
  filteredCount?: number;
  filteredBy?: Record<string, number>;
  languages: Record<string, number>;
  primaryLanguage?: string;
  techStack: string[];
  dependencies: string[];
  git: ProjectContext['git'];
}

export interface Level1Result {
  entryFiles: string[];
  coreModules: string[];
  dependencyGraph: DependencyEdge[];
  complexity: CodeComplexity;
  hotspots?: Hotspot[];
  cycles?: CycleInfo[];
  health?: HealthScore;
  deadFiles?: string[];
  layers?: LayerViolation[];
}

export interface Hotspot {
  path: string;
  score: number;
  reasons: string[];
  dependents?: number;
  dependencies?: number;
}

export interface CycleInfo {
  members: string[];
  length: number;
  severity: 'high' | 'medium' | 'low';
}

export interface HealthScore {
  score: number;
  breakdown: {
    complexity: number;
    structure: number;
    coupling: number;
    tests: number;
    freshness: number;
  };
  label: 'healthy' | 'warning' | 'critical';
}

export interface LayerViolation {
  from: string;
  to: string;
  rule: string;
}

export interface AnalyzerEvent {
  phase: 'scan' | 'tech' | 'git' | 'graph' | 'health' | 'inference' | 'render' | 'done' | 'error';
  step: string;
  pct: number;
  msg: string;
  level: 'info' | 'warn' | 'error';
  ts: string;
  meta?: Record<string, unknown>;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'require' | 'unknown';
}

export interface CodeComplexity {
  totalFiles: number;
  averageLinesPerFile: number;
  maxDepth: number;
  hasTests: boolean;
  functions?: number;
  classes?: number;
  branches?: number;
}

export interface KeyFile {
  path: string;
  reason: string;
  priority: number;
}

export interface OnboardingTask {
  day: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AnalysisResult {
  context: ProjectContext;
  level0: Level0Result;
  level1: Level1Result;
  basicInference: BasicAnalysis;
  keyFiles: KeyFile[];
  onboardingTasks: OnboardingTask[];
  generatedAt: string;
  durationMs: number;
  events?: AnalyzerEvent[];
}
