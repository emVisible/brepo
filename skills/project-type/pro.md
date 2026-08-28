---
id: project-type-pro
name: 项目类型识别
tier: pro
version: 1.0.0
updatedAt: 2026-08-28

# Pro 档配置
useLLM: true
model: deepseek-chat
temperature: 0.3
maxTokens: 800
executionTime: ~60s
cost: $0.003
outputDimensions: 8

# Prompt 配置
systemPrompt: |
  你是一个代码分析专家，拥有 10 年开源项目评估经验。
  请基于提供的项目信息，分析这个项目的类型和定位。
  
  分析维度：
  1. 项目结构特征（是否有 UI、CLI、API 等）
  2. 文档特征（用户指南 vs API 文档）
  3. 依赖特征（框架还是应用）
  4. Git 历史特征（活跃度、贡献者数量）
  5. 技术栈特征（面向用户还是面向开发者）
  
  请逐步推理，给出类型判断和置信度。
  每个结论都必须有证据支持。
  如果信息不足，明确指出"信息不足"。

# Few-shot 示例（可选）
fewShots: []

# 输出 JSON Schema
outputSchema: |
  {
    "type": "product|library|documentation|experimental|tutorial|hybrid",
    "confidence": 0-100,
    "reasoningSteps": ["step1", "step2", ...],
    "features": {
      "hasUI": boolean,
      "hasCLI": boolean,
      "hasAPIDocs": boolean,
      "hasUserGuide": boolean
    },
    "reasons": ["reason1", "reason2", ...],
    "informationGaps": ["gap1", ...],
    "disclaimer": "string"
  }

# 叠甲声明
disclaimer: "基于 AI 模型和项目静态信息推断，结果仅供参考。建议结合人工判断和实际使用体验。"
---

# 项目类型识别 - Pro Skill

## 分析框架

### Step 1: 产品定位分析

**目标**：识别项目的核心定位和目标用户

**分析维度**：
- 目标用户群体（C 端消费者 / B 端企业 / 开发者）
- 核心价值主张（解决什么问题）
- 使用场景（在什么情况下使用）

**LLM Prompt 示例**：
```
这个项目的主要目标用户是谁？请从以下维度分析：
1. 技术栈特征（是否包含 UI 框架、CLI 工具、SDK 等）
2. 文档类型（用户指南、API 文档、教程等）
3. 入口特征（独立应用、库导入、在线服务等）

基于以上特征，判断这是面向最终用户的产品，还是面向开发者的工具。
```

### Step 2: 技术架构评估

**目标**：评估代码质量和架构健康度

**分析维度**：
- 代码组织（模块化程度、目录结构）
- 依赖管理（依赖数量、质量、更新频率）
- 测试覆盖（是否有测试、测试类型）
- 代码风格（一致性、注释质量）

**LLM Prompt 示例**：
```
从以下维度评估这个项目的技术健康度：
1. 代码组织是否清晰？
2. 依赖是否合理？
3. 是否有测试覆盖？
4. 代码质量如何？

给出简短评估和证据。
```

### Step 3: 文档完整性分析

**目标**：评估项目文档的完整性和类型

**分析维度**：
- README 质量（描述、安装、使用、贡献指南）
- 文档类型（技术文档 vs 用户文档）
- 文档更新频率（与代码同步程度）

**LLM Prompt 示例**：
```
分析这个项目的文档特征：
1. README 是否包含完整的使用说明？
2. 文档是面向用户的还是面向开发者的？
3. 文档更新是否与代码同步？

基于文档特征，判断项目类型。
```

### Step 4: Git 历史分析

**目标**：从提交历史推断项目性质

**分析维度**：
- 提交频率（定期更新 vs 偶尔更新）
- 贡献者数量（个人 vs 团队）
- 提交信息质量（规范性、描述性）
- 最近活跃时间

**LLM Prompt 示例**：
```
基于 Git 历史特征分析：
1. 提交频率和模式
2. 贡献者数量和角色分布
3. 最近活跃度

判断这是个人项目、团队项目还是组织项目。
```

## 输出要求

1. **每个结论必须有证据支持**
   - 证据来自：文件结构、文档内容、依赖列表、Git 历史

2. **明确指出信息不足的部分**
   - 例如：`"缺少测试覆盖信息，无法评估代码质量"`

3. **给出置信度**（0-100%）
   - 基于证据的充分性和一致性

4. **提供 actionable 建议**
   - 例如：`"建议查看 CONTRIBUTING.md 了解更多贡献指南"`

5. **保持智力诚实**
   - 承认真实的不确定性
   - 不编造信息
   - 不夸大确定性

## 输出 Schema

```json
{
  "type": "product",
  "confidence": 85,
  "reasoningSteps": [
    "Step 1: 项目包含 React 和 Electron，说明有 UI 界面",
    "Step 2: README 描述的是用户功能，不是 API 用法",
    "Step 3: 有用户指南和截图，说明面向最终用户",
    "Step 4: 贡献者数量较多（8 人），说明是团队项目"
  ],
  "features": {
    "hasUI": true,
    "hasCLI": false,
    "hasAPIDocs": false,
    "hasUserGuide": true
  },
  "reasons": [
    "包含 Electron 桌面应用",
    "有详细的用户指南",
    "README 展示的是产品功能"
  ],
  "informationGaps": [
    "没有发现定价信息"
  ],
  "disclaimer": "基于 AI 模型和项目静态信息推断，结果仅供参考。"
}
```

## 成本估算

- **输入 Token**：~2000（项目上下文）
- **输出 Token**：~500（分析结果）
- **单次成本**：$0.003（基于 DeepSeek 定价）

## 性能约束

- ✅ 分析时间：< 60 秒
- ✅ 内存占用：< 300MB
- ✅ API 调用：1 次
- ✅ 成本透明：用户自备 Key

---

**最后更新**：2026-08-28  
**状态**：设计完成，待实现