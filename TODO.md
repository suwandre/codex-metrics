# Codex Metrics Dashboard TODO

Target design: `mockups/01-command-center.html`

Goal: Build a local Codex metrics dashboard with real local Codex data first, API-backed reconciliation second, and clearly labeled estimates where exact data is unavailable.

## Current Status

- [x] Git repo initialized.
- [x] Git origin set to `codex-metrics`.
- [x] Vite + React + TypeScript app scaffolded.
- [x] Mockup 01 ported into working dashboard UI.
- [x] Local Codex JSONL collector implemented.
- [x] `public/metrics.json` generated from local `.codex` sessions.
- [x] Token, cost, limit, latency, success, throughput, session, and model summary metrics wired.
- [x] Typecheck, lint, Biome, and production build pass.
- [x] Dev server running at `http://127.0.0.1:5173/`.
- [ ] Optional OpenAI Usage/Costs API reconciliation not implemented yet.
- [ ] Settings page not implemented yet.
- [ ] Automated tests not implemented yet.

## Phase 0 - Product Scope Lock

- [ ] Confirm target runtime
  - [ ] Option A: static HTML + local JSON export.
  - [ ] Option B: Bun/Node local web app.
  - [ ] Option C: Next.js dashboard.
- [ ] Confirm privacy boundary
  - [ ] Never render prompt/message content by default.
  - [ ] Only read aggregate event metadata from `.codex`.
  - [ ] Add explicit toggle later if raw session drilldown is wanted.
- [ ] Confirm first dashboard route
  - [ ] Overview page based on `01-command-center.html`.
  - [ ] No auth for local-only version.
  - [ ] Read-only filesystem access.
- [ ] Confirm primary metric period
  - [ ] Default: last 7 days.
  - [ ] Secondary: current session, today, last 30 days, all time.

## Phase 1 - Repo / App Foundation

- [ ] Inspect existing repo structure.
- [ ] Choose project stack based on what already exists.
- [ ] If empty repo, scaffold minimal Bun + Vite + React + TypeScript app.
- [ ] Add app scripts
  - [ ] `bun run dev`
  - [ ] `bun run build`
  - [ ] `bunx tsc --noEmit`
  - [ ] `bun run lint` if linter configured.
  - [ ] `bun run biome` or `bunx biome check .` if Biome configured.
- [ ] Add base layout
  - [ ] Sidebar.
  - [ ] Topbar filters.
  - [ ] Metric cards.
  - [ ] Charts.
  - [ ] Tables.
- [ ] Keep design close to mockup 01
  - [ ] Warm cream background.
  - [ ] Black/green accent.
  - [ ] Peec-like bold typography.
  - [ ] Dense dashboard layout.
  - [ ] 8px card radius.
  - [ ] No purple/blue dominant theme.

## Phase 2 - Local Codex Data Discovery

- [ ] Locate Codex home directory
  - [ ] Windows: `%USERPROFILE%\.codex`
  - [ ] Unix fallback: `$HOME/.codex`
- [ ] Detect available files
  - [ ] `sessions/**/rollout-*.jsonl`
  - [ ] `history.jsonl`
  - [ ] `models_cache.json`
  - [ ] `log/codex-tui.log`
  - [ ] `logs_2.sqlite`
  - [ ] `state_5.sqlite`
- [ ] Build file discovery service
  - [ ] Recursive session JSONL scan.
  - [ ] Sort by timestamp / file modified time.
  - [ ] Ignore unreadable/corrupt files with warning.
  - [ ] No destructive writes to `.codex`.
- [ ] Build parser for JSONL events
  - [ ] Parse line-by-line.
  - [ ] Skip invalid JSON lines.
  - [ ] Capture only event metadata needed for metrics.
  - [ ] Avoid loading huge files fully into memory.

## Phase 3 - Event Schema Extraction

- [ ] Support `session_meta`
  - [ ] Session id.
  - [ ] Timestamp.
  - [ ] Working directory.
  - [ ] CLI version.
  - [ ] Source.
  - [ ] Model provider.
- [ ] Support `turn_context`
  - [ ] Turn id.
  - [ ] Current date.
  - [ ] Timezone.
  - [ ] Sandbox policy.
  - [ ] Approval policy.
- [ ] Support `task_started`
  - [ ] Turn id.
  - [ ] Started at.
  - [ ] Model context window.
  - [ ] Collaboration mode.
- [ ] Support `token_count`
  - [ ] Total input tokens.
  - [ ] Total cached input tokens.
  - [ ] Total output tokens.
  - [ ] Total reasoning output tokens.
  - [ ] Total tokens.
  - [ ] Last input tokens.
  - [ ] Last cached input tokens.
  - [ ] Last output tokens.
  - [ ] Last reasoning output tokens.
  - [ ] Last total tokens.
  - [ ] Model context window.
