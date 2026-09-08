// 反馈环（axiom 11.1）：合成大仓 → analyzeProject → 各阶段耗时分解 + 不变量断言
// 用法（仓库根）：node packages/analyzer-core/bench-analyze.mjs [--budget-ms 180000]
// 或 pnpm bench。跑之前先 pnpm build，保证 dist 为最新
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeProject } from './dist/index.js';
import { parseGitInfo } from './dist/parsers/git.js';

const budgetMs = Number(process.argv.find((a) => a.startsWith('--budget-ms='))?.split('=')[1] ?? 180000);

// 确定性 RNG（mulberry32），同 seed 同 fixture
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genFixture(root) {
  const rand = rng(20260906);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let files = 0;
  const write = (rel, content) => {
    const p = join(root, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
    files++;
  };
  // 2500 小 py 文件（带 import，模拟 xagent 式单体仓）
  for (let i = 0; i < 2500; i++) {
    const d = `pkg/mod${i % 40}`;
    write(
      `${d}/file${i}.py`,
      `"""module ${i}."""\nimport os\nfrom pkg.mod${(i + 1) % 40}.file${(i + 1) % 2500} import thing${i % 7}\n\ndef fn${i}(x):\n    if x and x > 0:\n        return x + ${i}\n    return None\n`.repeat(3),
    );
  }
  // 400 ts 文件
  for (let i = 0; i < 400; i++) {
    write(`src/comp${i % 25}/c${i}.ts`, `import { x${i % 11} } from '../shared/u${i % 30}';\nexport const c${i} = () => x${i % 11} ?? ${i};\n`);
  }
  // 5 个巨大单行 bundle（正则灾难候选）
  const words = ['import', 'require', 'from', 'function', '=>', 'const', 'if', 'foobar'];
  for (let b = 0; b < 5; b++) {
    let s = '';
    const target = 8 * 1024 * 1024;
    while (s.length < target) {
      s += `${pick(words)}("${pick(['./a', './b/c', 'lodash', '../x'])}");`;
      s += 'x'.repeat(Math.floor(rand() * 200));
    }
    write(`dist/bundle${b}.min.js`, s);
  }
  // 150 二进制资源（模拟用户全选过滤器：图片/字体/音视频）
  const binExts = ['png', 'woff2', 'mp4', 'jpg', 'ico'];
  for (let i = 0; i < 150; i++) {
    const size = 1 * 1024 * 1024 + Math.floor(rand() * 20 * 1024 * 1024);
    const buf = Buffer.alloc(Math.min(size, 30 * 1024 * 1024));
    for (let j = 0; j < buf.length; j += 4096) buf[j] = Math.floor(rand() * 256);
    write(`assets/blob${i}.${pick(binExts)}`, buf);
  }
  write('README.md', '# Fixture\n\nSynthetic monorepo for benchmarks.\n');
  write('package.json', JSON.stringify({ name: 'fixture', dependencies: { react: '^18.0.0' } }));
  return files;
}

const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures.push(msg);
};

const root = mkdtempSync(join(tmpdir(), 'brepo-bench-'));
console.log(`fixture: ${root}`);
const n = genFixture(root);
console.log(`generated ${n} files`);

// 对照组 A 以仓库根为准（脚本位置推导，不依赖调用时的 cwd）
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// —— 对照组 A：本地 git 仓必须读出提交数（验证“本地也 0”是真是假）——
const gitLocal = await parseGitInfo(repoRoot);
console.log(`local git repo: isGitRepo=${gitLocal.isGitRepo} commits=${gitLocal.totalCommits} contributors=${gitLocal.contributors}`);
check(gitLocal.isGitRepo && gitLocal.totalCommits > 0, '本地 git 仓提交数 > 0（否则 parseGitInfo 有真 bug）');

// —— 对照组 B：无 .git 目录必须明确标记非仓库（tarball 期望行为）——
const gitBare = await parseGitInfo(root);
check(gitBare.isGitRepo === false && gitBare.totalCommits === 0, '无 .git 目录明确返回非仓库（tarball 场景）');

// —— 主测试：全过滤器大仓分析 + 计时分解 ——
const events = [];
const t0 = Date.now();
let done = false;
const watchdog = setTimeout(() => {
  if (!done) {
    console.log(`FAIL  看门狗：${budgetMs}ms 内未完成，最后事件: ${JSON.stringify(events.at(-1))}`);
    rmSync(root, { recursive: true, force: true });
    process.exit(2);
  }
}, budgetMs);

const includeExts = ['css', 'scss', 'less', 'html', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg', 'flac', 'zip', 'tar', 'gz', '7z', 'rar', 'json', 'yaml', 'yml', 'toml', 'xml', 'pdf'];
let result;
try {
  result = await analyzeProject(root, {
    useCache: false,
    includeExts,
    onEvent: (e) => events.push({ t: Date.now() - t0, ...e }),
  });
  done = true;
} finally {
  clearTimeout(watchdog);
}
clearTimeout(watchdog);

console.log('\n--- stage breakdown ---');
let prev = 0;
for (const e of events) {
  console.log(`+${String(e.t).padStart(7)}ms (Δ${String(e.t - prev).padStart(7)}ms) [${String(e.pct).padStart(3)}%] ${e.phase} · ${e.msg}`);
  prev = e.t;
}
const mem = process.memoryUsage();
console.log(`\nheap ${(mem.heapUsed / 1048576).toFixed(1)}MB / rss ${(mem.rss / 1048576).toFixed(1)}MB`);

check(!!result, '分析完成（未 hang）');
check(events.some((e) => e.pct > 38), '38% 之后仍有事件（用户卡死点）');
check(result.level0.fileCount > 2900, `文件数守恒（${result.level0.fileCount}）`);
const lastPct = events.at(-1)?.pct;
check(lastPct === 100, `进度走到 100（实际最后 ${lastPct}）`);

rmSync(root, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n${failures.length} FAILURES`);
  process.exit(1);
}
console.log('\nALL CHECKS PASSED');
