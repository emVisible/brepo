# BriefRepo (brepo) — 项目计划 v3.0

> **入职第一天，不再手足无措** — 新员工的项目导航仪

**版本更新**：v2.0 → v3.0（新增 LLM Skill 系统设计）

---

## 零、执行摘要

### 产品定位

**BriefRepo** 是一个纯本地优先的代码项目分析工具，帮助新员工在入职第一天快速理解新项目。通过 CLI 命令 `brepo analyze`，60 秒生成一份精美的交互式导航报告。

### 核心原则

| 原则 | 说明 |
|------|------|
| **本地优先** | 代码永远不出用户电脑，100% 隐私安全 |
| **开源透明** | 核心分析引擎 100% 开源（MIT License） |
| **静态分析为主** | 能通过规则获取的信息，不用 LLM |
| **LLM 增强可选** | 用户自备 API Key，支持 DeepSeek 等原生接口 |
| **C 端优先** | 先服务个人开发者/小团队，后扩展企业 |
| **长期主义** | 不追求速度，注重代码质量和可维护性 |

### 技术栈

- **CLI**: TypeScript + Node.js
- **发布**: `@briefrepo/cli` (npm scoped package)
- **命令**: `brepo`
- **Monorepo**: pnpm workspace + turborepo
- **AST 解析**: Tree-sitter (WASM)
- **Web 报告**: React + Tailwind CSS + D3.js
- **动画**: GSAP + ScrollTrigger

---

## 一、产品定位

### 1.1 核心卖点

**一句话定位**：新员工入职第一天的项目导航仪，60 秒生成项目导航报告。

**差异化三角**：

| 维度 | 定位 | 说明 |
|------|------|------|
| **Z（方向）** | 入职导航 | 品牌定位 - 新同事的第一位"导师" |
| **Y（功能）** | 多维特征分析 | 内置功能 - 静态规则 + 可选 LLM 增强 |
| **X（目标）** | 60 秒出结果 | 性能目标 - 快速、本地、流式输出 |

### 1.2 目标用户

| 用户类型 | 核心需求 | 使用场景 | 优先级 |
|----------|----------|----------|--------|
| **新入职员工** | 快速理解项目，第一天就能上手 | 入职第一周 | P0 |
| **开源贡献者** | 理解陌生代码库，开始第一次 PR | 参与开源项目 | P0 |
| **小团队负责人** | 降低新人培养成本，知识传承 | 团队扩张期 | P1 |
| **自由开发者** | 接手外包项目，快速熟悉代码 | 项目交接 | P1 |
| **技术投资人** | 评估项目质量和技术风险 | 尽职调查 | P2 (后续) |

### 1.3 产品类型推断（纯静态规则）

基于多维特征的项目类型识别系统：

| 类型 | 特征 | 识别规则 |
|------|------|----------|
| **产品应用** | 面向最终用户的应用 | 有 UI/CLI + 用户指南 + 下载入口 |
| **库/框架** | 面向开发者的工具 | 有 API 文档 + 导出接口 + 技术文档 |
| **文档仓库** | 主要是文档/教程 | 文档文件占比 >80% + 代码量少 |
| **技术硬核** | 底层技术/基础设施 | 系统级依赖 + 底层语言 (Rust/C++) |
| **实验性质** | 原型/概念验证 | 提交历史短 + README 说明"实验" |
| **学习性质** | 教程/练手项目 | 名称含"tutorial"/"learn" + 简单代码 |
| **个人项目** | 个人维护 | 贡献者 1-2 人 + 更新不定期 |
| **集体项目** | 组织/团队维护 | 贡献者 5+ 人 + 定期更新 |

**推断逻辑**：
```
1. 提取多维特征（技术、文档、元数据）
2. 加权评分
3. 输出类型 + 置信度 + 推断理由
4. 明确标注"推断结果，仅供参考"
```

### 1.4 产品愿景

> "让每个新人都能在第一天找到方向"

- 前 HR 看"简历一页纸"
- 投资人看"商业计划书一页纸"
- 新同事看"BriefRepo 生成的项目导航报告"

---

## 二、竞品分析

### 2.1 竞品全景

| 竞品 | 定位 | 核心功能 | 优势 | 劣势 |
|------|------|----------|------|------|
| **CodeDashboard** | GitHub 可视化 | 架构图、技术栈、数据流 | 交互式图表 | 面向开发者，不够简洁 |
| **Codebrief** | 证据驱动简报 | 决策考古、风险地图 | 可追溯引用 | 流程复杂、速度慢 |
| **GitBrain** | 仓库智能 | 知识库、模块图 | 零 API Key | 文档太多，不简洁 |
| **Repolyze** | 代码库评分 | 健康评分、架构分析 | 美观 UI、PDF 导出 | 依赖 AI、不准确 |
| **CodeMap** | 仓库图谱 | 依赖图、所有权分析 | 多语言支持 | CLI 工具、无 Web UI |

