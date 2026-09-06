---
"@briefrepo/types": patch
"@briefrepo/analyzer-core": patch
"@briefrepo/web-reporter": patch
"@briefrepo/cli": patch
---

chore: platform 推断、diff 复用 renderHtml、清理未用依赖与补测

- types 增加 `platform` kind 与 `isPlatform`，analyzer-core 阈值 `apps>=2 + packages/cli + platform/electron/expo`，template/markdown 已对齐 `platform:#3730a3`
- cli/diff 改为 `renderHtml(combinedResult)` + 注入 diffCard，保留技术栈/依赖差异表，移除内联裸 HTML，统一 tokens/GSAP/D3 风格
- analyzer-core 移除未使用 `p-limit`，`levels/README` 说明内联现状
- 新增 `template.test.ts` 与 `cache.test.ts` 及 platform 2 例，vitest 42/11 全绿
