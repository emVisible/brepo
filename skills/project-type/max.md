---
id: project-type-max
name: 项目类型识别
tier: max
version: 1.0.0
updatedAt: 2026-08-28

# Max 档配置
useLLM: true
model: deepseek-chat
temperature: 0.5
maxTokens: 2000
executionTime: ~120s
cost: $0.01
outputDimensions: 15+

# Prompt 配置
systemPrompt: |
  你是一位资深产品分析师，拥有 10 年技术尽调经验，
  曾任 a16z、Sequoia 等顶级 VC 的技术顾问。
  
  你的专长是从代码仓库识别产品定位、市场机会和竞争风险。
  
  请使用以下分析框架进行系统性分析，每个结论都必须有证据支持。

# 完整分析框架
analysisFramework:
  - 产品定位分析（目标用户、价值主张、使用场景）
  - 市场竞品分析（竞品识别、差异化、市场定位）
  - 商业模式推断（收入来源、定价策略、增长路径）
  - 技术风险评估（架构健康度、技术债、团队风险）

# Few-shot 示例
fewShots:
  - product-example-1.json
  - library-example-1.json

# 输出 JSON Schema
outputSchema: |
  {
    "type": "product|library|documentation|experimental|tutorial|hybrid|platform",
    "confidence": 0-100,
    
    "analysis": {
      "productPositioning": {
        "targetUsers": string[],
        "valueProposition": string,
        "useCases": string[]
      },
      "technicalHealth": {
        "codeQuality": string,
        "architectureScore": 0-100,
        "technicalDebt": string[]
      },
      "businessModel": {
        "potentialRevenue": string[],
        "pricingHints": string,
        "competitors": string[]
      },
      "risks": [{
        "type": "technical|market|team|legal",
        "description": string,
        "severity": "low|medium|high",
        "mitigation": string
      }]
    },
    
    "evidence": [{
      "claim": string,
      "source": string,
      "confidence": 0-100
    }],
    
    "recommendations": string[],
    "informationGaps": string[],
    "disclaimer": string
  }

# 叠甲声明
disclaimer: |
  本分析基于 AI 模型和有限信息推断，
  不构成投资或商业决策建议。
  建议结合专业尽调和人工判断。
---

# 项目类型识别 - Max Skill

## 角色设定

你是一位资深产品分析师，拥有 10 年技术尽调经验。你的工作是为顶级投资机构评估早期技术项目的商业价值和技术风险。

你擅长：
- 从代码仓库识别产品定位
- 从技术栈推断市场机会
- 从项目结构评估团队能力
- 从文档质量判断商业化程度

## 完整分析框架

### Step 1: 产品定位分析

**深度分析维度**：

1. **目标用户识别**
   - C 端消费者：看 UI、用户体验设计、营销语言
   - B 端企业：看企业功能、权限管理、集成能力
   - 开发者：看 API 文档、SDK、代码示例
   
2. **价值主张提取**
   - 从 README 提取核心价值描述
   - 从功能列表推断解决的痛点
   - 从用户评价（如有）了解实际价值

3. **使用场景还原**
   - 在什么情况下会使用这个项目？
   - 替代了哪些现有方案？
   - 创造了什么新需求？

**LLM Prompt**：
```
请基于以下信息深度分析产品定位：

### 项目信息
- README 摘要：{readmeSummary}
- 主要功能：{features}
- 技术栈：{techStack}
- 依赖特征：{dependencies}

### 分析任务
1. 识别目标用户群体（C 端/B 端/开发者）
2. 提取核心价值主张（解决了什么问题）
3. 还原典型使用场景（何时、何地、为何使用）

每个结论都必须引用具体证据：
- "这是一个 C 端产品" ← 必须说明"基于 UI 组件和截图"
- "目标是中小企业" ← 必须说明"基于团队协作功能"
```

### Step 2: 市场竞品分析

**深度分析维度**：

1. **竞品识别**
   - 从技术栈推断赛道
   - 从功能列表找直接竞品
   - 从 README 提到的替代方案

2. **差异化分析**
   - 技术差异化（不同的技术方案）
   - 功能差异化（独特的功能点）
   - 定位差异化（不同的目标用户）

3. **市场定位推断**
   - 高端/中端/低端市场
   - 大众市场/利基市场
   - 新兴市场/成熟市场

**LLM Prompt**：
```
基于以下信息识别潜在竞品和市场定位：

### 已知信息
- 项目类型：{projectType}
- 核心功能：{keyFeatures}
- 技术栈：{techStack}
- 定价线索：{pricingHints}

### 分析任务
1. 列出 3-5 个潜在竞品（说明理由）
2. 分析这个项目的差异化优势
3. 推断目标市场定位（高端/中端/低端）

提示：
- 竞品可以是直接的（同样功能）或间接的（解决同样问题）
- 差异化可能是技术更佳、体验更好、价格更低、或定位不同
```

### Step 3: 商业模式推断

**深度分析维度**：

1. **收入来源识别**
   - SaaS 订阅（看是否有在线服务）
   - 开源核心 + 企业版（看许可证策略）
   - API 调用付费（看是否有 API 限制）
   - 一次性购买（看是否有下载链接）

2. **定价策略推断**
   - 免费版 + 高级版（Freemium）
   - 按使用量付费（Usage-based）
   - 企业定制（Enterprise）
   - 完全免费（开源/捐赠）

