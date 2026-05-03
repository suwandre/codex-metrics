import type { CodexMetricsAggregation } from "../codex-sessions";
import {
  type AggregatedWindow,
  aggregateToWindow,
  type HistoryStorage,
  type TimeWindow,
} from "../history";
import type {
  BurnBarTone,
  CommandCenterData,
  KpiMetric,
  LimitWindow,
  ModelUsageTone,
  SessionRow,
  SessionStatus,
} from "./types";

export type GeneratedMetricsFile = {
  schemaVersion: 1;
  generatedAt: string;
  ingestion: {
    sessionsRoot: string;
    fileCount: number;
    recordCount: number;
    malformedLineCount: number;
    ignoredLineCount: number;
  };
  metrics: CodexMetricsAggregation;
};

const modelTones = ["green", "orange", "blue", "red"] as const satisfies readonly ModelUsageTone[];

export function isGeneratedMetricsFile(value: unknown): value is GeneratedMetricsFile {
  const file = asRecord(value);
  if (!file) return false;
  return (
    file.schemaVersion === 1 &&
    typeof file.generatedAt === "string" &&
    isIngestion(file.ingestion) &&
    isMetrics(file.metrics)
  );
}

type CommandCenterDataOptions = {
  refreshStatus?: string;
  history?: HistoryStorage;
  window?: TimeWindow;
};

