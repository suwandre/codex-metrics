# Codex Metrics Dashboard PRD

## Project Goal

Build a local Codex metrics dashboard that reads real local Codex usage data first, adds optional OpenAI API reconciliation second, and clearly labels derived or estimated values.

## Current State

- Vite, React, TypeScript, and Bun app is scaffolded.
- Dashboard UI is implemented from `mockups/01-command-center.html`.
- Local Codex JSONL collection exists in `scripts/collect-codex-metrics.ts`.
- Generated local metrics are written to `public/metrics.json`.
- Dashboard displays token, cost, limit, latency, success, throughput, session, and model summary metrics.
- Typecheck, lint, Biome, and production build have passed previously.

## Scope

- Keep the app local-first and privacy-conscious.
- Parse only aggregate event metadata by default.
- Never render prompt or message content by default.
- Preserve the current Vite + React + TypeScript + Bun stack.
- Keep the dashboard visually close to `mockups/01-command-center.html`.
- Add missing production polish through tests, settings, optional API reconciliation, docs, and final quality gates.

## Out Of Scope

- Authentication.
- Hosted SaaS deployment.
- Writing to or mutating the `.codex` directory.
- Raw prompt/session content drilldown by default.
- Replacing the current stack with Next.js or another framework.
- Billing guarantees for estimated local costs.

## Requirements

### Privacy

- The app must not expose raw prompts, assistant messages, secrets, or session transcript content by default.
- Local Codex files are read-only inputs.
- Any future raw-content view must be explicitly opt-in.

### Local Metrics

- The app must continue to work without an OpenAI API key.
- Local metrics must be labeled by source where useful: `local`, `derived`, `estimated`, or `API`.
- Missing, malformed, or unreadable local files must produce usable empty/error states instead of crashing.

### Optional API Reconciliation

- OpenAI Usage and Costs API integration must be optional.
- API key must come from environment only.
- If API data exists, API-backed costs can supersede local estimates.
- If API data is unavailable, dashboard must continue showing local estimates.
- UI must explain that ChatGPT plan usage and OpenAI API billing can differ.

### Settings

- Provide settings for Codex home path, default date range, pricing assumptions, currency, privacy mode, refresh behavior, and optional cache controls.
- Defaults must preserve current behavior.
- Settings must not require authentication.

### Tests

- Add focused automated coverage for high-risk parsing and aggregation behavior.
- Include fixtures for valid sessions, token counts, rate limits, tool failures, corrupt lines, and unknown event types.
- UI tests should cover empty, loading, error, populated, and mobile/responsive states where practical.

### Quality Gates

- After JS/TS changes, run:
  - `bunx tsc --noEmit`
  - `bun run lint`
  - `bun run biome`
  - `bun run build`
- Verify no sensitive local content is rendered.
- Verify no secrets are committed.
- Keep code simple, named clearly, and avoid unnecessary abstraction.

## Acceptance Criteria

- Remaining work is split into small tasks in `TASKS.md`.
- Each task can be implemented, checked, committed, and reviewed independently by the Codex loop.
- The final dashboard remains local-first and works without API configuration.
- Documentation explains how to run, what data sources are supported, which values are estimates, and what privacy guarantees exist.