- [ ] Support `token_count.rate_limits`
  - [ ] Limit id.
  - [ ] Plan type.
  - [ ] Primary used percent.
  - [ ] Primary window minutes.
  - [ ] Primary reset timestamp.
  - [ ] Secondary used percent.
  - [ ] Secondary window minutes.
  - [ ] Secondary reset timestamp.
  - [ ] Rate-limit reached type.
- [ ] Support tool events
  - [ ] `function_call`
  - [ ] `function_call_output`
  - [ ] `exec_command_end`
  - [ ] `web_search_call`
  - [ ] `web_search_end`
  - [ ] `view_image_tool_call`
- [ ] Support message events without content rendering
  - [ ] Count user messages.
  - [ ] Count assistant messages.
  - [ ] Count turns.
  - [ ] Do not expose prompt text by default.

## Phase 4 - Metrics Engine

- [ ] Token metrics
  - [ ] Current session tokens.
  - [ ] Total tokens.
  - [ ] Daily tokens.
  - [ ] Weekly tokens.
  - [ ] Monthly tokens.
  - [ ] Input vs cached input vs output vs reasoning output.
  - [ ] Average tokens per turn.
  - [ ] p50/p95 tokens per turn.
  - [ ] Largest sessions by tokens.
- [ ] Cost metrics
  - [ ] Maintain model pricing map.
  - [ ] Input cost.
  - [ ] Cached input cost.
  - [ ] Output cost.
  - [ ] Reasoning output handling.
  - [ ] Total estimated cost.
  - [ ] Cost per session.
  - [ ] Cost per day.
  - [ ] Cost saved from cached input.
  - [ ] Mark as estimated unless reconciled with OpenAI Costs API.
- [ ] Limit metrics
  - [ ] 5 hour usage used percent.
  - [ ] 5 hour reset time.
  - [ ] Weekly usage used percent.
  - [ ] Weekly reset time.
  - [ ] Limit status: ok / watch / capped.
  - [ ] Time until reset.
- [ ] Model metrics
  - [ ] Model usage breakdown.
  - [ ] Model token share.
  - [ ] Model cost share.
  - [ ] Model latency if derivable.
  - [ ] Model success rate if derivable.
- [ ] Latency metrics
  - [ ] Average turn latency.
  - [ ] p50/p95 turn latency.
  - [ ] Average tool latency.
  - [ ] Slowest sessions.
  - [ ] Label as derived.
- [ ] Throughput metrics
  - [ ] Tokens per minute.
  - [ ] Output tokens per minute.
  - [ ] Turns per hour.
  - [ ] Tool calls per hour.
- [ ] Success metrics
  - [ ] Tool success rate from exit codes.
  - [ ] Command failure count.
  - [ ] Failed web-search count if available.
  - [ ] Interrupted session count if detectable.
  - [ ] Label as derived.
- [ ] Context metrics
  - [ ] Context window size.
  - [ ] Current context pressure.
  - [ ] Max context pressure per session.
  - [ ] Sessions near compaction threshold.
  - [ ] Cache ratio.

## Phase 5 - Backend / Data API

- [ ] Add local data API endpoint or loader
  - [ ] `GET /api/metrics/summary`
  - [ ] `GET /api/metrics/tokens?range=7d`
  - [ ] `GET /api/metrics/models?range=7d`
  - [ ] `GET /api/metrics/sessions?range=7d`
  - [ ] `GET /api/metrics/limits`
- [ ] Add query params
  - [ ] Range: current, today, 7d, 30d, all.
  - [ ] Group by: day, model, repo/session.
  - [ ] Include private content: false by default.
- [ ] Add caching
  - [ ] Cache parsed sessions by path + modified time.
  - [ ] Recompute changed files only.
  - [ ] Manual refresh button.
- [ ] Add error handling
  - [ ] Missing `.codex` directory.
  - [ ] No sessions found.
  - [ ] Permission denied.
  - [ ] Malformed JSONL.
  - [ ] Unknown event schema.

## Phase 6 - Dashboard UI Implementation

- [ ] Implement app shell
  - [ ] Sidebar navigation.
  - [ ] Brand mark.
  - [ ] Data source note.
  - [ ] Topbar filters.
  - [ ] Refresh control.
- [ ] Implement KPI cards
  - [ ] Total tokens.
  - [ ] Estimated cost.
  - [ ] Average latency.
  - [ ] Success rate.
  - [ ] Throughput.
- [ ] Implement daily token chart
  - [ ] Input tokens.
  - [ ] Cached input tokens.
  - [ ] Output tokens.
  - [ ] Reasoning output tokens.
  - [ ] Empty/loading states.
