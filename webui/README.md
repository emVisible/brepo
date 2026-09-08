# @briefrepo/webui — 沉浸式报告（Next.js 15）

> 唯一 Web 主场。分布（自适应岛屿 + 无限画布）与城市（关系）深度融合，联邦互跳。

## 职责

* `app/` — `App Router`：`/`（GitHub 仓库表单，支持 `owner/repo` 速记与多形态链接，预检+归一化），`/r/[id]` 沉浸报告，`app/api/analyze|stream`（`runtime=nodejs, maxDuration 300`，GitHub-only，`400` 明示），`app/api/doctor`
* `components/scene/` — `TreemapScene`（无限画布：`view {x,y,scale}` 平移缩放、视口剔除、`800` 阈值提示、`masonry` 多行、语义簇 `entry/hot/fe/be/doc/other`）/`CityScene`（`Three` 原生 `InstancedMesh`，依赖弧线 `hover` 时、街区基座互跳）；`RENDER` 阈值来自 `@briefrepo/tokens`
* `components/hud/` — `DirTree`（虚拟列表 `ROW_H 22` + 搜索双侧高亮 + 已过滤徽标）/`HotspotRail`
* `lib/` — `api-client`（typed SSE + `StallError` 看门狗 + 错误详情透传）、`store`（`zustand`，`selected/hover/search/treemapRoot` 联邦状态）、`github`（`codeload` tarball + `tar-slip` 防护 + `SHA` 缓存 `2GB/3版本` + `singleflight` + 速度/ETA）、`workspace`（`.brepo/tmp` 优先，`cache` 受保护，`sweepStaleTmp`）、`islands`（语义簇纯函数）、`repo-check`（预检）、`rate-limit`（`20/min/IP`）、`treemap`（`squarify` 纯函数，面积/总数守恒）
* `styles/` — `tokens` 单源，`globals.css` 设计语言

## 开发

```bash
pnpm dev                                  # → http://localhost:3000/
pnpm --filter @briefrepo/webui build
pnpm --filter @briefrepo/webui typecheck
```

## API

* `POST /api/analyze` 非流式：`{path, includeExts?}` — `path` 仅接受 GitHub 仓库（含 `owner/repo` 速记，`parseRepoInput` 归一化），`429` 限流
* `POST /api/analyze/stream` SSE：`{path, includeExts?}` 首字节即时发出，下载中 `2MB/1.2s` 节流 `下载中… N/M MB · X MB/s` + `命中缓存·秒开`
* `GET /api/doctor`

## 约束

* 客户端禁止 `import @briefrepo/analyzer-core`（会拉起 `node:fs`）；3D/阈值从 `@briefrepo/tokens` 取
* 服务端（Route Handlers，`runtime=nodejs`）才可 `import @briefrepo/analyzer-core`（`worker_threads` 隔离，可取消）
* 常态沉浸：无开关；HUD 为上下两条透明线（顶栏=品牌+指标+视图，底栏=图例+读数/详情 + 视口外提示），左栏 240px 可拖拽（200–420px）磨砂导航器 + 右侧 96px 纵览 Overlay（可点击/拖拽）
* 视图序：分布 ↔ 城市深度融合（同 `treemapRoot` 街区焦点，`flyToDistrict`/`flyTo` 互跳，`hover` 高亮同源）
* 过滤：`test/generated/media` 默认不进分布/城市（面积与依赖计算基于有效集，`fileCountAll/filteredCount` 双口径，左树淡化占位 + 徽标，`islands` 语义簇整岛淡化）
* 首页：双语（`/` 中文，`/en` 英文，首访按 `Accept-Language` 分流，显式路径优先）；深色单主题；背景=幽灵 treemap 潮汐 + 数据流线 + 聚焦入场（`prefers-reduced-motion` 全停）
* 动效：`framer-motion`（HUD）+ 原生 `requestAnimationFrame`（画布平移缩放 `rAF` 节流、相机阻尼 `0.06`）
