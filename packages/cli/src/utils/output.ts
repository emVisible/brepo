import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AnalysisResult } from '@briefrepo/types';
import { renderHtml, renderMarkdown } from '@briefrepo/web-reporter';

export async function writeJsonReport(result: AnalysisResult, outPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
}

export async function writeHtmlReport(result: AnalysisResult, outPath: string): Promise<void> {
  const html = renderHtml(result);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf-8');
}

export async function writeMarkdownReport(result: AnalysisResult, outPath: string): Promise<void> {
  const md = renderMarkdown(result);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, md, 'utf-8');
}

export { renderHtml, renderMarkdown } from '@briefrepo/web-reporter';
