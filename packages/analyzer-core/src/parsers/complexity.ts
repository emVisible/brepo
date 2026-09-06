import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { COMPLEXITY } from '../constants.js';

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go']);

export interface FileStats {
  functions: number;
  classes: number;
  branches: number;
  perFile?: Array<{ path: string; functions: number; branches: number }>;
}

const FUNC_RE = /\b(?:function\s+\w*|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|=>|\bclass\s+\w+|\bdef\s+\w+\s*\(|\bfunc\s+\w*\s*\()/g;
const CLASS_RE = /\bclass\s+\w+/g;
const BRANCH_RE = /\b(?:if|for|while|switch|case|catch|elif|when)\b|&&|\|\||\?/g;

export async function analyzeComplexity(root: string, allFiles: string[], fileContents?: Map<string, string>): Promise<FileStats> {
  const candidates = allFiles.filter((p) => CODE_EXTS.has(extname(p).toLowerCase())).slice(0, COMPLEXITY.fileLimit);

  const batchSize = COMPLEXITY.batchSize;
  let functions = 0;
  let classes = 0;
  let branches = 0;
  const perFile: Array<{ path: string; functions: number; branches: number }> = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (rel): Promise<{ f: number; c: number; b: number }> => {
        let content = fileContents?.get(rel);
        if (content === undefined) {
          try {
            content = await readFile(join(root, rel), 'utf-8');
          } catch {
            return { f: 0, c: 0, b: 0 };
          }
        }
        if (content.length > COMPLEXITY.maxContentLen) {
          const sample = content.slice(0, COMPLEXITY.maxContentLen);
          const f = (sample.match(FUNC_RE) ?? []).length;
          const c = (sample.match(CLASS_RE) ?? []).length;
          const b = (sample.match(BRANCH_RE) ?? []).length;
          return { f, c, b };
        }
        const f = (content.match(FUNC_RE) ?? []).length;
        const c = (content.match(CLASS_RE) ?? []).length;
        const b = (content.match(BRANCH_RE) ?? []).length;
        if (f + b > 0) perFile.push({ path: rel, functions: f, branches: b });
        return { f, c, b };
      }),
    );
    for (const r of results) {
      functions += r.f;
      classes += r.c;
      branches += r.b;
    }
  }

  perFile.sort((a, b) => b.branches + b.functions * 2 - (a.branches + a.functions * 2));
  return { functions, classes, branches, perFile: perFile.slice(0, COMPLEXITY.topFiles) };
}