### 2.2 差异化矩阵

| 维度 | 竞品 | BriefRepo |
|------|------|-----------|
| **本地优先** | ❌ 大部分云端 | ✅ 100% 本地 |
| **开箱即用** | ⚠️ 需配置 | ✅ 零配置（可选 LLM） |
| **新员工视角** | ❌ 开发者视角 | ✅ 入职导航定位 |
| **类型推断** | ❌ 无 | ✅ 8 种类型识别 |
| **预置报告** | ❌ 无 | ✅ 内置示例 |
| **开源透明** | ⚠️ 部分开源 | ✅ 核心 100% 开源 |
| **动画效果** | ❌ 基础 | ✅ GSAP 高级动效 |

---

## 三、核心功能设计

### 3.1 功能架构（分层分析）

```
┌─────────────────────────────────────────┐
│  Level 4: 商业分析 (LLM 可选，叠甲)         │  ← 高级
│  市场定位、商业模式、竞品推断              │
├─────────────────────────────────────────┤
│  Level 3: 产品功能分析 (LLM 可选)           │
│  用户场景、功能模块、输入输出流程          │
├─────────────────────────────────────────┤
│  Level 2: 代码意图分析 (LLM 可选)           │
│  设计决策、架构模式、模块职责              │
├─────────────────────────────────────────┤
│  Level 1: 代码结构分析 (纯规则)            │
│  AST、依赖图、调用关系、复杂度             │
├─────────────────────────────────────────┤
│  Level 0: 基础信息分析 (纯规则)            │  ← 基础
│  文件树、技术栈、代码量、Git 历史            │
└─────────────────────────────────────────┘
```

### 3.2 功能优先级

#### P0 — MVP 核心（必须有）

| 功能 | 说明 | 实现方式 | LLM 需求 |
|------|------|---------|---------|
| **CLI 基础命令** | `brepo analyze` | commander.js | ❌ |
| **Level 0 分析** | 基础信息（文件、技术栈、Git） | 纯规则 | ❌ |
| **Level 1 分析** | 代码结构（AST、依赖图） | Tree-sitter | ❌ |
| **多维特征提取** | 8 种类型识别 | 规则 + 加权评分 | ❌ |
| **类型推断** | 产品/库/文档/实验等 | 特征融合 | ❌ |
| **HTML 报告** | 单文件，内嵌所有资源 | React + Tailwind | ❌ |
| **预置报告** | 管理员配置的示例报告 | 静态文件 | ❌ |
| **置信度展示** | 明确标注推断可信度 | UI 组件 | ❌ |
| **叠甲声明** | "仅供参考，信息有限" | 固定文案 | ❌ |

#### P1 — 增强功能（第二版）

| 功能 | 说明 | 实现方式 | LLM 需求 |
|------|------|---------|---------|
| **LLM 接口** | DeepSeek/OpenAI 适配器 | 原生接口 | ✅ 用户 Key |
| **Level 2 分析** | 代码意图推断 | LLM Prompt | ✅ |
| **Level 3 分析** | 产品功能分析 | LLM Prompt | ✅ |
| **Level 4 分析** | 商业分析（叠甲） | LLM Prompt | ✅ |
| **PDF 导出** | 打印友好样式 | Print CSS | ❌ |
| **JSON 输出** | 机器可读格式 | JSON 序列化 | ❌ |
| **进度动画** | 流式输出分析过程 | GSAP | ❌ |

#### P2 — 高级功能（后续版本）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **VSCode 插件** | 编辑器内查看报告 | 低 |
| **报告对比** | 不同版本差异 | 低 |
| **团队共享** | 报告链接分享 | 中 |
| **历史趋势** | 项目健康度变化 | 低 |
| **本地 LLM** | Ollama 集成 | 低 |

### 3.3 一页纸报告结构

```
┌─────────────────────────────────────────────┐
│  [brepo]  项目导航报告                [导出 ▼]│
├─────────────────────────────────────────────┤
│                                             │
│  📦 项目名称                                │
│  [类型标签] · [置信度] · [叠甲：仅供参考]    │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  ⚡ 60 秒速览                             │ │
│  │  · 一句话描述                           │ │
│  │  · 技术栈：React · TypeScript · ...    │ │
│  │  · 代码量：12k 行 · 38 个模块            │ │
│  │  · 团队：5 人 · 更新：3 天前             │ │
│  │  · 项目类型：产品应用 (85% 置信度)       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🎯 项目定位                            │ │
│  │  [基于 README + 静态分析推断，叠甲]      │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🧩 功能模块地图                         │ │
│  │  交互式依赖图 (D3.js)                   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🔑 新人必读 Top 5                       │ │
│  │  1. README.md - 项目说明                │ │
│  │  2. src/main.ts - 应用入口              │ │
│  │  ...                                   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  👶 第一周上手任务                       │ │
│  │  · Day 1: 本地跑起来                    │ │
│  │  · Day 2-3: 修一个简单 bug              │ │
│  │  · Day 4-5: 为核心函数加单元测试         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [⬇️ 下载 PDF]  [📤 分享]  [💾 保存 JSON]     │
└─────────────────────────────────────────────┘
```

