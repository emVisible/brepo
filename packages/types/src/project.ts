import type { FilterId } from './filters.js';

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
  /** 有效文件（排除已过滤的测试/生成物/资源） */
  fileCount: number;
  totalLines: number;
  /** 含已过滤的总数，用于左树“全部文件”真实总数 */
  fileCountAll?: number;
  totalLinesAll?: number;
  filteredCount?: number;
  filteredBy?: Record<string, number>;
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
  /** 数据来源：本地仓库 vs GitHub API（压缩包场景）；缺省视为 local */
  source?: 'local' | 'github-api';
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lineCount?: number;
  /** 命中过滤规则（左树打标、treemap/City 默认隐藏的依据）；未命中为 undefined */
  filtered?: FilterId;
}