- [ ] Implement limit windows panel
  - [ ] 5 hour ring.
  - [ ] Weekly ring.
  - [ ] Reset timestamps.
  - [ ] Watch/capped states.
- [ ] Implement recent sessions table
  - [ ] Session start time.
  - [ ] Repo/cwd label.
  - [ ] Model.
  - [ ] Tokens.
  - [ ] Estimated cost.
  - [ ] Status.
- [ ] Implement model usage panel
  - [ ] Model share bars.
  - [ ] Token share.
  - [ ] Cost share.
  - [ ] Session count.
- [ ] Implement source labels
  - [ ] `local`
  - [ ] `API`
  - [ ] `derived`
  - [ ] `estimated`
- [ ] Implement responsive layout
  - [ ] Desktop wide layout.
  - [ ] Tablet stacked panels.
  - [ ] Mobile single-column layout.
  - [ ] No text overflow.
  - [ ] No overlapping UI.

## Phase 7 - OpenAI API Reconciliation

- [ ] Add optional OpenAI API integration
  - [ ] Use `OPENAI_API_KEY` from environment only.
  - [ ] Never commit keys.
  - [ ] Feature disabled if key missing.
- [ ] Fetch Usage API data
  - [ ] Completion usage buckets.
  - [ ] Model grouping.
  - [ ] Project grouping.
  - [ ] Input/output/cached tokens.
  - [ ] Request count.
- [ ] Fetch Costs API data
  - [ ] Cost buckets.
  - [ ] Currency.
  - [ ] Project id.
  - [ ] Line item.
- [ ] Reconcile local vs API
  - [ ] Show API costs when available.
  - [ ] Show local estimated costs otherwise.
  - [ ] Explain mismatch: ChatGPT plan usage != API billing.

## Phase 8 - Settings

- [ ] Add settings page or panel
  - [ ] Codex home path override.
  - [ ] Default date range.
  - [ ] Pricing source.
  - [ ] Currency.
  - [ ] Privacy mode.
  - [ ] Refresh interval.
- [ ] Add pricing configuration
  - [ ] GPT-5.5 input/cached/output.
  - [ ] GPT-5.4 input/cached/output.
  - [ ] GPT-5.4 mini input/cached/output.
  - [ ] GPT-5.3-Codex if local events use it.
  - [ ] Unknown model fallback.
- [ ] Add data retention settings
  - [ ] No local DB by default.
  - [ ] Optional app cache.
  - [ ] Clear cache action.

## Phase 9 - Testing

- [ ] Unit tests
  - [ ] JSONL parser.
  - [ ] Token aggregation.
  - [ ] Cost calculation.
  - [ ] Limit window formatting.
  - [ ] Date range filtering.
  - [ ] Error handling.
- [ ] Fixture tests
  - [ ] Minimal session.
  - [ ] Session with token counts.
  - [ ] Session with rate limits.
  - [ ] Session with tool failures.
  - [ ] Corrupt JSONL line.
  - [ ] Unknown event type.
- [ ] UI tests
  - [ ] Empty state.
  - [ ] Loading state.
  - [ ] Error state.
  - [ ] Populated dashboard.
  - [ ] Mobile layout.
- [ ] Manual verification
  - [ ] Run dev server in tmux.
  - [ ] Open dashboard.
  - [ ] Verify cards match sample local parse.
  - [ ] Verify no prompt content appears.

## Phase 10 - Quality Gates

- [ ] Run TypeScript check after JS/TS edits.
- [ ] Run lint after JS/TS edits.
- [ ] Run Biome after JS/TS edits if configured.
- [ ] Run build.
- [ ] Check responsive UI.
- [ ] Check no sensitive local content rendered.
- [ ] Check no secrets committed.
- [ ] Check code for avoidable nesting.
- [ ] Check naming clarity.
- [ ] Check components are not over-abstracted.

## Phase 11 - Delivery

- [ ] Document how to run dashboard.
- [ ] Document supported data sources.
- [ ] Document unavailable/estimated metrics.
- [ ] Document pricing assumptions.
- [ ] Document privacy behavior.
- [ ] Include screenshots or visual notes if browser verification is done.

## Implementation Prompts

Use these as prompt-sized work chunks.

1. Scaffold app foundation and port `mockups/01-command-center.html` into real components with static sample data.
2. Build Codex JSONL discovery and parser with fixtures, no UI wiring.
3. Build metrics aggregation engine from parsed events with tests.
4. Wire dashboard UI to local metrics API/loader.
5. Add limit windows, reset timing, and status states.
6. Add cost estimation with model pricing config.
7. Add responsive polish and accessibility pass.
8. Add optional OpenAI Usage/Costs API reconciliation.
9. Add settings page for Codex path, pricing, privacy, and refresh.
10. Run full quality gate and produce final implementation notes.
