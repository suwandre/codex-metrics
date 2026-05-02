# Codex Metrics

Local dashboard for Codex JSONL session metrics.

## Requirements

- Bun
- Local Codex session files under `%USERPROFILE%\.codex\sessions` on Windows or `$HOME/.codex/sessions` on macOS/Linux

## Setup

```bash
bun install
```

## Generate Data

```bash
bun run metrics:generate
```

This reads local `rollout-*.jsonl` files and writes `public/metrics.json`. The generated file is ignored by git.

## Run Dashboard

```bash
bun run metrics:generate
bun run dev
```

Open the Vite URL printed by the dev server.

## Production Build

```bash
bun run build
```

The build runs TypeScript validation first, then writes the production bundle to `dist`.

## Verification

Run checks individually:

```bash
bun run typecheck
bun run lint
bun run biome
bun run test
bun run build
```

Or run the full local gate:

```bash
bun run verify
```

Command coverage:

- `typecheck`: TypeScript `--noEmit` check
- `lint`: Biome lint for app source
- `biome`: Biome lint and formatting check for tracked source/config files
- `test`: Bun test suite
- `build`: TypeScript check plus Vite production build
