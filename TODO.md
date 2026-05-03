# Codex Metrics Production TODO

Agent loop format:

- Top-level tasks use `- [ ] TASK-000: Title`.
- Indented bullets are task scope and acceptance criteria.
- The loop picks the first unchecked task, runs builder, then reviewer.
- The loop marks a task complete only after reviewer returns `lgtm`.

## Completed Tasks

- [x] TASK-001: Scaffold production dashboard app
- [x] TASK-002: Port command center UI into components
- [x] TASK-003: Implement local Codex JSONL ingestion
- [x] TASK-004: Add metrics aggregation
- [x] TASK-005: Wire dashboard to generated metrics
- [x] TASK-006: Add production verification flow
- [x] TASK-007: Add live metrics refresh

## In Progress

- [x] TASK-008: Dark dense operator console (mockup-3)
  - Rewrite entire UI to match mockup-3: dark theme, 9 collapsible sections, sticky sidebar nav, inline SVG charts.
  - Acceptance: Visual 1:1 to `mockups/mockup-3.html`.

- [x] TASK-009: Interactive sparkline tooltips
  - Add hover zones, vertical guide lines, dots, and tooltips with timestamps on System Pulse sparklines.
  - Acceptance: Hovering any sparkline point shows exact value + timestamp.

## Upcoming Tasks

- [ ] TASK-010: Metrics history storage (localStorage ring buffer)
  - Store every unique `metrics.json` snapshot in `localStorage` as a time-series ring buffer.
  - Prune to last 500 snapshots (~1MB cap).
  - Hook into `main.ts`: append snapshot on every `generatedAt` change.
  - Provide `loadHistory()`, `saveSnapshot()`, `pruneHistory()` APIs.
  - Graceful fallback when storage is empty or disabled.
  - Acceptance:
    - Dashboard accumulates data points over time without page reload.
    - History survives page refresh.
    - No `localStorage` errors if quota exceeded (prune proactively).
    - `bun run verify` passes.

- [ ] TASK-011: Time window aggregation (1h / 24h / 7d / 30d / All)
  - Bucket stored snapshots by selected window with appropriate intervals:
    - 1h: 5-minute buckets, 12 points
    - 24h: 1-hour buckets, 24 points
    - 7d: 1-day buckets, 7 points
    - 30d: 1-day buckets, 30 points
    - All: 1-day buckets since first snapshot
  - Interpolate gaps (carry-forward last known value).
  - Compute real deltas: latest bucket vs previous bucket.
  - Add time window toggle UI to System Pulse header.
  - Default window: 24h.
  - Acceptance:
    - Sparklines populate from actual historical data.
    - Delta badges show real comparisons with period label (`+2% vs 1h ago`).
    - Switching windows updates all KPIs + sparklines instantly.
    - Empty history shows honest "insufficient data" state.

- [ ] TASK-012: Sparkline health-based color coding
  - Color sparkline stroke by latest bucket's severity, not metric name.
  - Per-metric thresholds:
    - Success rate: ≥95% green, 85-94% yellow, <85% red
    - Latency p95: <2s green, 2-5s yellow, >5s red
    - Daily burn: <70% limit green, 70-90% yellow, >90% red
    - Rate limit: <50% green, 50-80% yellow, >80% red
    - Error rate: <1% green, 1-5% yellow, >5% red
    - Throughput / RPM / Active sessions: always neutral (blue/grey)
  - Delta badge colors:
    - Positive changes on "good" metrics (success ↑, error ↓) = green
    - Positive changes on "bad" metrics (latency ↑, burn ↑) = red
    - Neutral = grey
  - Acceptance:
    - Sparkline color changes dynamically based on current value.
    - Delta badge colors make semantic sense per metric.

- [ ] TASK-013: Polish — units, tooltips, labels
  - Fix double unit bugs (`34.1kk/min` → `34.1k/min`, `2.5ss` → `2.5s`).
  - Remove x-axis time labels from sparklines (rely on hover tooltip).
  - Add date to sparkline tooltip (`3 May 15:00`).
  - Add `?` hover tooltips to metric names (subtle, appears on tile hover).
    - One-sentence explanation per metric.
  - Acceptance:
    - No visual glitches on units.
    - Tooltips show both date and time.
    - `?` tooltips are discoverable but not noisy.

- [ ] TASK-014: Faster polling (optional)
  - Reduce poll interval from 3s to 1s for snappier real-time feel.
  - Evaluate if SSE (Server-Sent Events) is worth it over polling.
  - Acceptance:
    - Dashboard feels more responsive.
    - No excessive CPU/render churn.

## Future Ideas (not scheduled)

- WebSocket for true push-based updates (overkill for local dev tool).
- Backend file-based history (`public/metrics-history.jsonl`) for cross-device persistence.
- Configurable thresholds per metric (user preferences in localStorage).
- Export CSV of historical data.
- Session drill-down: click a session row → detail view with turn-by-turn timeline.