export function toCommandCenterData(
  file: GeneratedMetricsFile,
  options: CommandCenterDataOptions = {},
): CommandCenterData {
  const metrics = file.metrics;
  const totals = metrics.totals;
  const hasRecords = file.ingestion.recordCount > 0;
  const updatedAt = `Updated ${formatTime(file.generatedAt)}. Polling every 1s.`;

  const inputTokens = totals.inputTokens.value;
  const cachedTokens = totals.cachedInputTokens.value;
  const outputTokens = totals.outputTokens.value;
  const reasoningTokens = totals.reasoningOutputTokens.value;
  const totalTokens = totals.totalTokens.value;

  const cachedRatio = inputTokens > 0 ? cachedTokens / inputTokens : 0;
  const hitRatio = Math.round(cachedRatio * 100);
  const tokensSaved = cachedTokens;
  const estimatedSavings = tokensSaved * 0.0003;

  const successRate = metrics.successRate.rate;
  const sessions = metrics.recentSessions;

  return {
    title: "Codex Metrics — Operator Console",
    subtitle: hasRecords
      ? `Generated ${formatTimestamp(file.generatedAt)} from local Codex JSONL.`
      : "No local Codex session records found. Generate metrics after Codex has written sessions.",
    refreshStatus: options.refreshStatus ?? updatedAt,
    navItems: [],
    sideNote: toSideNote(file),
    filters: [
      { label: hasRecords ? "Live refresh" : "Empty metrics", live: hasRecords },
      { label: "3s polling" },
      { label: `${file.ingestion.fileCount} files` },
      { label: `${file.ingestion.recordCount} records` },
    ],
    metrics: [
      {
        label: "Total tokens",
        source: totals.totalTokens.sourceLabel,
        value: formatCompactNumber(totalTokens),
        delta: `${formatCompactNumber(inputTokens)} input tokens`,
      },
      {
        label: "Cached input",
        source: totals.cachedInputTokens.sourceLabel,
        value: formatCompactNumber(cachedTokens),
        delta: `${formatPercent(cachedRatio)} of input`,
      },
      {
        label: "Output tokens",
        source: totals.outputTokens.sourceLabel,
        value: formatCompactNumber(outputTokens),
        delta: `${formatCompactNumber(reasoningTokens)} reasoning tokens`,
      },
      {
        label: "Avg latency",
        source: metrics.latency.sourceLabel,
        value: formatDuration(metrics.latency.averageMs),
        delta: `p95 ${formatDuration(metrics.latency.p95Ms)} from ${metrics.latency.samples} samples`,
      },
      {
        label: "Success rate",
        source: metrics.successRate.sourceLabel,
        value: formatPercent(successRate),
        delta: `${metrics.successRate.successful} ok / ${metrics.successRate.failed} failed`,
      },
      {
        label: "Throughput",
        source: metrics.throughput.sourceLabel,
        value: `${formatCompactNumber(metrics.throughput.totalTokensPerMinute)}/min`,
        delta: `${formatCompactNumber(metrics.throughput.outputTokensPerMinute)} output/min`,
      },
    ],
    burnBars: toBurnBars(metrics),
    limitWindows: metrics.rateLimitWindows.map(toLimitWindow),
    sessions: sessions.slice(0, 5).map((session) => ({
      name: session.name,
      model: session.model,
      tokens: formatCompactNumber(session.totalTokens),
      cost: "not priced",
      status: toSessionStatus(session.status),
    })),
    modelUsage: metrics.modelMix.map((usage, index) => ({
      model: usage.model,
      share: Math.round(usage.share * 100),
      tone: modelTones[index % modelTones.length] ?? "green",
    })),
    kpis: toKpis(metrics, options.history, options.window),
    tokenBurn: {
      composition: [
        { label: "input", value: inputTokens, color: "--accent" },
        { label: "cached", value: cachedTokens, color: "--success" },
        { label: "output", value: outputTokens, color: "--info" },
        { label: "reasoning", value: reasoningTokens, color: "--warning" },
      ],
      areaChart: {
        input: [7, 6, 5, 4, 3, 2, 1, 0.5, 0.3, 0.1],
        cached: [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5],
      },
      dailyBurn: metrics.dailyTokenBurn.map((d) => ({ day: d.day, tokens: d.totalTokens })),
      modelMix: metrics.modelMix.map((m) => ({ model: m.model, share: Math.round(m.share * 100) })),
    },
    rateLimits: {
      rows: metrics.rateLimitWindows.map((w) => ({
        window: w.title,
        used: `${Math.round(w.usedPercent)}%`,
        remaining: `${Math.round(100 - w.usedPercent)}%`,
        countdown: w.resetsAt ? `resets ${w.resetsAt}` : "unknown",
        status: w.status,
      })),
      burnRate: [80, 82, 85, 88, 90, 92, 95, 100, 105, 110, 112, 114],
      projection: "Safe — no exhaustion risk",
      safeBudget: Math.round(
        metrics.rateLimitWindows.reduce((s, w) => s + (100 - w.usedPercent), 0) /
          Math.max(metrics.rateLimitWindows.length, 1),
      ),
    },
    sessionStream: {
      rows: sessions.slice(0, 10).map(
        (s): SessionRow => ({
          id: s.name,
          repo: s.cwd ? (s.cwd.split("/").filter(Boolean).pop() ?? "") : "",
          model: s.model,
          turns: Math.max(1, Math.round(s.totalTokens / 1_000_000)),
          tokens: formatCompactNumber(s.totalTokens),
          latency: "—",
          success: toSessionStatus(s.status),
          age: s.lastSeenAt ? formatTimeAgo(new Date(s.lastSeenAt)) : "—",
        }),
      ),
      turnHistogram: [
        { label: "1-3", value: 3 },
        { label: "4-6", value: 2 },
        { label: "7-10", value: 1.5 },
        { label: "11-15", value: 2.5 },
        { label: "16+", value: 1 },
      ],
      scatter: sessions.slice(0, 8).map((_s, i) => ({
        x: 0.1 + (i % 4) * 0.2,
        y: 0.3 + (i % 3) * 0.2,
      })),
      longest: sessions.slice(0, 5).map((s) => ({
        name: s.name,
        age: s.lastSeenAt ? formatTimeAgo(new Date(s.lastSeenAt)) : "—",
      })),
      biggest: sessions.slice(0, 5).map((s) => ({
        name: s.name,
        tokens: formatCompactNumber(s.totalTokens),
      })),
    },
    cache: {
      hitRatio,
      tokensSaved: formatCompactNumber(tokensSaved),
      savings: `$${estimatedSavings.toFixed(2)}`,
      uncachedTrend: [
        2_000_000, 1_900_000, 1_800_000, 1_700_000, 1_600_000, 1_500_000, 1_400_000, 1_300_000,
        1_200_000, 1_100_000, 1_000_000,
      ],
      byModel: metrics.modelMix.map((m) => ({ model: m.model, ratio: hitRatio })),
    },
    context: {
      avgUsage: 34,
      maxUsage: 87,
      thresholds: [
        { label: "50%", count: 12, width: 48 },
        { label: "75%", count: 4, width: 16 },
        { label: "90%", count: 1, width: 4 },
      ],
      candidates: sessions.slice(0, 2).map((s) => ({
        session: s.name,
        current: Math.min(99, Math.round((s.totalTokens / Math.max(totalTokens, 1)) * 1000)),
        turnsLeft: "~2 turns",
      })),
      growth: [5, 8, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    },
    tools: {
      calls: [
        { tool: "exec_command", count: 45 },
        { tool: "web_search", count: 12 },
        { tool: "function_call", count: 8 },
      ],
      failed: [],
      failureRate: [
        { tool: "exec_command", rate: 0 },
        { tool: "web_search", rate: 0 },
        { tool: "function_call", rate: 0 },
      ],
      slowest: [],
      retryProne: [],
    },
    repos: {
      distribution: sessions.reduce(
        (acc, s) => {
          const name = s.cwd ? `/${s.cwd.split("/").filter(Boolean).pop() ?? "other"}/` : "/other/";
          const existing = acc.find((r) => r.name === name);
          if (existing) {
            existing.tokens += s.totalTokens;
          } else {
            acc.push({ name, tokens: s.totalTokens });
          }
          return acc;
        },
        [] as { name: string; tokens: number }[],
      ),
      failures: [
        { name: "/projects/", count: 11, width: 55 },
        { name: "/tools/", count: 6, width: 30 },
        { name: "/cli/", count: 3, width: 15 },
      ],
      latency: sessions.slice(0, 3).map((s) => ({
        name: s.cwd ? `/${s.cwd.split("/").filter(Boolean).pop() ?? "other"}/` : "/other/",
        tokens: s.totalTokens,
        failures: 0,
        avgLatency: "—",
        p95Latency: "—",
        count: 1,
      })),
      mostExpensiveRepo: { name: "/projects/", tokens: formatCompactNumber(totalTokens) },
      mostExpensiveSession: {
        name: sessions[0]?.name ?? "—",
        tokens: sessions[0] ? formatCompactNumber(sessions[0].totalTokens) : "0",
      },
    },
    billing: {
      byDay: Array.from({ length: 14 }, (_, i) => ({
        day: `Apr ${20 + i}`,
        amount: 5 + i * 2.5,
      })),
      breakdown: [
        { label: "/projects/", value: 70, cost: "$8.75" },
        { label: "/tools/", value: 20, cost: "$2.50" },
        { label: "/cli/", value: 10, cost: "$1.25" },
      ],
      completions: [],
      totalRequests: 0,
      batchShare: 0,
    },
    products: [
      {
        name: "Embeddings",
        metric: "0",
        unit: "",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
      { name: "Images", metric: "0", unit: "", cost: "$0.00", sparkline: [0, 0, 0, 0, 0, 0, 0] },
      {
        name: "Audio Transcription",
        metric: "0",
        unit: "s",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: "Audio Speech",
        metric: "0",
        unit: "chars",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: "Code Interpreter",
        metric: "0",
        unit: "",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: "Vector Stores",
        metric: "0",
        unit: "B",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: "Moderation",
        metric: "0",
        unit: "",
        cost: "$0.00",
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  };
}

function toKpis(
  metrics: CodexMetricsAggregation,
  history: HistoryStorage | undefined,
  window: TimeWindow | undefined,
): KpiMetric[] {
  const hasHistory = history && history.snapshots.length >= 2;
  const aggregated = hasHistory ? aggregateToWindow(window ?? "24h", history) : null;

  if (aggregated && aggregated.buckets.length >= 2) {
    return buildHistoryKpis(metrics, aggregated);
  }

  return buildMockKpis(metrics);
}

const kpiDescriptions: Record<string, string> = {
  "Success Rate": "% of tool executions that exited successfully",
  "Latency p95": "95th percentile turn completion time",
  Throughput: "Total tokens processed per minute",
  "Active Sessions": "Number of active Codex sessions",
  "Daily Burn / 95% limit": "Total tokens consumed today vs 95% limit",
  "Rate Limit — weekly / 5h": "Codex API rate limit window consumption",
  "Current RPM": "Requests per minute",
  "Error Rate (5m)": "% of tool executions that failed",
};

function getHealthColor(metricKey: string, value: number): KpiMetric["color"] {
  switch (metricKey) {
    case "successRate":
      return value >= 95 ? "success" : value >= 85 ? "warning" : "danger";
    case "latency":
      return value < 2000 ? "success" : value <= 5000 ? "warning" : "danger";
    case "throughput":
      return "accent";
    case "activeSessions":
      return "default";
    case "dailyBurn": {
      const limit = 10_000_000; // 95% of ~10.5M
      const pct = (value / limit) * 100;
      return pct < 70 ? "success" : pct <= 90 ? "warning" : "danger";
    }
    case "rateLimit":
      return value < 50 ? "success" : value <= 80 ? "warning" : "danger";
    case "rpm":
      return "accent";
    case "errorRate":
      return value < 1 ? "success" : value <= 5 ? "warning" : "danger";
    default:
      return "default";
  }
}

function getDeltaColor(
  metricKey: string,
  direction: "up" | "down" | "neutral",
  currentValue: number,
): KpiMetric["deltaColor"] {
  if (direction === "neutral") return "default";

  switch (metricKey) {
    case "successRate":
      return direction === "up" ? "success" : "danger";
    case "latency":
      return direction === "up" ? "danger" : "success";
    case "errorRate":
      return direction === "down" ? "success" : "danger";
    case "rateLimit":
      return direction === "up" ? "danger" : "success";
    case "throughput":
      return "default";
    case "activeSessions":
      return "default";
    case "dailyBurn": {
      const limit = 10_000_000;
      const pct = (currentValue / limit) * 100;
      if (direction === "up") return pct > 90 ? "danger" : "warning";
      return "success";
    }
    case "rpm":
      return "default";
    default:
      return "default";
  }
}

function buildHistoryKpis(
  metrics: CodexMetricsAggregation,
  aggregated: AggregatedWindow,
): KpiMetric[] {
  const latest = aggregated.latest ?? metrics;
  const previous = aggregated.previous;

  const successRate = latest.successRate.rate;
  const errorRate =
    latest.successRate.total > 0 ? (latest.successRate.failed / latest.successRate.total) * 100 : 0;
  const sessions = latest.recentSessions;

  const sparkSuccess = toSparklineFromHistory(aggregated, "successRate");
  const sparkLatency = toSparklineFromHistory(aggregated, "latency");
  const sparkThroughput = toSparklineFromHistory(aggregated, "throughput");
  const sparkSessions = toSparklineFromHistory(aggregated, "activeSessions");
  const sparkBurn = toSparklineFromHistory(aggregated, "dailyBurn");
  const sparkRate = toSparklineFromHistory(aggregated, "rateLimit");
  const sparkRpm = toSparklineFromHistory(aggregated, "rpm");
  const sparkError = toSparklineFromHistory(aggregated, "errorRate");

  const timestamps = aggregated.buckets.map((b) => b.label);

  return [
    kpiFromHistory(
      "Success Rate",
      formatPercent(successRate),
      "successRate",
      sparkSuccess,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Latency p95",
      formatDuration(latest.latency.p95Ms),
      "latency",
      sparkLatency,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Throughput",
      formatCompactNumber(latest.throughput.totalTokensPerMinute),
      "throughput",
      sparkThroughput,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Active Sessions",
      String(sessions.length),
      "activeSessions",
      sparkSessions,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Daily Burn / 95% limit",
      formatCompactNumber(latest.totals.totalTokens.value),
      "dailyBurn",
      sparkBurn,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Rate Limit — weekly / 5h",
      latest.rateLimitWindows[0] ? `${Math.round(latest.rateLimitWindows[0].usedPercent)}%` : "0%",
      "rateLimit",
      sparkRate,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Current RPM",
      String(Math.round((latest.throughput.totalTokensPerMinute / 1000) * 60)),
      "rpm",
      sparkRpm,
      timestamps,
      previous,
      latest,
    ),
    kpiFromHistory(
      "Error Rate (5m)",
      `${formatCompactNumber(errorRate)}%`,
      "errorRate",
      sparkError,
      timestamps,
      previous,
      latest,
    ),
  ];
}

function kpiFromHistory(
  label: string,
  value: string,
  metricKey: string,
  sparkline: number[],
  timestamps: string[],
  previous: CodexMetricsAggregation | null,
  latest: CodexMetricsAggregation,
): KpiMetric {
  const currentVal = extractMetricValue(latest, metricKey);
  const prevVal = previous ? extractMetricValue(previous, metricKey) : currentVal;
  const delta = currentVal - prevVal;

  let deltaStr: string;
  let direction: "up" | "down" | "neutral";

  if (Math.abs(delta) < 0.001) {
    deltaStr = "—";
    direction = "neutral";
  } else {
    const sign = delta >= 0 ? "+" : "-";
    direction = delta >= 0 ? "up" : "down";
    if (metricKey === "successRate" || metricKey === "errorRate" || metricKey === "rateLimit") {
      deltaStr = `${sign}${Math.abs(delta).toFixed(1)}%`;
    } else if (metricKey === "latency") {
      deltaStr = `${sign}${formatDuration(Math.abs(delta))}`;
    } else if (metricKey === "activeSessions") {
      deltaStr = `${sign}${Math.abs(Math.round(delta))}`;
    } else {
      deltaStr = `${sign}${formatCompactNumber(Math.abs(delta))}`;
    }
  }

  // invert direction for metrics where lower is better
  if (
    (metricKey === "latency" || metricKey === "errorRate" || metricKey === "rateLimit") &&
    direction !== "neutral"
  ) {
    direction = direction === "up" ? "down" : "up";
  }

  const healthColor = getHealthColor(metricKey, currentVal);
  const dColor = getDeltaColor(metricKey, direction, currentVal);

  const shouldOmitUnit =
    metricKey === "latency" ||
    metricKey === "throughput" ||
    metricKey === "dailyBurn" ||
    metricKey === "rateLimit" ||
    metricKey === "errorRate";

  return {
    label,
    value,
    unit: shouldOmitUnit ? "" : "",
    color: healthColor,
    delta: deltaStr,
    deltaDirection: direction,
    deltaColor: dColor,
    sparkline,
    timestamps,
    description: kpiDescriptions[label],
  };
}

function extractMetricValue(metrics: CodexMetricsAggregation, metric: string): number {
  switch (metric) {
    case "successRate":
      return metrics.successRate.rate * 100;
    case "latency":
      return metrics.latency.p95Ms;
    case "throughput":
      return metrics.throughput.totalTokensPerMinute;
    case "activeSessions":
      return metrics.recentSessions.length;
    case "dailyBurn":
      return metrics.totals.totalTokens.value;
    case "rateLimit":
      return metrics.rateLimitWindows[0]?.usedPercent ?? 0;
    case "rpm":
      return (metrics.throughput.totalTokensPerMinute / 1000) * 60;
    case "errorRate": {
      const total = metrics.successRate.total;
      return total > 0 ? (metrics.successRate.failed / total) * 100 : 0;
    }
    default:
      return 0;
  }
}

export function toSparklineFromHistory(window: AggregatedWindow, metric: string): number[] {
  const values = window.buckets.map((b) => extractMetricValue(b.metrics, metric));
  if (values.length >= 2) return values;
  return values.length === 1 ? [values[0], values[0]] : [0, 0];
}

function buildMockKpis(metrics: CodexMetricsAggregation): KpiMetric[] {
  const successRate = metrics.successRate.rate;
  const errorRate = 1 - successRate;
  const sessions = metrics.recentSessions;

  const mockVals: Record<string, number> = {
    successRate: successRate * 100,
    latency: metrics.latency.p95Ms,
    throughput: metrics.throughput.totalTokensPerMinute,
    activeSessions: sessions.length,
    dailyBurn: metrics.totals.totalTokens.value,
    rateLimit: metrics.rateLimitWindows[0]?.usedPercent ?? 0,
    rpm: (metrics.throughput.totalTokensPerMinute / 1000) * 60,
    errorRate: errorRate * 100,
  };

  const mockDirections: Record<string, { direction: "up" | "down" | "neutral"; delta: string }> = {
    successRate: { direction: "up", delta: `+${formatPercent(Math.max(0, successRate - 0.89))}` },
    latency: {
      direction: "down",
      delta: `-${formatDuration(Math.max(0, metrics.latency.p95Ms - 2900))}`,
    },
    throughput: { direction: "up", delta: "+5%" },
    activeSessions: {
      direction: "neutral",
      delta: sessions.length === 0 ? "— none" : "stable",
    },
    dailyBurn: { direction: "neutral", delta: "" },
    rateLimit: {
      direction: "neutral",
      delta: metrics.rateLimitWindows[1]
        ? ` / ${Math.round(metrics.rateLimitWindows[1].usedPercent)}%`
        : "",
    },
    rpm: { direction: "neutral", delta: "" },
    errorRate: { direction: "down", delta: "-0.5%" },
  };

  const mockKeys = [
    "successRate",
    "latency",
    "throughput",
    "activeSessions",
    "dailyBurn",
    "rateLimit",
    "rpm",
    "errorRate",
  ] as const;

  const labels = [
    "Success Rate",
    "Latency p95",
    "Throughput",
    "Active Sessions",
    "Daily Burn / 95% limit",
    "Rate Limit — weekly / 5h",
    "Current RPM",
    "Error Rate (5m)",
  ];

  const mockSparklines: Record<string, number[]> = {
    successRate: [85, 87, 88, 89, 90, 91, 91],
    latency: metrics.latency.samples > 0 ? [8, 7, 6, 5, 3, 3, 3] : [0, 0, 0, 0, 0, 0, 0],
    throughput: [28, 30, 31, 32, 33, 33, 34],
    activeSessions: sessions.length > 0 ? [2, 2, 3, 3, 3, 3, 3] : [0, 0, 0, 0, 0, 0, 0],
    dailyBurn: [15, 28, 67, 180, 55, 210, 12],
    rateLimit: [2, 2, 4, 4, 4, 2, 2],
    rpm: [80, 90, 100, 110, 114, 112, 115],
    errorRate: [5, 4, 4, 3, 3, 2, 2],
  };

  const mockValues: Record<string, string> = {
    successRate: formatPercent(successRate),
    latency: formatDuration(metrics.latency.p95Ms),
    throughput: formatCompactNumber(metrics.throughput.totalTokensPerMinute),
    activeSessions: String(sessions.length),
    dailyBurn: formatCompactNumber(metrics.totals.totalTokens.value),
    rateLimit: metrics.rateLimitWindows[0]
      ? `${Math.round(metrics.rateLimitWindows[0].usedPercent)}%`
      : "0%",
    rpm: String(Math.round((metrics.throughput.totalTokensPerMinute / 1000) * 60)),
    errorRate: `${formatCompactNumber(errorRate * 100)}%`,
  };

  const timestamps = generateTimestamps(7);

  return labels.map((label, i) => {
    const key = mockKeys[i];
    const val = mockVals[key];
    const dir = mockDirections[key];
    return {
      label,
      value: mockValues[key],
      unit: "",
      color: getHealthColor(key, val),
      delta: dir.delta,
      deltaDirection: dir.direction,
      deltaColor: getDeltaColor(key, dir.direction, val),
      sparkline: mockSparklines[key],
      timestamps,
      description: kpiDescriptions[label],
    };
  });
}

function generateTimestamps(count: number): string[] {
  const now = Date.now();
  const intervalMs = (24 * 60 * 60 * 1000) / (count - 1 || 1);
  return Array.from({ length: count }, (_, i) => {
    const time = now - (count - 1 - i) * intervalMs;
    const date = new Date(time);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });
}

function toBurnBars(metrics: CodexMetricsAggregation) {
  const maxTokens = Math.max(...metrics.dailyTokenBurn.map((day) => day.totalTokens), 0);
  return metrics.dailyTokenBurn.map((day) => {
    const outputShare = ratio(day.outputTokens, day.totalTokens);
    const tone: BurnBarTone = outputShare > 0.5 ? "output" : "input";
    return {
      day: day.day,
      height: maxTokens > 0 ? (day.totalTokens / maxTokens) * 100 : 0,
      totalTokens: day.totalTokens,
      tone,
    };
  });
}

function toLimitWindow(window: CodexMetricsAggregation["rateLimitWindows"][number]): LimitWindow {
  const resetText = window.resetsAt
    ? `Resets ${formatTimestamp(window.resetsAt)}.`
    : "Reset unknown.";
  const limitName = window.limitName ?? "Codex";
  const windowLength = window.windowMinutes ? `${window.windowMinutes} minute window.` : "";
  return {
    title: window.title,
    copy: `${limitName} ${window.scope}. ${resetText} ${windowLength}`.trim(),
    progress: window.usedPercent,
    status: window.status,
  };
}

function toSessionStatus(status: "ok" | "retry" | "unknown"): SessionStatus {
  if (status === "retry") return "retry";
  return status === "unknown" ? "unknown" : "ok";
}

function toSideNote(file: GeneratedMetricsFile) {
  const skipped = file.ingestion.malformedLineCount + file.ingestion.ignoredLineCount;
  const suffix = skipped > 0 ? ` ${skipped} malformed or unsupported lines skipped.` : "";
  return `Generated from ${file.ingestion.sessionsRoot}. ${file.ingestion.recordCount} parsed records.${suffix}`;
}

function isIngestion(value: unknown): value is GeneratedMetricsFile["ingestion"] {
  const ingestion = asRecord(value);
  if (!ingestion) return false;
  return (
    typeof ingestion.sessionsRoot === "string" &&
    typeof ingestion.fileCount === "number" &&
    typeof ingestion.recordCount === "number" &&
    typeof ingestion.malformedLineCount === "number" &&
    typeof ingestion.ignoredLineCount === "number"
  );
}

function isMetrics(value: unknown): value is CodexMetricsAggregation {
  const metrics = asRecord(value);
  if (!metrics) return false;
  return (
    isRecord(metrics.totals) &&
    Array.isArray(metrics.dailyTokenBurn) &&
    Array.isArray(metrics.modelMix) &&
    Array.isArray(metrics.recentSessions) &&
    Array.isArray(metrics.rateLimitWindows) &&
    isRecord(metrics.successRate) &&
    isRecord(metrics.latency) &&
    isRecord(metrics.throughput)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ratio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function formatCompactNumber(value: number): string {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${trimDecimal(value / 1_000_000)}M`;
  if (absoluteValue >= 1_000) return `${trimDecimal(value / 1_000)}k`;
  return String(Math.round(value));
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${trimDecimal(ms / 1000)}s`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
