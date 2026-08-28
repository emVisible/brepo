# BriefRepo (brepo)

> 入职第一天，不再手足无措

## 一句话介绍

新员工入职第一天的项目导航仪 —— 60 秒生成项目导航报告，快速理解新项目。

## 核心原则

- 🔒 **本地优先**：代码永远不出用户电脑，100% 隐私安全
- 📖 **开源透明**：核心分析引擎 MIT License
- ⚡ **快速分析**：60 秒出结果
- 🎯 **模块化管理**：LLM Skill 系统可配置

## 技术栈

- **CLI**: TypeScript + Node.js
- **Monorepo**: pnpm workspace + turborepo
- **分析引擎**: Tree-sitter (WASM)
- **报告**: React + Tailwind CSS + D3.js + GSAP

## 快速开始

```bash
# 安装（待发布）
npm install -g @briefrepo/cli

# 分析项目
brepo analyze ./my-project

# 查看预置报告
brepo demo
```

## 项目结构

```
briefrepo/
├── skills/             # LLM Skill 配置（Markdown）
├── packages/           # 核心包
│   ├── cli/           # CLI 工具
│   ├── analyzer-core/ # 分析引擎
│   └── web-reporter/  # Web 报告
├── docs/              # 文档
└── PROJECT-PLAN.md    # 项目计划
```

## 当前状态

**Phase 0: 规划完成** - 准备开始 Phase 1 开发

## 许可证

MIT