### 3.4 预置报告功能

**设计理念**：功能性产品内置示例，管理员可配置

**实现方式**：
```typescript
// 预置报告配置
interface PresetReport {
  id: string;
  name: string;
  description: string;
  projectType: 'product' | 'library' | 'documentation' | 'experimental';
  reportData: Report; // 预先生成的报告数据
  featured: boolean;  // 是否在首页展示
}

// CLI 命令
brepo demo                    # 查看所有预置报告
brepo demo ocr-app            # 查看指定预置报告
brepo demo --featured         # 只查看推荐报告
```

**预置报告示例**：
1. **OCR 图像识别工具** (产品应用)
2. **视频处理 CLI** (命令行工具)
3. **React UI 组件库** (库/框架)
4. **TypeScript 入门教程** (学习性质)
5. **Rust 实验性项目** (实验性质)

---

## 四、技术架构

### 4.1 Monorepo 结构

```
briefrepo/
├── packages/
│   ├── cli/                    # CLI 工具 (@briefrepo/cli)
│   │   ├── src/
│   │   │   ├── index.ts        # 入口
│   │   │   ├── commands/
│   │   │   │   ├── analyze.ts
│   │   │   │   ├── demo.ts     # 预置报告命令
│   │   │   │   ├── init.ts     # 配置向导
│   │   │   │   └── doctor.ts   # 诊断
│   │   │   ├── config/
│   │   │   │   └── llm.ts      # LLM 配置
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── analyzer-core/          # 核心分析引擎
│   │   ├── src/
│   │   │   ├── analyzer.ts
│   │   │   ├── levels/
│   │   │   │   ├── level0-basic.ts
│   │   │   │   ├── level1-structure.ts
│   │   │   │   ├── level2-intent.ts      # LLM
│   │   │   │   ├── level3-product.ts     # LLM
│   │   │   │   └── level4-business.ts    # LLM
│   │   │   ├── parsers/
│   │   │   │   ├── git.ts
│   │   │   │   ├── ast.ts
│   │   │   │   ├── dependencies.ts
│   │   │   │   └── readme.ts
│   │   │   ├── inference/
│   │   │   │   └── type-inference.ts     # 类型推断
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── llm-native/             # 原生 LLM 适配器
│   │   ├── src/
│   │   │   ├── provider.ts
│   │   │   ├── providers/
│   │   │   │   ├── deepseek.ts
│   │   │   │   ├── openai.ts
│   │   │   │   └── anthropic.ts
│   │   │   └── prompts/
│   │   └── package.json
│   │
│   ├── web-reporter/           # Web 报告生成器
│   │   ├── src/
│   │   │   ├── generate.ts
│   │   │   ├── templates/
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── types/                  # 共享类型
│       └── src/
│
├── apps/
│   └── demo/                   # 开发测试
│
├── examples/                   # 预置报告数据
│   ├── ocr-app/
│   ├── video-cli/
│   ├── react-ui-lib/
│   ├── ts-tutorial/
│   └── rust-experimental/
│
├── docs/
│   ├── getting-started.md
│   ├── cli-usage.md
│   ├── llm-config.md
│   └── architecture.md
│
├── .changeset/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

### 4.2 技术栈详情

| 模块 | 技术选型 | 理由 |
|------|---------|------|
| **CLI 框架** | commander.js | 成熟、轻量、TypeScript 支持好 |
| **Monorepo** | pnpm workspace + turborepo | 依赖去重、快速构建、社区成熟 |
| **类型系统** | TypeScript 严格模式 | 长期主义、可维护性 |
| **AST 解析** | Tree-sitter (WASM) | 多语言、性能好、本地运行 |
| **Git 解析** | simple-git | 轻量、成熟 |
| **Web 报告** | React + Tailwind CSS | 组件化、快速开发 |
| **图表** | D3.js | 灵活、强大 |
| **动画** | GSAP + ScrollTrigger | 专业级动画、流畅 |
| **LLM 调用** | 原生 fetch | 零依赖、灵活 |
| **版本管理** | Changesets | 语义化、自动化 Changelog |
| **测试** | Vitest + Playwright | 快速、现代 |

### 4.3 LLM 接口设计

```typescript
// LLM Provider 接口
interface LLMProvider {
  readonly name: string;
  analyzeIntent(context: CodeContext): Promise<IntentAnalysis>;
  analyzeProduct(context: ProductContext): Promise<ProductAnalysis>;
  analyzeBusiness(context: BusinessContext): Promise<BusinessAnalysis>;
}

// DeepSeek 实现
class DeepSeekProvider implements LLMProvider {
  constructor(config: { apiKey: string; model?: string })
  // ... 实现
}

