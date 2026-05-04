import { describe, expect, test } from "bun:test";
import { parseCodexJsonl } from "../codex-sessions";
import { buildMetricsTimeWindows } from "./time-windows";

describe("metrics time windows", () => {
  test("builds bucketed current and previous timeframe metrics from record timestamps", () => {
    const parsed = parseCodexJsonl(
      [
        jsonl(tokenRecord("2026-05-03T18:20:00.000Z", tokenUsage(50))),
        jsonl(tokenRecord("2026-05-03T19:10:00.000Z", tokenUsage(100))),
        jsonl(tokenRecord("2026-05-03T19:40:00.000Z", tokenUsage(200))),
      ].join("\n"),
      "rollout-test.jsonl",
    );

    const windows = buildMetricsTimeWindows(parsed.records, Date.parse("2026-05-03T19:45:00.000Z"));
    const oneHour = windows["1h"];

    expect(oneHour?.buckets).toHaveLength(12);
    expect(oneHour?.current.totals.totalTokens.value).toBe(300);
    expect(oneHour?.previous?.totals.totalTokens.value).toBe(50);

    const bucketTotals = oneHour?.buckets.map((bucket) => bucket.metrics.totals.totalTokens.value);
    expect(bucketTotals?.some((value) => value > 0)).toBe(true);
    expect(new Set(bucketTotals).size > 1).toBe(true);
  });
});

function tokenRecord(timestamp: string, usage: ReturnType<typeof tokenUsage>) {
  return {
    timestamp,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        last_token_usage: usage,
      },
    },
  };
}

function tokenUsage(totalTokens: number) {
  return {
    input_tokens: totalTokens,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: totalTokens,
  };
}

function jsonl(value: unknown) {
  return JSON.stringify(value);
}
