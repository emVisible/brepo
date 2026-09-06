// GitHub URL → tarball（替代 serve.ts 的 git clone，适配 Vercel 无 git）
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

function parseGithub(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!m) return null;
  return { owner: m[1]!, repo: m[2]! };
}

export async function fetchTarballIfGithub(rawPath: string): Promise<{ target: string; tmpCloned: boolean }> {
  if (!/^https?:\/\//.test(rawPath)) return { target: rawPath, tmpCloned: false };
  const parsed = parseGithub(rawPath);
  if (!parsed) throw new Error('仅支持 github.com URL 或本地路径');
  const { owner, repo } = parsed;
  const tmpRoot = await mkdtemp(join(tmpdir(), `brepo-${owner}-${repo}-`));
  const tarPath = join(tmpRoot, 'repo.tar.gz');
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/HEAD`;

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`下载失败: ${res.status} ${url}`);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(tarPath));

  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);
  const outDir = join(tmpRoot, 'src');
  await mkdir(outDir, { recursive: true });
  // tar -xzf 到 outDir，strip 1 层顶目录
  await execFileAsync('tar', ['-xzf', tarPath, '-C', outDir, '--strip-components=1']);

  return { target: outDir, tmpCloned: true };
}
