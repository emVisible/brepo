# Levels — 保留目录

`analyzer.ts` 目前以内联形式实现了 `Level0`（基础信息）与 `Level1`（结构/依赖/复杂度），
纯本地静态分析，无 LLM 依赖。

本目录保留用于未来拆分：`level0-basic.ts / level1-structure.ts` 等，
以保持最小 diff 原则，现阶段不强行抽取，避免空转重构。