// CLI 使用
brepo analyze ./project \
  --llm-api-key $DEEPSEEK_KEY \
  --llm-provider deepseek
```

### 4.4 架构原则

| 原则 | 说明 |
|------|------|
| **本地优先** | 默认 100% 本地分析，代码不出本机 |
| **渐进增强** | 基础功能免费，LLM 增强可选 |
| **类型安全** | 严格 TypeScript，零 `any` |
| **可测试性** | 单元测试覆盖率 >70% |
| **可维护性** | 清晰的模块边界、文档齐全 |
| **性能优先** | Web Worker 并行处理、流式输出 |

---

## 五、UI/UX 视觉设计系统

### 5.1 设计理念

**核心关键词**：专业、友好、流畅、可信

| 设计目标 | 实现方式 |
|---------|---------|
| **专业感** | 克制的配色、精确的间距、一致的视觉语言 |
| **友好感** | 圆润的边角、温暖的插画、清晰的指引 |
| **流畅感** | GSAP 动画、渐进披露、微交互反馈 |
| **可信感** | 叠甲声明、置信度展示、透明化信息 |

### 5.2 品牌色彩系统

#### 主色

```css
/* 主色 - 深蓝色系 (信任、专业) */
--color-primary-50:  #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6;  /* 主色 */
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;

/* 强调色 - 亮橙色 (活力、洞察) */
--color-accent-50:  #fff7ed;
--color-accent-100: #ffedd5;
--color-accent-200: #fed7aa;
--color-accent-300: #fdba74;
--color-accent-400: #fb923c;
--color-accent-500: #f97316;  /* 强调色 */
--color-accent-600: #ea580c;
--color-accent-700: #c2410c;
--color-accent-800: #9a3412;
--color-accent-900: #7c2d12;
```

#### 中性色

```css
/* 中性色 - 灰色系 */
--color-gray-50:  #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;

/* 功能色 */
--color-success: #10b981;  /* 成功/健康 */
--color-warning: #f59e0b;  /* 警告/注意 */
--color-error:   #ef4444;  /* 错误/风险 */
--color-info:    #3b82f6;  /* 信息/提示 */
```

#### 类型标签色

```css
/* 项目类型标签色 */
--type-product-bg:      #dbeafe;  /* 蓝色 - 产品应用 */
--type-product-text:    #1e40af;
--type-library-bg:      #dcfce7;  /* 绿色 - 库/框架 */
--type-library-text:    #166534;
--type-docs-bg:         #fef3c7;  /* 黄色 - 文档仓库 */
--type-docs-text:       #92400e;
--type-technical-bg:    #e0e7ff;  /* 紫色 - 技术硬核 */
--type-technical-text:  #3730a3;
--type-experimental-bg: #fce7f3;  /* 粉色 - 实验性质 */
--type-experimental-text: #9d174d;
--type-tutorial-bg:     #cffafe;  /* 青色 - 学习性质 */
--type-tutorial-text:   #0e7490;
--type-personal-bg:     #f3f4f6;  /* 灰色 - 个人项目 */
--type-personal-text:   #374151;
--type-org-bg:          #ede9fe;  /* 紫色 - 集体项目 */
--type-org-text:        #5b21b6;
```

### 5.3 字体系统

```css
/* 字体系列 */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* 字体大小 */
--text-xs:   0.75rem;   /* 12px - 标签、注释 */
--text-sm:   0.875rem;  /* 14px - 辅助文字 */
--text-base: 1rem;      /* 16px - 正文 */
--text-lg:   1.125rem;  /* 18px - 小标题 */
--text-xl:   1.25rem;   /* 20px - 卡片标题 */
--text-2xl:  1.5rem;    /* 24px - 模块标题 */
--text-3xl:  1.875rem;  /* 30px - 页面标题 */
--text-4xl:  2.25rem;   /* 36px - Hero 标题 */
```

### 5.4 间距系统

```css
/* 8px 基准 */
--space-0:   0;
--space-1:   0.25rem;  /* 4px */
--space-2:   0.5rem;   /* 8px */
--space-3:   0.75rem;  /* 12px */
--space-4:   1rem;     /* 16px */
--space-5:   1.25rem;  /* 20px */
--space-6:   1.5rem;   /* 24px */
--space-8:   2rem;     /* 32px */
--space-10:  2.5rem;   /* 40px */
--space-12:  3rem;     /* 48px */
--space-16:  4rem;     /* 64px */
--space-20:  5rem;     /* 80px */
--space-24:  6rem;     /* 96px */
```

### 5.5 圆角系统

```css
--radius-sm:   0.25rem;  /* 4px - 小按钮 */
--radius-md:   0.375rem; /* 6px - 默认 */
--radius-lg:   0.5rem;   /* 8px - 卡片 */
--radius-xl:   0.75rem;  /* 12px - 大卡片 */
--radius-2xl:  1rem;     /* 16px - 模态框 */
--radius-full: 9999px;   /* 标签、头像 */
```

### 5.6 阴影系统

```css
--shadow-sm:   0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md:   0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg:   0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl:   0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### 5.7 GSAP 动画系统

