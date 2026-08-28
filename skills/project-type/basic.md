---
id: project-type-basic
name: 项目类型识别
tier: basic
version: 1.0.0
updatedAt: 2026-08-28

# Basic 档配置
useLLM: false
executionTime: ~30s
cost: $0
outputDimensions: 3

# 输出字段
outputs:
  - type: 项目类型（5 种）
  - confidence: 置信度（0-100%）
  - reasons: 推断理由（最多 3 条）

# 叠甲声明
disclaimer: "基于静态规则推断，仅供参考。实际情况可能与推断结果存在差异。"
---

# 项目类型识别 - Basic Skill

## 分析逻辑

基于多维特征加权评分系统，100% 纯规则实现，零 LLM 调用。

### 特征维度

1. **技术特征**
   - hasUI: 是否包含 UI 框架（React/Vue/Angular/Electron）
   - hasCLI: 是否有 bin 字段或 CLI 入口
   - hasDesktopApp: 是否有桌面应用特征（.app/.exe/-electron 配置）
   - hasMobileApp: 是否有移动端特征（React Native/Flutter）

2. **文档特征**
   - hasUserGuide: 是否有用户指南（非 API 文档）
   - hasAPIDocs: 是否有 API 文档
   - hasScreenshots: 是否有产品截图
   - hasDemo: 是否有 Demo/示例

3. **元数据特征**
   - hasHomepage: 是否有独立官网
   - hasPricing: 是否有定价页面
   - hasDownload: 是否有下载入口
   - contributors: 贡献者数量

### 评分规则

```typescript
// 产品应用特征（+ 分项）
if (hasUI) score += 20
if (hasCLI) score += 15
if (hasUserGuide) score += 15
if (hasScreenshots) score += 15
if (hasDownload) score += 20
if (hasHomepage) score += 10
if (hasPricing) score += 15

// 库/框架特征（+ 分项）
if (hasAPIDocs && !hasUI) score -= 20  // 减法表示库特征
if (isFramework) score -= 25
if (hasExportInterfaces) score -= 15

// 文档仓库特征
if (docRatio > 0.8) type = 'documentation'

// 实验性质特征
if (commitHistory < 30 && readme.includes('experimental')) type = 'experimental'

// 学习性质特征
if (name.includes('tutorial|learn|example')) type = 'tutorial'
```

### 类型判断

```
productScore >= libraryScore + 20  →  product（产品应用）
libraryScore >= productScore + 20  →  library（库/框架）
文档占比 > 80%                     →  documentation（文档仓库）
提交历史短 + 探索性                 →  experimental（实验性质）
教程/练手项目                       →  tutorial（学习性质）
其他                              →  other（其他）
```

## 置信度计算

```typescript
confidence = (规则匹配数 / 总规则数) × 100

// 置信度分级
confidence >= 80 → high
confidence 60-79 → medium
confidence < 60  → low
```

## 理由生成

基于命中的规则，生成最多 3 条推断理由：

```typescript
reasons = []
if (hasUI) reasons.push('包含 UI 界面')
if (hasUserGuide) reasons.push('有用户指南')
if (hasScreenshots) reasons.push('有产品截图')
if (hasAPIDocs) reasons.push('有 API 文档')
if (contributors >= 5) reasons.push('多人协作')
```

## 输出版式

```typescript
interface BasicResult {
  type: 'product' | 'library' | 'documentation' | 'experimental' | 'tutorial' | 'other'
  confidence: number  // 0-100
  reasons: string[]   // max 3
  disclaimer: string
}
```

## 性能约束

- ✅ 分析时间：< 30 秒（10k 行代码）
- ✅ 内存占用：< 200MB
- ✅ 零 API 调用
- ✅ 离线可用

---

**最后更新**：2026-08-28  
**状态**：可用的 MVP 版本