- [ ] Add focused automated tests for Codex JSONL parsing and metrics aggregation.
  Acceptance criteria:
  - Cover minimal valid session fixture.
  - Cover token count aggregation.
  - Cover rate-limit parsing/formatting.
  - Cover tool failure counting.
  - Cover corrupt JSONL lines without crashing.
  - Cover unknown event types without crashing.
  - Add or update test script in `package.json`.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Add settings UI for local dashboard configuration.
  Acceptance criteria:
  - Settings view or panel supports Codex home path override.
  - Supports default date range.
  - Supports pricing source or pricing assumptions display/editing.
  - Supports currency display.
  - Supports privacy mode visibility.
  - Supports refresh interval or manual refresh setting.
  - Defaults preserve current dashboard behavior.
  - Responsive layout has no text overflow or incoherent overlap.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Add pricing configuration and unknown-model fallback.
  Acceptance criteria:
  - Pricing config includes GPT-5.5, GPT-5.4, GPT-5.4 mini, and GPT-5.3-Codex where relevant.
  - Cost estimates handle input, cached input, output, and reasoning output consistently.
  - Unknown models use a clearly labeled fallback instead of breaking metrics.
  - Estimated costs remain clearly labeled as estimated unless API reconciliation is available.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Add optional OpenAI Usage and Costs API reconciliation.
  Acceptance criteria:
  - Uses `OPENAI_API_KEY` from environment only.
  - Feature is disabled gracefully when key is missing.
  - Usage data supports model grouping and input/output/cached token fields when available.
  - Costs data supports currency, project id, and line items when available.
  - Dashboard shows API costs when available and local estimated costs otherwise.
  - UI explains ChatGPT plan usage can differ from OpenAI API billing.
  - No keys or secrets are logged, rendered, or committed.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Improve dashboard empty, loading, error, and responsive states.
  Acceptance criteria:
  - Missing `.codex` directory has a clear empty/error state.
  - No sessions found has a clear empty state.
  - Permission denied and malformed JSONL are handled without crashing.
  - Populated dashboard still matches the command-center visual direction.
  - Mobile and tablet layouts avoid text overflow and overlapping UI.
  - Privacy/source labels remain visible where useful.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Document run instructions, data sources, estimates, and privacy behavior.
  Acceptance criteria:
  - Documentation explains dev, build, collect, and preview commands.
  - Documents local Codex data sources used by the collector.
  - Documents API reconciliation setup and disabled behavior when no key exists.
  - Documents unavailable, derived, and estimated metrics.
  - Documents privacy boundary and confirms prompt content is not rendered by default.
  - Run `bunx tsc --noEmit`, `bun run lint`, `bun run biome`, and `bun run build`.

- [ ] Run final quality gate and implementation review.
  Acceptance criteria:
  - Run `bunx tsc --noEmit`.
  - Run `bun run lint`.
  - Run `bun run biome`.
  - Run `bun run build`.
  - Check no sensitive local content is rendered.
  - Check no secrets are committed.
  - Check code for avoidable nesting and unclear names.
  - Check components/utilities are not over-abstracted.
  - Update docs or task notes with any known limitations.
