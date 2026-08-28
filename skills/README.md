# LLM Skill 系统

## 设计原则

- **三档分级**：Basic / Pro / Max
- **配置方式**：Markdown + Frontmatter
- **Basic 档**：100% 纯规则，零 LLM
- **Pro/Max 档**：用户自备 API Key，成本透明
- **模块化设计**：每个 Skill 独立配置文件

## Skill 配置结构

```
skills/
└── project-type/
    ├── basic.md          # Basic 档（纯规则）
    ├── pro.md            # Pro 档（Zero-shot CoT）
    └── max.md            # Max 档（Few-shot CoT）
```

## 配置格式

每个 Skill 配置使用 Markdown + Frontmatter：

```markdown
---
id: project-type-basic
name: 项目类型识别
tier: basic
version: 1.0.0
updatedAt: 2026-08-28

# 配置参数
useLLM: false
executionTime: ~30s
cost: $0
outputDimensions: 3
disclaimer: "基于静态规则推断，仅供参考"
---

# 分析逻辑

（Markdown 格式的详细分析逻辑）

## 特征维度
## 评分规则
## 置信度计算
```