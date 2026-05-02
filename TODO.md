# Codex Metrics Production TODO

Agent loop format:

- Top-level tasks use `- [ ] TASK-000: Title`.
- Indented bullets are task scope and acceptance criteria.
- The loop picks the first unchecked task, runs builder, then reviewer.
- The loop marks a task complete only after reviewer returns `lgtm`.

- [x] TASK-001: Scaffold production dashboard app
  - Create a Bun-friendly TypeScript frontend app.
  - Preserve `mockups/01-command-center.html` as design source.
  - Add scripts for `dev`, `build`, `typecheck`, `lint`, and `biome` where practical.
  - Acceptance:
    - App runs locally.
    - First screen matches command-center layout direction.
    - No mockup files deleted.

- [x] TASK-002: Port command center UI into components
  - Build sidebar, topbar, KPI cards, daily token burn, limit windows, recent sessions, and model usage sections.
  - Keep responsive behavior from the mockup.
  - Acceptance:
    - Desktop and mobile layouts remain coherent.
    - Visual language follows `mockups/01-command-center.html`.

- [x] TASK-003: Implement local Codex JSONL ingestion
  - Read `%USERPROFILE%\.codex\sessions\**\rollout-*.jsonl`.
  - Parse `session_meta`, `task_started`, `token_count`, `exec_command_end`, tool call, and web search events.
  - Acceptance:
    - Parser tolerates malformed JSONL lines.
    - Parser exposes typed records for aggregation.

- [x] TASK-004: Add metrics aggregation
  - Compute total tokens, cached input tokens, output tokens, model mix, recent sessions, rate-limit windows, success rate, latency, and throughput.
  - Use clear labels for real, derived, and estimated values.
  - Acceptance:
    - Aggregation has focused tests.
    - Empty data produces safe zero-state output.

- [x] TASK-005: Wire dashboard to generated metrics
  - Generate `public/metrics.json` from local Codex session data.
  - Load dashboard data from generated metrics.
  - Acceptance:
    - Dashboard works with real metrics file.
    - Dashboard has sensible empty/loading/error states.

- [x] TASK-006: Add production verification flow
  - Ensure build, typecheck, lint, biome, and tests are documented and runnable.
  - Add README usage for data generation and dashboard startup.
  - Acceptance:
    - Fresh checkout has clear setup/run path.
    - Verification commands pass.
