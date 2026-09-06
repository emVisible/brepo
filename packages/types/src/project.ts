export type ProjectKind =
  | 'product'
  | 'library'
  | 'documentation'
  | 'experimental'
  | 'tutorial'
  | 'other'
  | 'hybrid'
  | 'platform';

export interface ProjectFeatures {
  hasUI: boolean;
  hasCLI: boolean;
  hasDesktopApp: boolean;
  hasMobileApp: boolean;
  hasUserGuide: boolean;
  hasAPIDocs: boolean;
  hasScreenshots: boolean;
  hasDemo: boolean;
  hasHomepage: boolean;
  hasPricing: boolean;
  hasDownload: boolean;
  hasTests: boolean;
  isFramework: boolean;
  isLibrary: boolean;
  isPlatform: boolean;
  docRatio: number;
  tutorialHint: boolean;
  experimentalHint: boolean;
}

export interface ProjectContext {
  name: string;
  description: string;
  repoUrl?: string;
  absolutePath: string;
  fileCount: number;
  totalLines: number;
  docFileCount: number;
  languages: Record<string, number>;
  primaryLanguage?: string;
  techStack: string[];
  frameworks: string[];
  dependencies: string[];
  devDependencies: string[];
  hasReadme: boolean;
  readmeContent: string;
  readmeSummary: string;
  packageJson?: Record<string, unknown>;
  git: GitInfo;
  fileTree: FileNode[];
  topLevelFiles: string[];
  features: ProjectFeatures;
}

export interface GitInfo {
  isGitRepo: boolean;
  totalCommits: number;
  contributors: number;
  contributorList: string[];
  lastCommitDate?: string;
  firstCommitDate?: string;
  recentActivity: number;
  hasRemote: boolean;
  remoteUrl?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lineCount?: number;
}