#### 动画时长

```typescript
const DURATION = {
  FAST: 0.2,    // 快速反馈（悬停、点击）
  NORMAL: 0.4,  // 默认动画
  SLOW: 0.6,    // 复杂动画
  XSlow: 1.0,   // 页面级过渡
};

const EASING = {
  SMOOTH: 'power2.out',      // 平滑
  BOUNCE: 'back.out(1.7)',   // 弹性
  SNAP: 'power4.out',        // 快速到位
  GENTLE: 'power1.inOut',    // 温和
};
```

#### 核心动画

```typescript
// 1. 卡片入场动画
function animateCardEntrance(element: HTMLElement, delay: number) {
  gsap.fromTo(element,
    {
      opacity: 0,
      y: 40,
      scale: 0.95
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION.SLOW,
      ease: EASING.SMOOTH,
      delay: delay
    }
  );
}

// 2. 流式输出动画 (分析进度)
function animateStreamProgress(container: HTMLElement, steps: string[]) {
  steps.forEach((step, index) => {
    gsap.to(`.step-${index}`, {
      opacity: 1,
      x: 0,
      duration: DURATION.FAST,
      delay: index * 0.3,
      ease: EASING.SNAP
    });
  });
}

// 3. 数字计数动画
function animateCountUp(element: HTMLElement, end: number, duration: number) {
  gsap.to(element, {
    innerText: end,
    duration: duration,
    ease: EASING.SMOOTH,
    snap: { innerText: 1 },
    onUpdate: function() {
      element.innerText = Math.ceil(this.targets()[0].innerText).toString();
    }
  });
}

// 4. 依赖图节点展开
function animateDependencyTree(nodes: HTMLElement[]) {
  gsap.fromTo(nodes,
    {
      scale: 0,
      opacity: 0
    },
    {
      scale: 1,
      opacity: 1,
      stagger: 0.05,
      duration: DURATION.NORMAL,
      ease: EASING.BOUNCE
    }
  );
}

// 5. 页面过渡
function animatePageTransition(container: HTMLElement) {
  const timeline = gsap.timeline();
  
  timeline
    .to(container, {
      opacity: 0,
      y: -20,
      duration: DURATION.NORMAL
    })
    .set(container, { display: 'none' })
    // ... 切换到新页面后
    .set(container, { display: 'block' })
    .fromTo(container,
      {
        opacity: 0,
        y: 20
      },
      {
        opacity: 1,
        y: 0,
        duration: DURATION.SLOW
      }
    );
}
```

#### 微交互

```typescript
// 悬停反馈
function addHoverEffect(element: HTMLElement) {
  element.addEventListener('mouseenter', () => {
    gsap.to(element, {
      scale: 1.02,
      duration: DURATION.FAST,
      ease: EASING.SMOOTH
    });
  });
  
  element.addEventListener('mouseleave', () => {
    gsap.to(element, {
      scale: 1,
      duration: DURATION.FAST,
      ease: EASING.SMOOTH
    });
  });
}

// 点击波纹
function addRippleEffect(element: HTMLElement) {
  element.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    // ... 创建波纹元素
    element.appendChild(ripple);
    
    gsap.fromTo(ripple,
      { scale: 0, opacity: 1 },
      {
        scale: 2,
        opacity: 0,
        duration: DURATION.NORMAL,
        ease: EASING.SMOOTH,
        onComplete: () => ripple.remove()
      }
    );
  });
}
```

### 5.8 关键页面设计

#### CLI 终端界面

```bash
$ brepo analyze ./my-project

👋 BriefRepo v0.1.0

📊 开始分析项目...
┌──────────────────────────────────────┐
│ 🔍 Stage 1: 基础信息                  │
│ ✓ 读取 package.json         (0.2s)   │
│ ✓ 扫描文件结构            (0.3s)   │
│ ✓ 识别技术栈            (0.1s)   │
│ ✓ 解析 Git 历史            (0.5s)   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🔍 Stage 2: 代码结构                  │
│ ✓ AST 解析关键文件         (1.2s)   │
│ ✓ 构建依赖关系图         (0.8s)   │
│ ✓ 识别核心模块            (0.3s)   │
│ ✓ 计算代码复杂度         (0.4s)   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🔍 Stage 3: 类型推断                  │
│ ✓ 提取多维特征            (0.2s)   │
│ ✓ 加权评分                (0.1s)   │
│ ✓ 生成推断结论            (0.1s)   │
│                                       │
│ 💡 推断结果：产品应用 (置信度：85%)    │
│    理由：有 UI 界面 + 用户指南 + 下载入口  │
└──────────────────────────────────────┘

✅ 分析完成！
📄 报告已保存：./brief-report.html
🌐 正在浏览器打开...

💡 提示：
   · 使用 --llm-api-key 启用 AI 增强分析
   · 查看预置报告：brepo demo
   · 查看帮助：brepo --help
```

