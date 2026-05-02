import type { CodexMetricsAggregation } from "../codex-sessions";
import type {
  BurnBarTone,
  CommandCenterData,
  LimitWindow,
  ModelUsageTone,
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

const navItems = [
  { label: "Overview", href: "#overview", order: "01", active: true },
  { label: "Tokens", href: "#tokens", order: "02" },
  { label: "Limits", href: "#limits", order: "03" },
  { label: "Models", href: "#models", order: "04" },
  { label: "Sessions", href: "#sessions", order: "05" },
] satisfies CommandCenterData["navItems"];

const modelTones = ["green", "orange", "blue", "red"] as const satisfies readonly ModelUsageTone[];

export function isGeneratedMetricsFile(value: unknown): value is GeneratedMetricsFile {
  const file = asRecord(value);

  if (!file) {
    return false;
  }

  return (
    file.schemaVersion === 1 &&
    typeof file.generatedAt === "string" &&
    isIngestion(file.ingestion) &&
    isMetrics(file.metrics)
  );
}

type CommandCenterDataOptions = {
  refreshStatus?: string;
};

export function toCommandCenterData(
  file: GeneratedMetricsFile,
  options: CommandCenterDataOptions = {},
): CommandCenterData {
  const metrics = file.metrics;
  const totals = metrics.totals;
  const hasRecords = file.ingestion.recordCount > 0;
  const updatedAt = `Updated ${formatTime(file.generatedAt)}. Polling every 3s.`;

  return {
    title: "Codex usage command center",
    subtitle: hasRecords
      ? `Generated ${formatTimestamp(file.generatedAt)} from local Codex JSONL.`
      : "No local Codex session records found. Generate metrics after Codex has written sessions.",
    refreshStatus: options.refreshStatus ?? updatedAt,
    navItems,
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
        value: formatCompactNumber(totals.totalTokens.value),
        delta: `${formatCompactNumber(totals.inputTokens.value)} input tokens`,
      },
      {
        label: "Cached input",
        source: totals.cachedInputTokens.sourceLabel,
        value: formatCompactNumber(totals.cachedInputTokens.value),
        delta: `${formatPercent(ratio(totals.cachedInputTokens.value, totals.inputTokens.value))} of input`,
      },
      {
        label: "Output tokens",
        source: totals.outputTokens.sourceLabel,
        value: formatCompactNumber(totals.outputTokens.value),
        delta: `${formatCompactNumber(totals.reasoningOutputTokens.value)} reasoning tokens`,
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
        value: formatPercent(metrics.successRate.rate),
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
    sessions: metrics.recentSessions.slice(0, 5).map((session) => ({
      name: session.name,
      model: session.model,
      tokens: formatCompactNumber(session.totalTokens),
      cost: "not priced",
      status: toSessionStatus(session.status),
    })),
    modelUsage: metrics.modelMix.map((usage, index) => ({
      model: usage.model,
      share: usage.share * 100,
      tone: modelTones[index % modelTones.length] ?? "green",
    })),
  };
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
  if (status === "retry") {
    return "retry";
  }

  return status === "unknown" ? "unknown" : "ok";
}

function toSideNote(file: GeneratedMetricsFile) {
  const skipped = file.ingestion.malformedLineCount + file.ingestion.ignoredLineCount;
  const suffix = skipped > 0 ? ` ${skipped} malformed or unsupported lines skipped.` : "";

  return `Generated from ${file.ingestion.sessionsRoot}. ${file.ingestion.recordCount} parsed records.${suffix}`;
}

function isIngestion(value: unknown): value is GeneratedMetricsFile["ingestion"] {
  const ingestion = asRecord(value);

  if (!ingestion) {
    return false;
  }

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

  if (!metrics) {
    return false;
  }

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

function formatCompactNumber(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${trimDecimal(value / 1_000)}k`;
  }

  return String(Math.round(value));
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(ms: number) {
  if (ms <= 0) {
    return "0s";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${trimDecimal(ms / 1000)}s`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
