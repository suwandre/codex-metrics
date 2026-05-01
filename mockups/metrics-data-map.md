# Codex Metrics Data Map

## Real from local Codex files

Observed under `%USERPROFILE%\.codex`.

- `sessions/**/rollout-*.jsonl`
  - `session_meta`: session id, cwd, originator, cli version, source, model provider.
  - `task_started`: turn id, start time, model context window, collaboration mode.
  - `token_count`: total and last input tokens, cached input tokens, output tokens, reasoning output tokens, total tokens, context window.
  - `token_count.rate_limits`: Codex limit id, 5 hour window percent/reset, weekly window percent/reset, plan type, rate-limit reached type.
  - `exec_command_end`: command, cwd, stdout/stderr summaries, exit code, duration-ish timestamps via event ordering.
  - `function_call` / `function_call_output`: tool names, call ids, outputs.
  - `web_search_call` / `web_search_end`: web-search usage and status.
- `history.jsonl`: prompt history metadata.
- `log/codex-tui.log`: UI/runtime events. Useful for debugging, noisy for analytics.
- `models_cache.json`: available model metadata cache.
- `logs_2.sqlite` / `state_5.sqlite`: likely richer app state, but sqlite CLI is not installed here.

## Real from official OpenAI APIs

- Usage API: aggregated usage buckets for completions, input tokens, cached input tokens, output tokens, request count, model, project id, user id, service tier, API key id, batch flag.
- Costs API: aggregated cost buckets with amount/currency, project id, line item, API key id.
- Codex SDK: programmatic local Codex thread control. Good integration surface for future dashboard ingestion.

## Derived locally

- Average latency: timestamp deltas between turn start and final response/tool completion.
- Throughput: output tokens per elapsed minute, or tokens per turn.
- Success rate: successful tool/process exits divided by total exits, plus failed Codex turns if detectable.
- Error rate: non-zero command exits, tool errors, interrupted turns.
- Model usage breakdown: group `session_meta` / turn metadata by model.
- Daily/weekly token usage: aggregate `token_count.last_token_usage` by session timestamp.
- Context pressure: `last_token_usage.total_tokens / model_context_window`.
- Cache ratio: `cached_input_tokens / input_tokens`.
- Estimated cost: apply OpenAI pricing/rate-card values to token groups.

## Estimated or unavailable without account/workspace access

- Exact ChatGPT plan spend: plan quota is not API billing.
- Exact remaining message count: Codex exposes percentage windows locally, not a stable message-count API here.
- Organization/team seat analytics: requires ChatGPT workspace/admin analytics access.
- True end-to-end user-perceived latency: local timestamps are close, but not canonical server timing.
