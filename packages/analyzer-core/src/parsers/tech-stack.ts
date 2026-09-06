import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface TechStackResult {
  techStack: string[];
  frameworks: string[];
  dependencies: string[];
  devDependencies: string[];
  packageJson?: Record<string, unknown>;
}

const FRAMEWORK_HINTS: Record<string, string[]> = {
  React: ['react', 'next', 'gatsby', 'remix'],
  Vue: ['vue', 'nuxt'],
  Angular: ['@angular/core'],
  Svelte: ['svelte'],
  Electron: ['electron'],
  'React Native': ['react-native'],
  Flutter: ['flutter'],
  Express: ['express'],
  Fastify: ['fastify'],
  NestJS: ['@nestjs/core'],
  Django: ['django'],
  Flask: ['flask'],
  Rails: ['rails'],
  Spring: ['spring-boot'],
  Three: ['three', '@react-three/fiber'],
  Zustand: ['zustand'],
  Tailwind: ['tailwindcss'],
  Vite: ['vite'],
  Turborepo: ['turbo'],
};

function detectFrameworks(deps: string[]): string[] {
  const frameworks: string[] = [];
  const lower = deps.map((d) => d.toLowerCase());
  for (const [name, hints] of Object.entries(FRAMEWORK_HINTS)) {
    if (hints.some((h) => lower.includes(h.toLowerCase()))) frameworks.push(name);
  }
  return frameworks;
}

export async function parseTechStack(root: string): Promise<TechStackResult> {
  const deps: string[] = [];
  const devDeps: string[] = [];
  let packageJson: Record<string, unknown> | undefined;

  try {
    const raw = await readFile(join(root, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    packageJson = pkg;
    const d = pkg['dependencies'] as Record<string, string> | undefined;
    const dd = pkg['devDependencies'] as Record<string, string> | undefined;
    if (d) deps.push(...Object.keys(d));
    if (dd) devDeps.push(...Object.keys(dd));
  } catch {
    // not a node project
  }

  // pnpm-workspace.yaml
  try {
    const raw = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf-8');
    if (raw.includes('packages')) deps.push('pnpm-workspace');
  } catch {}

  // scan top-level for framework hints
  try {
    const entries = await readdir(root);
    if (entries.includes('vite.config.ts') || entries.includes('vite.config.js')) deps.push('vite');
    if (entries.includes('turbo.json')) deps.push('turbo');
    if (entries.includes('Dockerfile')) deps.push('docker');
    if (entries.includes('docker-compose.yml')) deps.push('docker-compose');
    if (entries.includes('.github')) deps.push('github-actions');
  } catch {}

  try {
    const raw = await readFile(join(root, 'requirements.txt'), 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const name = trimmed.split(/[=<> ]/)[0]?.trim();
      if (name) deps.push(name);
    }
  } catch {}

  try {
    const raw = await readFile(join(root, 'Cargo.toml'), 'utf-8');
    if (raw.includes('[dependencies]')) deps.push('rust');
  } catch {}

  try {
    await readFile(join(root, 'go.mod'), 'utf-8');
    deps.push('go');
  } catch {}

  try {
    await readFile(join(root, 'pyproject.toml'), 'utf-8');
    deps.push('python');
  } catch {}

  const allDeps = [...deps, ...devDeps];
  const frameworks = detectFrameworks(allDeps);
  const techStack = [...new Set([...frameworks, ...inferLanguages(allDeps)])];

  return { techStack, frameworks, dependencies: deps, devDependencies: devDeps, packageJson };
}

function inferLanguages(deps: string[]): string[] {
  const langs: string[] = [];
  if (deps.includes('typescript') || deps.some((d) => d.startsWith('@types/'))) langs.push('TypeScript');
  if (deps.includes('react') || deps.includes('vue') || deps.includes('svelte')) langs.push('JavaScript');
  if (deps.includes('python') || deps.includes('django') || deps.includes('flask')) langs.push('Python');
  if (deps.includes('go')) langs.push('Go');
  if (deps.includes('rust')) langs.push('Rust');
  return langs;
}