#### Web 报告页面

详见 3.3 节"一页纸报告结构"

#### 落地页 (Landing Page)

```
┌─────────────────────────────────────────────┐
│  [brepo]                    [文档] [GitHub]  │
├─────────────────────────────────────────────┤
│                                             │
│           入职第一天，不再手足无措            │
│                                             │
│     输入 GitHub URL，60 秒生成新员工专属      │
│            的"项目导航地图"                   │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  🔍 github.com/username/repo         │  │
│   └─────────────────────────────────────┘  │
│              [生成导航地图]                  │
│                                             │
│   ✓ 5 分钟看懂项目结构   ✓ 找到关键文件       │
│   ✓ 理解代码意图       ✓ 快速开始第一个任务   │
│                                             │
│   ───────────────────────────────────────   │
│   💡 想先看看效果？ [查看预置报告]            │
│                                             │
├─────────────────────────────────────────────┤
│  🔒 隐私安全                                 │
│  · 100% 本地分析，代码不出本机                │
│  · 开源透明，核心引擎 MIT License            │
│  · 无遥测、无追踪、无数据收集                │
│  · 离线可用，无需网络连接                    │
├─────────────────────────────────────────────┤
│  📊 项目类型识别                             │
│  · 产品应用  · 库/框架  · 文档仓库          │
│  · 技术硬核  · 实验性质  · 学习性质          │
│  · 个人项目  · 集体项目                      │
├─────────────────────────────────────────────┤
│  🚀 快速开始                                 │
│  $ npm install -g @briefrepo/cli            │
│  $ brepo analyze ./my-project               │
├─────────────────────────────────────────────┤
│  [GitHub Stars] [npm Downloads] [社区讨论]  │
└─────────────────────────────────────────────┘
```

### 5.9 响应式设计

| 断点 | 宽度 | 适配 |
|------|------|------|
| **sm** | 640px | 手机横屏 |
| **md** | 768px | 平板竖屏 |
| **lg** | 1024px | 平板横屏/笔记本 |
| **xl** | 1280px | 桌面 |
| **2xl** | 1536px | 大屏桌面 |

---

## 六、预置报告系统

### 6.1 设计理念

作为功能性产品，内置预置报告可以让用户：
1. **零成本体验**：无需自己 analysis 即可看到效果
2. **理解能力边界**：知道工具能做什么、不能做什么
3. **建立信任**：透明的示例比任何宣传都有说服力

### 6.2 预置报告配置

