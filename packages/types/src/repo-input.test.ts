import { describe, it, expect } from 'vitest';
import { parseRepoInput } from './repo-input.js';

describe('parseRepoInput', () => {
  const cases: Array<[string, { owner: string; repo: string } | null]> = [
    // 完整链接
    ['https://github.com/facebook/react', { owner: 'facebook', repo: 'react' }],
    ['http://github.com/facebook/react', { owner: 'facebook', repo: 'react' }],
    ['https://www.github.com/facebook/react/', { owner: 'facebook', repo: 'react' }],
    ['https://github.com/facebook/react.git', { owner: 'facebook', repo: 'react' }],
    ['https://github.com/facebook/react/tree/main/docs', { owner: 'facebook', repo: 'react' }],
    ['https://github.com/facebook/react?tab=readme', { owner: 'facebook', repo: 'react' }],
    ['HTTPS://GITHUB.COM/Facebook/React', { owner: 'Facebook', repo: 'React' }],
    ['  https://github.com/xorbitsai/xagent  ', { owner: 'xorbitsai', repo: 'xagent' }],
    // 协议省略
    ['github.com/vitejs/vite', { owner: 'vitejs', repo: 'vite' }],
    // SSH
    ['git@github.com:owner/repo.git', { owner: 'owner', repo: 'repo' }],
    // 速记
    ['facebook/react', { owner: 'facebook', repo: 'react' }],
    ['xorbitsai/xagent', { owner: 'xorbitsai', repo: 'xagent' }],
    // 非法
    ['', null],
    ['   ', null],
    ['https://gitlab.com/a/b', null],
    ['https://github.com/onlyowner', null],
    ['https://github.com/', null],
    ['notaurl', null],
    ['a/b/c', null],
    ['/etc/passwd', null],
    ['../secret', null],
    ['https://github.com/../x', null],
    ['https://github.com/a/b/../../c', null],
    ['ftp://github.com/a/b', null],
  ];

  for (const [input, expected] of cases) {
    it(JSON.stringify(input), () => {
      const r = parseRepoInput(input);
      if (expected === null) {
        expect(r).toBeNull();
      } else {
        expect(r).toEqual({ owner: expected.owner, repo: expected.repo, url: `https://github.com/${expected.owner}/${expected.repo}` });
      }
    });
  }
});
