import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const README_CANDIDATES = ['README.md', 'README.MD', 'readme.md', 'Readme.md', 'README.mdx'];

export interface ReadmeResult {
  hasReadme: boolean;
  content: string;
  summary: string;
}

export async function extractReadme(root: string): Promise<ReadmeResult> {
  let content = '';
  let hasReadme = false;

  for (const name of README_CANDIDATES) {
    try {
      content = await readFile(join(root, name), 'utf-8');
      hasReadme = true;
      break;
    } catch {
      // try next
    }
  }

  if (!hasReadme) {
    // try case-insensitive scan top level
    try {
      const entries = await readdir(root);
      const found = entries.find((e: string) => e.toLowerCase() === 'readme.md' || e.toLowerCase() === 'readme.mdx');
      if (found) {
        content = await readFile(join(root, found), 'utf-8');
        hasReadme = true;
      }
    } catch {
      // ignore
    }
  }

  const summary = hasReadme ? content.slice(0, 2000) : '';
  return { hasReadme, content, summary };
}
