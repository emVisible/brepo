# BriefRepo

> 粘贴仓库，预览导航。

[English](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

BriefRepo 分析 GitHub 仓库（完整链接或 `owner/repo` 速记），生成一份可交互的项目导航报告：用分布图找文件，用 3D 城市看依赖弧线、环依赖、死文件与入口。纯本地静态分析，代码不出本机。

## 快速开始

```bash
pnpm install && pnpm dev        # → http://localhost:3000/
```

## 项目结构

```
brepo/
├── webui/                  # Next.js 15 唯一 Web 主场（分布/城市双视图，中英双语）
├── packages/
│   ├── types/              # 共享类型
│   ├── tokens/             # 单源设计 Tokens
│   └── analyzer-core/      # 引擎：parsers + analysis + events
```

技术栈：`TypeScript strict` · `pnpm workspace + turbo` · `Next.js 15 + React 18` · `Three.js 0.160`（原生） · `framer-motion` · `simple-git`

## 开发

```bash
pnpm dev                                  # → http://localhost:3000/
pnpm vitest run                           # 测试
```

## 隐私

分析时服务端拉取公开 GitHub 压缩包（无需 Key，`codeload.github.com`），随后完全本地静态分析，不会将代码发送给第三方 AI 服务。历史报告只存你的浏览器。

## 许可证

MIT © BriefRepo Contributors — 见 [LICENSE](LICENSE)
