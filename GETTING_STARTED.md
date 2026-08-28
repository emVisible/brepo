# BriefRepo 开发入门指南

## 当前状态

**Phase 0: 规划完成** ✅

- ✅ 产品定位明确（新员工入职导航）
- ✅ LLM Skill 系统设计完成（Basic/Pro/Max 三档）
- ✅ 技术栈确定（TypeScript + pnpm + turborepo）
- ✅ 代码规范确立（遵循 axiom 原则）
- ✅ 项目结构初始化完成

## 已完成工作

### 1. 文档系统

- `PROJECT-PLAN.md v3.0` - 完整项目计划（包含 Skill 系统设计）
- `README.md` - 项目简介
- `skills/README.md` - Skill 系统说明
- `skills/project-type/*.md` - 三个 Skill 配置（Basic/Pro/Max）

### 2. 项目结构

```
briefrepo/
├── skills/             # LLM Skill 配置（Markdown + Frontmatter）
│   └── project-type/
│       ├── basic.md    # Basic 档（纯规则）
│       ├── pro.md      # Pro 档（Zero-shot CoT）
│       └── max.md      # Max 档（Few-shot CoT）
├── packages/           # 核心包（待创建）
├── apps/              # 应用（待创建）
├── docs/              # 文档（待完善）
└── 配置文件
    ├── package.json
    ├── pnpm-workspace.yaml
    ├── turbo.json
    ├── tsconfig.base.json
    ├── eslint.config.mjs
    └── .prettierrc
```

### 3. 代码规范

遵循 **axiom skill** 的原则：

- ✅ **奥卡姆剃刀**：不必要的注释就不要有，必要的注释必须简洁
- ✅ **组件化**：高可复用性组件设计
- ✅ **类型安全**：TypeScript 严格模式
- ✅ **文档优先**：大段说明放文档，不在代码里写故事

## 下一步：Phase 1 开发

### Phase 1 目标（4-6 周）

1. **Monorepo 初始化**（Week 1-2）
   - [ ] 创建 `packages/types` - 类型定义
   - [ ] 创建 `packages/analyzer-core` - 核心分析引擎
   - [ ] 创建 `packages/cli` - CLI 框架
   - [ ] 配置 pnpm workspace

2. **Basic Skill 实现**（Week 3-4）
   - [ ] 实现 Pure Rule Analyzer
   - [ ] 实现类型推断逻辑
   - [ ] 实现置信度计算
   - [ ] 单元测试

3. **CLI 基础命令**（Week 5-6）
   - [ ] `brepo analyze` 命令
   - [ ] `brepo demo` 命令
   - [ ] 参数解析
   - [ ] 错误处理

### 验证方式

```bash
# 1. 安装依赖
pnpm install

# 2. 构建
pnpm build

# 3. 测试
pnpm test

# 4. 运行 CLI（待实现后）
./packages/cli/dist/index.js analyze ./test-project
```

## 技术决策记录

### 1. 为什么选择 TypeScript？

- ✅ 类型安全，长期维护友好
- ✅ 生态成熟，npm 包丰富
- ✅ 与 Node.js 无缝集成
- ✅ 比 Rust 开发速度快（一人团队优先）

### 2. 为什么 LLM Skill 用 Markdown 配置？

- ✅ 易读易维护
- ✅ 非技术人员也能修改 Prompt
- ✅ 版本控制友好
- ✅ 符合"文档即代码"原则

### 3. 为什么 Basic 档纯规则？

- ✅ 零成本，用户免费使用
- ✅ 离线可用
- ✅ 建立信任（开源可审查）
- ✅ 验证核心需求（无需 LLM）

### 4. 为什么三档分级？

- ✅ 清晰的能力和成本阶梯
- ✅ 用户按需选择
- ✅ 降低使用门槛（Basic 免费）
- ✅ 保留高级功能空间

## 参考资源

- [axiom skill](/Users/young/.claude/skills/axiom--axis/) - 长期协作原则
- [Tree-sitter](https://tree-sitter.github.io/) - AST 解析
- [GSAP](https://greensock.com/docs/) - 动画库
- [pnpm workspace](https://pnpm.io/workspaces) - Monorepo 管理

## 沟通渠道

- GitHub Issues: 功能请求和 Bug 报告
- Discussions: 一般讨论
- 项目群：日常沟通

---

**最后更新**：2026-08-28  
**状态**：Phase 0 完成，准备 Phase 1
