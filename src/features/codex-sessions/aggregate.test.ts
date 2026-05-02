import { describe, expect, test } from "bun:test";
import { aggregateCodexMetrics } from "./aggregate";
import { parseCodexJsonl } from "./parser";

describe("Codex metrics aggregation", () => {
  test("aggregates token totals, model mix, sessions, limits, health, latency, and throughput", () => {
    const firstSession = parseCodexJsonl(
      [
        jsonl({
          timestamp: "2026-05-02T10:00:00.000Z",
          type: "session_meta",
          payload: {
            id: "session-one",
            timestamp: "2026-05-02T10:00:00.000Z",
            cwd: "C:\\work\\alpha",
            model: "gpt-5.5 high",
            model_provider: "openai",
          },
        }),
        jsonl({
          timestamp: "2026-05-02T10:01:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: tokenUsage(100, 40, 20),
              last_token_usage: tokenUsage(100, 40, 20),
            },
            rate_limits: {
              limit_id: "codex",
              limit_name: "Codex",
              primary: { used_percent: 72, window_minutes: 300, resets_at: 1777723200 },
              secondary: { used_percent: 12, window_minutes: 10080, resets_at: 1778123200 },
            },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T10:03:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: tokenUsage(180, 50, 45),
              last_token_usage: tokenUsage(80, 10, 25),
            },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T10:04:00.000Z",
          type: "event_msg",
          payload: {
            type: "exec_command_end",
            exit_code: 0,
            duration: 1200,
            status: "completed",
          },
        }),
      ].join("\n"),
      "rollout-session-one.jsonl",
    );
    const secondSession = parseCodexJsonl(
      [
        jsonl({
          timestamp: "2026-05-02T11:00:00.000Z",
          type: "session_meta",
          payload: {
            id: "session-two",
            timestamp: "2026-05-02T11:00:00.000Z",
            cwd: "C:\\work\\beta",
            model_provider: "openai",
          },
        }),
        jsonl({
          timestamp: "2026-05-02T11:02:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: tokenUsage(50, 0, 10),
            },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T11:03:00.000Z",
          type: "response_item",
          payload: {
            type: "function_call_output",
            status: "failed",
            output: "failed",
            metadata: { exit_code: 1, duration_ms: 3000 },
          },
        }),
      ].join("\n"),
      "rollout-session-two.jsonl",
    );

    const metrics = aggregateCodexMetrics([...firstSession.records, ...secondSession.records]);

    expect(metrics.sourceLabels).toEqual({
      real: "real",
      derived: "derived",
      estimated: "estimated",
    });
    expect(metrics.totals.totalTokens).toEqual({
      value: 285,
      sourceKind: "real",
      sourceLabel: "real",
    });
    expect(metrics.totals.cachedInputTokens.value).toBe(50);
    expect(metrics.totals.outputTokens.value).toBe(55);
    expect(metrics.dailyTokenBurn).toEqual([
      {
        date: "2026-04-26",
        day: "Sun",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-04-27",
        day: "Mon",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-04-28",
        day: "Tue",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-04-29",
        day: "Wed",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-04-30",
        day: "Thu",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-05-01",
        day: "Fri",
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        date: "2026-05-02",
        day: "Sat",
        inputTokens: 230,
        cachedInputTokens: 50,
        outputTokens: 55,
        totalTokens: 285,
        sourceKind: "real",
        sourceLabel: "real",
      },
    ]);
    expect(metrics.modelMix).toHaveLength(2);
    const firstModel = metrics.modelMix[0];
    const secondModel = metrics.modelMix[1];

    expect(firstModel).toEqual({
      model: "gpt-5.5 high",
      tokens: 225,
      sessions: 1,
      share: firstModel?.share,
      sourceKind: "real",
      sourceLabel: "real",
    });
    expect(Math.abs((firstModel?.share ?? 0) - 0.7895) < 0.0001).toBe(true);
    expect(secondModel).toEqual({
      model: "openai model",
      tokens: 60,
      sessions: 1,
      share: secondModel?.share,
      sourceKind: "estimated",
      sourceLabel: "estimated",
    });
    expect(Math.abs((secondModel?.share ?? 0) - 0.2105) < 0.0001).toBe(true);
    expect(metrics.recentSessions).toHaveLength(2);
    expect(metrics.recentSessions[0]).toEqual({
      sessionId: "session-two",
      name: "11:00 beta",
      cwd: "C:\\work\\beta",
      startedAt: "2026-05-02T11:00:00.000Z",
      lastSeenAt: "2026-05-02T11:03:00.000Z",
      model: "openai model",
      totalTokens: 60,
      status: "retry",
      sourceKind: "derived",
      sourceLabel: "derived",
    });
    expect(metrics.rateLimitWindows).toEqual([
      {
        key: "codex:primary",
        limitId: "codex",
        limitName: "Codex",
        scope: "primary",
        title: "5h window primary",
        usedPercent: 72,
        windowMinutes: 300,
        resetsAt: "2026-05-02T12:00:00.000Z",
        status: "watch",
        sourceKind: "real",
        sourceLabel: "real",
      },
      {
        key: "codex:secondary",
        limitId: "codex",
        limitName: "Codex",
        scope: "secondary",
        title: "1w window secondary",
        usedPercent: 12,
        windowMinutes: 10080,
        resetsAt: "2026-05-07T03:06:40.000Z",
        status: "ok",
        sourceKind: "real",
        sourceLabel: "real",
      },
    ]);
    expect(metrics.successRate).toEqual({
      successful: 1,
      failed: 1,
      total: 2,
      rate: 0.5,
      sourceKind: "derived",
      sourceLabel: "derived",
    });
    expect(metrics.latency).toEqual({
      averageMs: 2100,
      p95Ms: 3000,
      samples: 2,
      sourceKind: "derived",
      sourceLabel: "derived",
    });
    expect(metrics.throughput.elapsedMs).toBe(3_660_000);
    expect(Math.abs(metrics.throughput.outputTokensPerMinute - 0.9016) < 0.0001).toBe(true);
    expect(metrics.throughput.sourceLabel).toBe("derived");
  });

  test("returns safe zero-state output for empty data", () => {
    const metrics = aggregateCodexMetrics([]);

    expect(metrics.totals.totalTokens.value).toBe(0);
    expect(metrics.totals.cachedInputTokens.value).toBe(0);
    expect(metrics.totals.outputTokens.value).toBe(0);
    expect(metrics.dailyTokenBurn).toEqual([]);
    expect(metrics.modelMix).toEqual([]);
    expect(metrics.recentSessions).toEqual([]);
    expect(metrics.rateLimitWindows).toEqual([]);
    expect(metrics.successRate).toEqual({
      successful: 0,
      failed: 0,
      total: 0,
      rate: 0,
      sourceKind: "derived",
      sourceLabel: "derived",
    });
    expect(metrics.latency).toEqual({
      averageMs: 0,
      p95Ms: 0,
      samples: 0,
      sourceKind: "derived",
      sourceLabel: "derived",
    });
    expect(metrics.throughput).toEqual({
      elapsedMs: 0,
      outputTokensPerMinute: 0,
      totalTokensPerMinute: 0,
      sourceKind: "derived",
      sourceLabel: "derived",
    });
  });
});

function tokenUsage(inputTokens: number, cachedInputTokens: number, outputTokens: number) {
  return {
    input_tokens: inputTokens,
    cached_input_tokens: cachedInputTokens,
    output_tokens: outputTokens,
    reasoning_output_tokens: 0,
    total_tokens: inputTokens + outputTokens,
  };
}

function jsonl(value: unknown) {
  return JSON.stringify(value);
}
