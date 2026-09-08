# BriefRepo

> Paste a repo, preview its map.

[中文文档](./README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

BriefRepo analyzes a GitHub repo (full URL or `owner/repo` shorthand) and renders an interactive navigation report: a treemap for finding files, and a 3D city for dependency arcs, cycles, dead files, and entry points. Analysis is local-first static analysis — no code leaves your machine.

## Quickstart

```bash
pnpm install && pnpm dev        # → http://localhost:3000/
```

## Structure

```
brepo/
├── webui/                  # Next.js 15 web app (treemap + city views, bilingual)
├── packages/
│   ├── types/              # Shared types
│   ├── tokens/             # Single-source design tokens
│   └── analyzer-core/      # Engine: parsers + analysis + events
```

Stack: `TypeScript strict` · `pnpm workspace + turbo` · `Next.js 15 + React 18` · `Three.js 0.160` (vanilla, no R3F) · `framer-motion` · `simple-git`

## Develop

```bash
pnpm dev                                  # → http://localhost:3000/
pnpm vitest run                           # tests
```

## Privacy

Analysis fetches the public GitHub tarball server-side (no keys, `codeload.github.com`), then runs fully local static analysis. No code is sent to third-party AI services. History lives only in your browser.

## License

MIT © BriefRepo Contributors — see [LICENSE](LICENSE)
