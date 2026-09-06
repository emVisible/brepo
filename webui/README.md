# @briefrepo/webui — 沉浸式 3D PowerBI（Next.js 15）

> 唯一 Web 主场，3D 唯一实现在此。

## 职责

*   `app/` — App Router：`/` 分析表单，`/r/[id]` 沉浸报告，`/history` 历史，`app/api/*` Route Handlers
*   `components/scene/` — 两个视图：`TreemapScene`（默认首视图：找文件）/`CityScene`（关系视图：依赖弧线+枢纽光环+环红闪+死城灰化+入口光柱，原生 Three）；图谱已合并进分布（`GraphScene` 删除）；`RENDER` 阈值 + `extTile` 色板来自 `@briefrepo/tokens`；无 R3F
*   融合：分布 lens `在 3D 中查看 →` 切城市并飞镜到该楼（选中态共享 + 900ms 相机补间）
*   `lib/treemap.ts` — squarify 纯函数：`w` 取最长边 + 尾行保护（孤儿不单独成行）；rest 尘埃仓封顶 12% 且就地布局；度量 `lines|count`（等权平铺）；node 可直接验面积/总数/无溢出守恒
*   `components/hud/` — `DirTree`（GitHub 式目录树+热点，驱动 treemap 过滤）/`HotspotRail`（城市·图谱左下角热点榜）；`KpiBar`/`Inspector` 已删除并入顶/底栏
*   `lib/` — `api-client`（typed SSE）、`store`（zustand）、`analyzer`（服务端薄封装）、`github`（tarball）
*   `styles/` — `tokens` re-export + `globals.css`（新设计语言）

## 开发

```bash
pnpm dev                                  # → http://localhost:3000/
pnpm --filter @briefrepo/webui build
pnpm --filter @briefrepo/webui typecheck
```

## API

*   `POST /api/analyze` 非流式：`{path, includeExts?}`
*   `POST /api/analyze/stream` SSE（`maxDuration 60`，Vercel）
*   `GET /api/doctor`

## 约束

*   客户端禁止 `import @briefrepo/analyzer-core`（会拉起 `node:fs`）；3D 阈值从 `@briefrepo/tokens` 取
*   服务端（Route Handlers，`runtime=nodejs`）才可 `import @briefrepo/analyzer-core`
*   常态沉浸：无沉浸开关；HUD 为上下两条透明线（顶栏=品牌+指标+视图，底栏=图例+读数/详情），右轨已删除；字体经 `next/font` Geist 坐实，数字 `tabular-nums`
*   视图序：分布 → 城市；分布左栏目录树，城市左下角热点榜，空间按视图复用
*   首页：双语（`/` 中文，`/en` 英文，首访按 Accept-Language 分流，显式路径优先）；深色单主题；Logo 与 favicon 同源 `app/icon.svg`（线稿指南针）；背景=幽灵 treemap 潮汐 + 数据流线 + 聚焦入场（`prefers-reduced-motion` 全停）
*   动效：`framer-motion`（HUD）+ `gsap`（日志流，待接入）+ 原生 `requestAnimationFrame`（相机阻尼 `dampingFactor .06`）
