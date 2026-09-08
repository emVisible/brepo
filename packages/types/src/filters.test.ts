import { describe, it, expect } from 'vitest';
import { matchFilter, DEFAULT_EXCLUDE } from './filters.js';

describe('matchFilter', () => {
  const cases: Array<[string, string | null]> = [
    // test：目录
    ['src/__tests__/a.ts', 'test'],
    ['packages/foo/test/bar.js', 'test'],
    ['e2e/login.spec.ts', 'test'],
    ['src/__snapshots__/a.snap', 'test'],
    // test：文件名
    ['src/a.test.ts', 'test'],
    ['src/a.spec.js', 'test'],
    ['tests_py/test_api.py', 'test'],
    ['src/util_test.go', 'test'],
    ['src/contest.ts', null],
    ['src/latest.js', null],
    // generated
    ['dist/app.min.js', 'generated'],
    ['assets/x.bundle.css', 'generated'],
    // text
    ['notes/todo.txt', 'text'],
    ['README.md', null],
    // media
    ['assets/logo.png', 'media'],
    ['public/v.mp4', 'media'],
    ['fonts/a.woff2', 'media'],
    ['docs/manual.pdf', 'media'],
    // 普通源码不过滤
    ['src/index.ts', null],
    ['src/main.py', null],
    ['package.json', null],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(matchFilter(input)).toBe(expected);
    });
  }

  it('默认排除测试与生成物（txt 仅打标）', () => {
    expect([...DEFAULT_EXCLUDE].sort()).toEqual(['generated', 'media', 'test']);
  });
});
