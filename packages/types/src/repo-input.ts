// GitHub 仓库输入归一化（前后端共用，纯函数零依赖）。
// 接受形态：
//   - 完整链接：https://github.com/owner/repo[.git][/...][?query][#hash]（http、www. 前缀、大小写 host 均可）
//   - 协议省略：github.com/owner/repo
//   - SSH 形：git@github.com:owner/repo.git
//   - 速记：owner/repo
// 输出统一为 { owner, repo, url }，url 为规范形 https://github.com/owner/repo。

export interface ParsedRepo {
  owner: string;
  repo: string;
  /** 规范链接 https://github.com/<owner>/<repo> */
  url: string;
}

const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const MAX_PART_LEN = 100;

function validPart(part: string): boolean {
  if (part.length === 0 || part.length > MAX_PART_LEN) return false;
  if (part === '.' || part === '..') return false;
  return NAME_RE.test(part);
}

function build(owner: string, repo: string): ParsedRepo | null {
  // 去 .git 后缀（不区分大小写）与首尾空白
  const o = owner.trim();
  let r = repo.trim().replace(/\.git$/i, '');
  if (!validPart(o) || !validPart(r)) return null;
  return { owner: o, repo: r, url: `https://github.com/${o}/${r}` };
}

/** 解析失败返回 null，调用方按场景配文案 */
export function parseRepoInput(raw: string): ParsedRepo | null {
  const input = raw.trim();
  if (!input || input.length > 2048) return null;

  // 1) SSH 形：git@github.com:owner/repo.git
  let m = input.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?\/?$/i);
  if (m) return build(m[1]!, m[2]!);

  // 2) 速记形：owner/repo（无协议、无空白、恰好一段斜杠）
  if (!input.includes('://') && !/[\s:?#]/.test(input) && !/^github\.com\//i.test(input)) {
    const segs = input.split('/');
    if (segs.length === 2) return build(segs[0]!, segs[1]!);
    return null;
  }

  // 3) 链接形：补协议后用 URL 解析（github.com 前缀固定，后面只取前两段）
  let text = input;
  if (/^github\.com\//i.test(text)) text = `https://${text}`;
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (u.hostname.toLowerCase() !== 'github.com' && u.hostname.toLowerCase() !== 'www.github.com') return null;
  const segs = u.pathname.split('/').filter(Boolean);
  if (segs.length < 2) return null;
  // github.com 前半固定：只认 /owner/repo，多余段（tree/blob/…）忽略
  return build(segs[0]!, segs[1]!);
}
