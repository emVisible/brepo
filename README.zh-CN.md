# BriefRepo

> 粘贴仓库，预览导航。

[English](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

BriefRepo 分析 GitHub 链接或本地路径，生成一份可交互的项目导航报告：用分布图找文件，用 3D 城市看依赖弧线、环依赖、死文件与入口。纯本地静态分析，代码不出本机。

## 快速开始

```bash
pnpm install && pnpm dev        # → http://localhost:3000/

# CLI（发布后：npm i -g @briefrepo/cli）
brepo analyze ./my-project
brepo analyze ./my-web-app --include-ext css,scss,png
brepo analyze . --json out.json --html out.html --markdown out.md
brepo diff ./a ./b --json diff.json
brepo doctor --verbose
```

## 项目结构

```
brepo/
├── webui/                  # Next.js 15 唯一 Web 主场（分布/城市双视图，中英双语）
├── packages/
│   ├── types/              # 共享类型
│   ├── tokens/             # 单源设计 Tokens
│   ├── analyzer-core/      # 引擎：parsers + analysis + events
│   ├── web-reporter/       # renderHtml/renderMarkdown（CLI 用）
│   └── cli/                # brepo（analyze/doctor/diff/watch/clean）
```

技术栈：`TypeScript strict` · `pnpm workspace + turbo` · `Next.js 15 + React 18` · `Three.js 0.160`（原生） · `framer-motion` · `simple-git` · `commander`

## 开发

```bash
pnpm dev                                  # → http://localhost:3000/
pnpm vitest run                           # 测试
```

## 隐私

100% 本地分析，不联网，无需 Key，不上传。历史报告只存你的浏览器。

## 许可证

MIT © BriefRepo Contributors — 见 [LICENSE](LICENSE)