```typescript
// 预置报告数据结构
interface PresetReport {
  id: string;
  slug: string;
  name: string;
  description: string;
  projectType: ProjectType;
  confidence: number;
  reasons: string[];
  report: Report;  // 完整的报告数据
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 预置报告列表

| ID | 名称 | 类型 | 特点 | 用途 |
|----|------|------|------|------|
| `ocr-app` | OCR 图像识别工具 | 产品应用 | 有 UI、功能完整 | 展示产品分析 |
| `video-cli` | 视频处理 CLI | 命令行工具 | 纯 CLI、无 UI | 展示工具分析 |
| `react-ui-lib` | React UI 组件库 | 库/框架 | 多组件、文档齐全 | 展示库分析 |
| `ts-tutorial` | TypeScript 入门教程 | 学习性质 | 教程代码、简单 | 展示学习项目分析 |
| `rust-experimental` | Rust 实验性项目 | 实验性质 | 代码少、探索性 | 展示实验项目分析 |

### 6.4 管理员配置接口

```typescript
// CLI 配置命令
brepo preset create ./my-project    # 从真实项目创建预置报告
brepo preset edit ocr-app           # 编辑预置报告
brepo preset list                   # 列出所有预置报告
brepo preset featured ocr-app       # 设为推荐
brepo preset unfeature ocr-app      # 取消推荐
```

---

## 七、开发计划

### Phase 1: 基础架构（4-6 周）

**目标**：搭建可运行的骨架

| Week | 任务 | 交付物 |
|------|------|--------|
| 1-2 | Monorepo 初始化 | pnpm workspace、TypeScript 配置、ESLint/Prettier |
| 3-4 | CLI 基础命令 | `brepo analyze` 命令框架、参数解析 |
| 5-6 | Level 0 分析 | 文件扫描、技术栈识别、Git 历史、基础报告 |

### Phase 2: 核心分析（6-8 周）

**目标**：完整的多维特征分析

| Week | 任务 | 交付物 |
|------|------|--------|
| 7-8 | Level 1 分析 | AST 解析、依赖图、复杂度计算 |
| 9-10 | 类型推断系统 | 8 种类型识别、置信度评估、叠甲文案 |
| 11-12 | Web 报告生成 | React 组件、Tailwind 样式、单文件输出 |
| 13-14 | 预置报告系统 | 示例数据、CLI 命令、首页展示 |

### Phase 3: 视觉打磨（6-8 周）

**目标**：精美的 UI 和流畅的动画

| Week | 任务 | 交付物 |
|------|------|--------|
| 15-16 | D3.js 图表 | 依赖关系图、技术栈分布图 |
| 17-18 | GSAP 动画 | 流式输出、卡片入场、微交互 |
| 19-20 | 响应式优化 | 全设备适配、可访问性 (WCAG AA) |
| 21-22 | PDF 导出 | 打印友好样式、导出功能 |

### Phase 4: LLM 增强（4-6 周）

**目标**：可选的 AI 增强分析

| Week | 任务 | 交付物 |
|------|------|--------|
| 23-24 | LLM 接口设计 | Provider 接口、DeepSeek 适配器 |
| 25-26 | LLM Prompts | Level 2-4 分析 Prompt 模板 |
| 27-28 | 配置管理 | CLI 配置、安全存储 API Key |

### Phase 5: 发布准备（4-6 周）

**目标**：打磨体验、准备发布

| Week | 任务 | 交付物 |
|------|------|--------|
| 29-30 | 测试 | 单元测试 (>70%)、E2E 测试 |
| 31-32 | 文档 | 用户文档、API 文档、FAQ |
| 33-34 | 发布 | npm 发布、GitHub Release、Product Hunt |

**总预估**：28-34 周（7-8.5 个月）

> 长期主义不追求速度，注重质量和可维护性

---

## 八、成功指标

### 8.1 产品指标

| 指标 | 目标 | 说明 |
|------|------|------|
| **分析速度** | < 60 秒 | 10k 行代码项目 |
| **用户满意度** | > 4.0/5 | 早期用户反馈 |
| **预置报告查看** | > 50% 用户 | 新用户先体验再使用 |
| **LLM 启用率** | 10-20% | 付费/深度用户 |
| **回访率** | > 30% | 再次使用 |

### 8.2 技术指标

| 指标 | 目标 | 说明 |
|------|------|------|
| **Lighthouse 分数** | > 90 | 性能、可访问性 |
| **首屏加载** | < 2 秒 | FCP |
| **交互响应** | < 100ms | 用户操作反馈 |
| **测试覆盖率** | > 70% | 单元测试 |
| **类型错误** | 0 | TypeScript 严格模式 |

### 8.3 社区指标

| 指标 | 目标 (6 个月) | 说明 |
|------|----------|------|
| **npm downloads/月** | 1000+ | 下载量 |
| **GitHub Stars** | 500+ | 社区关注 |
| **预置报告数量** | 10+ | 社区贡献 |
| **Issue 响应** | < 48 小时 | 维护质量 |

---

## 九、风险与应对

### 9.1 技术风险

| 风险 | 可能性 | 影响 | 应对策略 |
|------|-------|------|---------|
| Tree-sitter 解析性能 | 中 | 中 | Web Worker 并行、增量解析 |
| 大项目内存占用 | 高 | 中 | 分块处理、流式输出 |
| 类型推断不准确 | 高 | 低 | 明确叠甲、置信度展示 |
| LLM API 成本 | 中 | 低 | 用户自备 Key |
| 浏览器兼容性 | 低 | 低 | 渐进增强、降级方案 |

### 9.2 产品风险

| 风险 | 可能性 | 影响 | 应对策略 |
|------|-------|------|---------|
| 用户不买账 | 中 | 高 | 早期反馈、快速迭代 |
| 竞品模仿 | 高 | 中 | 品牌护城河、社区运营 |
| 被误用（代码外传） | 中 | 高 | 明确声明、叠甲文案 |
| 预期管理 | 高 | 中 | 透明化能力边界 |

### 9.3 市场风险

| 风险 | 可能性 | 影响 | 应对策略 |
|------|-------|------|---------|
| 市场饱和 | 中 | 中 | 差异化定位（入职导航） |
| 经济下行 | 中 | 低 | 开源优先、控制成本 |
| 技术变革 | 低 | 中 | 保持技术敏感度 |

---

## 十、视觉设计检查清单

### 10.1 设计一致性

- [ ] 所有颜色使用设计系统变量
- [ ] 所有间距符合 8px 基准
- [ ] 所有圆角统一
- [ ] 所有字体使用 Inter/JetBrains Mono
- [ ] 所有图标风格一致

### 10.2 动画体验

- [ ] 所有动画时长符合规范
- [ ] 所有缓动函数统一
- [ ] 流式输出流畅（60fps）
- [ ] 微交互有反馈
- [ ] 页面过渡平滑

### 10.3 可访问性

- [ ] 颜色对比度符合 WCAG AA
- [ ] 所有图片有 alt 文本
- [ ] 键盘导航可用
- [ ] 焦点状态清晰
- [ ] 支持系统字体大小

### 10.4 响应式

- [ ] 手机端布局正确
- [ ] 平板端布局正确
- [ ] 桌面端布局正确
- [ ] 所有断点测试通过
- [ ] 横竖屏适配

---

## 十一、附录

### 11.1 术语表

| 术语 | 说明 |
|------|------|
| **brepo** | CLI 命令名称 |
| **@briefrepo/cli** | npm 包名 |
| **本地优先** | 代码不出用户电脑 |
| **叠甲** | 免责声明，"仅供参考" |
| **预置报告** | 内置的示例报告 |
| **多维特征** | 项目类型的判断维度 |
| **类型推断** | 通过规则判断项目类型 |

### 11.2 参考资源

- [Tree-sitter 文档](https://tree-sitter.github.io/)
- [GSAP 文档](https://greensock.com/docs/)
- [D3.js 文档](https://d3js.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [pnpm workspace](https://pnpm.io/workspaces)
- [turborepo 文档](https://turbo.build/repo/docs)

### 11.3 更新日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-08-27 | v1.0 | 初始版本 |
| 2026-08-28 | v1.1 | 品牌更名 BriefRepo |
| 2026-08-28 | v2.0 | 全面重构：入职导航定位、CLI 工具、纯本地分析、类型推断系统、视觉设计系统 |

---

**文档维护者**：BriefRepo Team  
**最后更新**：2026-08-28  
**状态**：Draft v2.0  
**许可证**：MIT
---

## 四、LLM Skill 系统

### 4.1 设计原则

| 原则 | 说明 |
|------|------|
| **三档分级** | Basic / Pro / Max，清晰的能力和成本阶梯 |
| **Markdown 配置** | Frontmatter + Markdown 格式，易读易维护 |
| **Basic 零 LLM** | 纯规则实现，零成本，离线可用 |
| **成本透明** | Pro/Max 档明确告知用户 API 成本 |
| **模块化管理** | 每个 Skill 独立配置，易于扩展和维护 |

### 4.2 Skill 配置结构

```
skills/
└── project-type/
    ├── basic.md          # Basic 档（纯规则）
    ├── pro.md            # Pro 档（Zero-shot CoT）
    └── max.md            # Max 档（Few-shot CoT）
