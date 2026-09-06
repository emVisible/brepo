import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { DependencyEdge } from '@briefrepo/types';
import { IMPORTS } from '../constants.js';

const JS_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte']);
const PY_EXTS = new Set(['.py']);
const GO_EXTS = new Set(['.go']);

const JS_IMPORT =
  '(?:import\\s+(?:type\\s+)?(?:[\\w*{}\\n, ]+\\s+from\\s+)?[\'"]([^\'"]+)[\'"]|require\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\)|import\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\))';

export async function parseDependencyGraph(
  root: string,
  allFiles: string[],
  fileContents?: Map<string, string>,
): Promise<DependencyEdge[]> {
  const edges: DependencyEdge[] = [];
  const jsCandidates = allFiles.filter((p) => JS_EXTS.has(extname(p).toLowerCase()));
  const pyCandidates = allFiles.filter((p) => PY_EXTS.has(extname(p).toLowerCase()));
  const goCandidates = allFiles.filter((p) => GO_EXTS.has(extname(p).toLowerCase()));

  const candidates: Array<{ rel: string; kind: 'js' | 'py' | 'go' }> = [
    ...jsCandidates.slice(0, IMPORTS.jsLimit).map((rel) => ({ rel, kind: 'js' as const })),
    ...pyCandidates.slice(0, IMPORTS.pyLimit).map((rel) => ({ rel, kind: 'py' as const })),
    ...goCandidates.slice(0, IMPORTS.goLimit).map((rel) => ({ rel, kind: 'go' as const })),
  ];

  const limit = IMPORTS.batch;
  let idx = 0;
  const runBatch = async (): Promise<void> => {
    const batch = candidates.slice(idx, idx + limit);
    idx += limit;
    if (batch.length === 0) return;
    await Promise.all(
      batch.map(async ({ rel, kind }) => {
        let content: string | undefined = fileContents?.get(rel);
        if (content === undefined) {
          try {
            content = await readFile(join(root, rel), 'utf-8');
          } catch {
            return;
          }
        }
        if (content.length > IMPORTS.maxContentLen) return;

        if (kind === 'js') {
          if (!content.includes('import') && !content.includes('require') && !content.includes('from')) return;
          const re = new RegExp(JS_IMPORT, 'g');
          let m: RegExpExecArray | null;
          while ((m = re.exec(content)) !== null) {
            const spec = (m[1] ?? m[2] ?? m[3] ?? '').trim();
            if (!spec || spec.length > IMPORTS.maxSpecLen) continue;
            if (spec.startsWith('.') && spec.length < 3) continue;
            const type: DependencyEdge['type'] = m[2] ? 'require' : 'import';
            edges.push({ from: rel, to: spec, type });
          }
        } else if (kind === 'py') {
          const lines = content.split('\n').slice(0, IMPORTS.pyMaxLines);
          for (const line of lines) {
            const m = line.match(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/);
            if (!m) continue;
            const raw = (m[1] ?? m[2] ?? '').split(',')[0]?.trim() ?? '';
            if (!raw || raw.length > IMPORTS.pySpecLen) continue;
            edges.push({ from: rel, to: raw, type: 'import' });
          }
        } else if (kind === 'go') {
          const re = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(content)) !== null) {
            const block = m[1] ?? m[2] ?? '';
            const specs = block
              .split('\n')
              .map((s) => s.trim().replace(/^"|"$/g, '').split(' ')[0]?.replace(/"/g, '').trim() ?? '')
              .filter(Boolean);
            for (const s of specs.length ? specs : [block.replace(/"/g, '').trim()].filter(Boolean)) {
              if (!s || s.length > IMPORTS.maxSpecLen) continue;
              edges.push({ from: rel, to: s, type: 'import' });
            }
          }
        }
      }),
    );
    if (idx < candidates.length) await runBatch();
  };
  await runBatch();

  const seen = new Set<string>();
  const dedup = edges.filter((e) => {
    const k = `${e.from}→${e.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  dedup.sort((a, b) => {
    const aInternal = a.to.startsWith('.') ? 1 : 0;
    const bInternal = b.to.startsWith('.') ? 1 : 0;
    if (aInternal !== bInternal) return bInternal - aInternal;
    return a.from.localeCompare(b.from);
  });

  return dedup.slice(0, IMPORTS.maxEdges);
}