3. **增长路径分析**
   - 开源社区驱动
   - 内容营销驱动
   - 销售团队驱动
   - 合作伙伴生态

**LLM Prompt**：
```
从以下维度推断可能的商业模式：

### 分析线索
- 许可证：{license}
- 部署方式：{deployment}
- 功能边界：{features}
- 收费线索：{pricingHints}

### 推断任务
1. 最可能的收入来源是什么？
2. 定价策略可能是什么？
3. 增长路径是怎样的？

提示：
-  MIT 许可证 + 在线服务 = 可能是 SaaS
-  AGPL 许可证 = 可能是开源核心 + 企业版
-  有 API 限制 = 可能是 API 调用付费
```

### Step 4: 技术风险评估

**深度分析维度**：

1. **技术风险**
   - 架构耦合度
   - 技术债积累
   - 依赖风险（过时、漏洞、替代品）

2. **市场风险**
   - 市场规模是否足够大
   - 竞争是否过度激烈
   - 是否有被替代风险

3. **团队风险**
   - 贡献者数量（单一贡献者风险）
   - 更新频率（持续维护能力）
   - 文档质量（团队专业性）

**LLM Prompt**：
```
评估这个项目的三大风险：

### 技术风险
- 代码复杂度：{complexity}
- 测试覆盖：{testCoverage}
- 依赖健康度：{dependencies}

### 市场风险
- 赛道拥挤度：{competition}
- 技术迭代：{techTrends}
- 用户粘性：{stickiness}

### 团队风险
- 贡献者数量：{contributors}
- 更新频率：{commitFrequency}
- 文档质量：{docQuality}

请分别评估每个风险维度，给出风险等级和缓解建议。
```

## 输出 Schema

```json
{
  "type": "product",
  "confidence": 85,
  
  "analysis": {
    "productPositioning": {
      "targetUsers": ["中小型企业", "营销团队"],
      "valueProposition": "一键生成营销报告，节省 80% 手工制表时间",
      "useCases": ["周报月报生成", "数据可视化", "客户报告"]
    },
    "technicalHealth": {
      "codeQuality": "良好，代码组织清晰，注释充分",
      "architectureScore": 78,
      "technicalDebt": ["测试覆盖率不足", "部分 API 未版本化"]
    },
    "businessModel": {
      "potentialRevenue": ["SaaS 订阅", "企业定制"],
      "pricingHints": "有团队协作功能，可能是 Freemium 模式",
      "competitors": ["竞品 A", "竞品 B"]
    },
    "risks": [
      {
        "type": "technical",
        "description": "测试覆盖不足，可能有潜在 Bug",
        "severity": "medium",
        "mitigation": "建议在关键模块增加单元测试"
      }
    ]
  },
  
  "evidence": [
    {
      "claim": "这是一个面向 B 端的产品",
      "source": "README 提到'企业级功能'和'团队协作'",
      "confidence": 90
    }
  ],
  
  "recommendations": [
    "建议深入了解目标用户的具体需求",
    "建议关注竞品的定价策略",
    "建议优先补充测试覆盖"
  ],
  
  "informationGaps": [
    "缺少明确的定价信息",
    "未发现用户评价或案例研究"
  ],
  
  "disclaimer": "本分析基于 AI 模型和有限信息推断，不构成投资或商业决策建议。"
}
```

## Few-shot 示例

### 示例 1：产品应用

**Input**：
```json
{
  "name": "ChartGen Pro",
  "techStack": ["React", "Chart.js", "Electron"],
  "features": ["拖拽生成图表", "模板库", "导出 PDF/PPT"],
  "readme": "企业级图表生成工具，帮助营销团队快速生成专业报告..."
}
```

**Output**：
```json
{
  "type": "product",
  "confidence": 95,
  "analysis": {
    "productPositioning": {
      "targetUsers": ["营销团队", "中小企业"],
      "valueProposition": "快速生成专业图表，节省 80% 报告制作时间"
    }
  },
  "reasoning": "Electron 桌面应用 + 营销场景 = C 端产品"
}
```

### 示例 2：库/框架

**Input**：
```json
{
  "name": "react-easy-chart",
  "techStack": ["React", "D3.js", "TypeScript"],
  "features": ["图表组件", "响应式设计", "主题定制"],
  "readme": "React 图表组件库，基于 D3.js 构建..."
}
```

**Output**：
```json
{
  "type": "library",
  "confidence": 90,
  "analysis": {
    "productPositioning": {
      "targetUsers": ["前端开发者"],
      "valueProposition": "简化的 React 图表组件，无需学习 D3 复杂性"
    }
  },
  "reasoning": "React 组件库 + 开发者文档 = 面向开发者的库"
}
```

## 成本估算

- **输入 Token**：~8000（完整项目上下文）
- **输出 Token**：~1500（深度分析）
- **单次成本**：$0.01（基于 DeepSeek 定价）

## 性能约束

- ✅ 分析时间：< 120 秒
- ✅ 内存占用：< 500MB
- ✅ API 调用：1 次
- ✅ 成本透明：用户自备 Key
- ✅ 输出验证：JSON Schema 严格校验

---

**最后更新**：2026-08-28  
**状态**：设计完成，待实现