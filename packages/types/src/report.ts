import type { AnalysisResult } from './analysis.js';

export type ReportData = AnalysisResult & {
  title: string;
  oneLiner: string;
};

export type { KeyFile, OnboardingTask } from './analysis.js';