```

### 4.3 三档详细对比

| 维度 | Basic | Pro | Max |
|------|-------|-----|-----|
| **LLM 使用** | ❌ 纯规则 | ✅ Zero-shot CoT | ✅ Few-shot CoT |
| **耗时** | ~30 秒 | ~60 秒 | ~120 秒 |
| **成本** | 免费 | $0.003/次 | $0.01/次 |
| **输出维度** | 3 个 | 8 个 | 15+ 个 |
| **置信度** | 规则评分 | LLM 评估 | 证据链 + 详细评估 |
| **叠甲程度** | 简单声明 | 中等提示 | 详细风险提示 |

### 4.4 用户交互

**CLI 使用方式**：

```bash
# Basic 档（默认）
brepo analyze ./my-project

# Pro 档
brepo analyze ./my-project --skill pro --llm-api-key $DEEPSEEK_KEY

# Max 档
brepo analyze ./my-project --skill max --llm-api-key $DEEPSEEK_KEY
```

**UI 交互**：

```
┌─────────────────────────────────────────────┐
│  🎯 分析深度                                 │
├─────────────────────────────────────────────┤
│  Basic ─────○───────── High ───────── Max  │
│                                             │
│  当前：Basic                                │
│  · 耗时：~30 秒                              │
│  · 成本：免费                               │
│  · 输出：基础类型识别 + 置信度                │
└─────────────────────────────────────────────┘
```

### 4.5 技术实现

**Skill Router**：

```typescript
export async function runSkillAnalysis(
  context: ProjectContext,
  tier: 'basic' | 'pro' | 'max'
): Promise<SkillResult> {
  const config = loadSkillConfig(tier);
  
  if (config.useLLM) {
    return await analyzeWithLLM(config, context);
  } else {
    return await analyzeWithRules(config, context);
  }
}
```

**Markdown 解析**：

```typescript
import matter from 'gray-matter';

export function loadSkillConfig(tier: string): SkillConfig {
  const markdown = fs.readFileSync(`skills/project-type/${tier}.md`, 'utf-8');
  const { data, content } = matter(markdown);
  
  return {
    ...data,
    prompt: content
  } as SkillConfig;
}
```

### 4.6 成本公示

**用户可见的成本提示**：

- Basic 档：明确标注"免费"
- Pro 档：明确标注"$0.003/次（约 ¥0.02）"
- Max 档：明确标注"$0.01/次（约 ¥0.07）"

**叠甲声明**：

> 实际成本可能因项目大小、API 提供商定价波动而有所差异。所有成本由用户自行承担（自备 API Key）。

