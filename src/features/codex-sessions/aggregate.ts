import type {
  CodexJsonlRecord,
  CodexRateLimits,
  CodexRateLimitWindow,
  CodexSessionMetaRecord,
  CodexTokenCountRecord,
  CodexTokenUsage,
} from "./types";

export type AggregatedValueKind = "derived" | "estimated" | "real";

export type AggregatedNumber = {
  value: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedTokenTotals = {
  totalTokens: AggregatedNumber;
  inputTokens: AggregatedNumber;
  cachedInputTokens: AggregatedNumber;
  outputTokens: AggregatedNumber;
  reasoningOutputTokens: AggregatedNumber;
};

export type AggregatedModelMixItem = {
  model: string;
  tokens: number;
  sessions: number;
  share: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedDailyTokenBurn = {
  date: string;
  day: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedRecentSession = {
  sessionId: string;
  name: string;
  cwd: string | null;
  startedAt: string | null;
  lastSeenAt: string | null;
  model: string;
  totalTokens: number;
  status: "ok" | "retry" | "unknown";
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedRateLimitWindow = {
  key: string;
  limitId: string | null;
  limitName: string | null;
  scope: "primary" | "secondary";
  title: string;
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: string | null;
  status: "ok" | "watch";
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedSuccessRate = {
  successful: number;
  failed: number;
  total: number;
  rate: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedLatency = {
  averageMs: number;
  p95Ms: number;
  samples: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type AggregatedThroughput = {
  elapsedMs: number;
  outputTokensPerMinute: number;
  totalTokensPerMinute: number;
  sourceKind: AggregatedValueKind;
  sourceLabel: string;
};

export type CodexMetricsAggregation = {
  sourceLabels: Record<AggregatedValueKind, string>;
  totals: AggregatedTokenTotals;
  dailyTokenBurn: AggregatedDailyTokenBurn[];
  modelMix: AggregatedModelMixItem[];
  recentSessions: AggregatedRecentSession[];
  rateLimitWindows: AggregatedRateLimitWindow[];
  successRate: AggregatedSuccessRate;
  latency: AggregatedLatency;
  throughput: AggregatedThroughput;
};

type AggregateCodexMetricsOptions = {
  recentSessionLimit?: number;
};

type SessionAccumulator = {
  key: string;
  sessionId: string | null;
  cwd: string | null;
  startedAtMs: number | null;
  lastSeenAtMs: number | null;
  model: string;
  modelSourceKind: AggregatedValueKind;
  totalTokens: number;
  failedEvents: number;
  observedEvents: number;
};

type UsageSample = {
  key: string;
  usage: CodexTokenUsage;
  timestampMs: number | null;
  lineNumber: number;
};

const sourceLabels = {
  real: "real",
  derived: "derived",
  estimated: "estimated",
} satisfies Record<AggregatedValueKind, string>;

const zeroUsage: CodexTokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0,
};

export function aggregateCodexMetrics(
  records: readonly CodexJsonlRecord[],
  options: AggregateCodexMetricsOptions = {},
): CodexMetricsAggregation {
  const recentSessionLimit = options.recentSessionLimit ?? 5;
  const sessions = buildSessionAccumulators(records);
  const usageSamples = collectUsageSamples(records);
  const totals = sumUsageSamples(usageSamples);
  const outcomes = collectOutcomes(records);
  const durations = collectDurations(records);
  const rateLimitWindows = collectRateLimitWindows(records);

  applySessionUsage(sessions, usageSamples);
  applySessionOutcomes(sessions, records);

  return {
    sourceLabels,
    totals: toAggregatedTokenTotals(totals),
    dailyTokenBurn: toDailyTokenBurn(usageSamples),
    modelMix: toModelMix(sessions),
    recentSessions: toRecentSessions(sessions, recentSessionLimit),
    rateLimitWindows,
    successRate: toSuccessRate(outcomes),
    latency: toLatency(durations),
    throughput: toThroughput(totals, usageSamples),
  };
}

function buildSessionAccumulators(records: readonly CodexJsonlRecord[]) {
  const sessions = new Map<string, SessionAccumulator>();

  for (const record of records) {
    const key = record.source.filePath || `line:${record.source.lineNumber}`;
    const session = ensureSession(sessions, key);
    const sourceTimestampMs = parseTimestampMs(record.source.timestamp);

    session.lastSeenAtMs = maxNullable(session.lastSeenAtMs, sourceTimestampMs);

    if (record.kind !== "session_meta") {
      continue;
    }

    const modelInfo = readModelInfo(record);

    session.sessionId = record.sessionId ?? session.sessionId;
    session.cwd = record.cwd ?? session.cwd;
    session.startedAtMs = parseTimestampMs(record.startedAt) ?? session.startedAtMs;
    session.model = modelInfo.model;
    session.modelSourceKind = modelInfo.sourceKind;
  }

  return sessions;
}

function ensureSession(sessions: Map<string, SessionAccumulator>, key: string) {
  const existing = sessions.get(key);

  if (existing) {
    return existing;
  }

  const session: SessionAccumulator = {
    key,
    sessionId: null,
    cwd: null,
    startedAtMs: null,
    lastSeenAtMs: null,
    model: "unknown model",
    modelSourceKind: "estimated",
    totalTokens: 0,
    failedEvents: 0,
    observedEvents: 0,
  };

  sessions.set(key, session);

  return session;
}

function readModelInfo(record: CodexSessionMetaRecord) {
  if (record.model) {
    return { model: record.model, sourceKind: "real" as const };
  }

  if (record.modelProvider) {
    return { model: `${record.modelProvider} model`, sourceKind: "estimated" as const };
  }

  return { model: "unknown model", sourceKind: "estimated" as const };
}

function collectUsageSamples(records: readonly CodexJsonlRecord[]) {
  const incrementalSamples: UsageSample[] = [];
  const latestTotals = new Map<string, UsageSample>();
  const keysWithIncrementalUsage = new Set<string>();

  for (const record of records) {
    if (record.kind !== "token_count") {
      continue;
    }

    const key = record.source.filePath || `line:${record.source.lineNumber}`;
    const timestampMs = parseTimestampMs(record.source.timestamp);

    if (record.lastTokenUsage) {
      incrementalSamples.push({
        key,
        usage: record.lastTokenUsage,
        timestampMs,
        lineNumber: record.source.lineNumber,
      });
      keysWithIncrementalUsage.add(key);
      continue;
    }

    if (!record.totalTokenUsage) {
      continue;
    }

    const sample = {
      key,
      usage: record.totalTokenUsage,
      timestampMs,
      lineNumber: record.source.lineNumber,
    };
    const previous = latestTotals.get(key);

    if (!previous || compareSampleOrder(sample, previous) > 0) {
      latestTotals.set(key, sample);
    }
  }

  const fallbackSamples = [...latestTotals.values()].filter(
    (sample) => !keysWithIncrementalUsage.has(sample.key),
  );

  return [...incrementalSamples, ...fallbackSamples];
}

function sumUsageSamples(samples: readonly UsageSample[]) {
  return samples.reduce(addUsage, zeroUsage);
}

function addUsage(total: CodexTokenUsage, sample: UsageSample): CodexTokenUsage {
  return {
    inputTokens: total.inputTokens + sample.usage.inputTokens,
    cachedInputTokens: total.cachedInputTokens + sample.usage.cachedInputTokens,
    outputTokens: total.outputTokens + sample.usage.outputTokens,
    reasoningOutputTokens: total.reasoningOutputTokens + sample.usage.reasoningOutputTokens,
    totalTokens: total.totalTokens + sample.usage.totalTokens,
  };
}

function applySessionUsage(
  sessions: Map<string, SessionAccumulator>,
  usageSamples: readonly UsageSample[],
) {
  for (const sample of usageSamples) {
    const session = ensureSession(sessions, sample.key);

    session.totalTokens += sample.usage.totalTokens;
    session.lastSeenAtMs = maxNullable(session.lastSeenAtMs, sample.timestampMs);
  }
}

function collectOutcomes(records: readonly CodexJsonlRecord[]) {
  let successful = 0;
  let failed = 0;

  for (const record of records) {
    const outcome = readOutcome(record);

    if (outcome === null) {
      continue;
    }

    if (outcome) {
      successful += 1;
      continue;
    }

    failed += 1;
  }

  return { successful, failed };
}

function applySessionOutcomes(
  sessions: Map<string, SessionAccumulator>,
  records: readonly CodexJsonlRecord[],
) {
  for (const record of records) {
    const outcome = readOutcome(record);

    if (outcome === null) {
      continue;
    }

    const key = record.source.filePath || `line:${record.source.lineNumber}`;
    const session = ensureSession(sessions, key);

    session.observedEvents += 1;
    session.failedEvents += outcome ? 0 : 1;
  }
}

function readOutcome(record: CodexJsonlRecord) {
  if (record.kind !== "exec_command_end" && record.kind !== "tool_call_output") {
    return null;
  }

  if (record.exitCode !== null) {
    return record.exitCode === 0;
  }

  if (
    record.status === "completed" ||
    record.status === "success" ||
    record.status === "succeeded"
  ) {
    return true;
  }

  if (record.status === "cancelled" || record.status === "error" || record.status === "failed") {
    return false;
  }

  return null;
}

function collectDurations(records: readonly CodexJsonlRecord[]) {
  const durations: number[] = [];

  for (const record of records) {
    if (record.kind !== "exec_command_end" && record.kind !== "tool_call_output") {
      continue;
    }

    if (record.durationMs !== null && record.durationMs >= 0) {
      durations.push(record.durationMs);
    }
  }

  return durations;
}

function collectRateLimitWindows(records: readonly CodexJsonlRecord[]) {
  const windows = new Map<string, AggregatedRateLimitWindow & { observedAtMs: number | null }>();

  for (const record of records) {
    if (record.kind !== "token_count" || !record.rateLimits) {
      continue;
    }

    upsertRateLimitWindow(windows, record, "primary", record.rateLimits.primary);
    upsertRateLimitWindow(windows, record, "secondary", record.rateLimits.secondary);
  }

  return [...windows.values()]
    .sort((left, right) => {
      const observedDelta = (right.observedAtMs ?? 0) - (left.observedAtMs ?? 0);
      return observedDelta || left.key.localeCompare(right.key);
    })
    .map(({ observedAtMs: _observedAtMs, ...window }) => window);
}

function upsertRateLimitWindow(
  windows: Map<string, AggregatedRateLimitWindow & { observedAtMs: number | null }>,
  record: CodexTokenCountRecord,
  scope: "primary" | "secondary",
  window: CodexRateLimitWindow | null,
) {
  if (!window) {
    return;
  }

  const observedAtMs = parseTimestampMs(record.source.timestamp);
  const key = `${record.rateLimits?.limitId ?? "codex"}:${scope}`;
  const existing = windows.get(key);

  if (existing && compareNullableTimestamp(existing.observedAtMs, observedAtMs) >= 0) {
    return;
  }

  windows.set(key, toRateLimitWindow(key, record.rateLimits, scope, window, observedAtMs));
}

function toRateLimitWindow(
  key: string,
  rateLimits: CodexRateLimits | null,
  scope: "primary" | "secondary",
  window: CodexRateLimitWindow,
  observedAtMs: number | null,
): AggregatedRateLimitWindow & { observedAtMs: number | null } {
  const usedPercent = clampPercentage(window.usedPercent ?? 0);

  return {
    key,
    limitId: rateLimits?.limitId ?? null,
    limitName: rateLimits?.limitName ?? null,
    scope,
    title: `${formatWindowLength(window.windowMinutes)} ${scope}`,
    usedPercent,
    windowMinutes: window.windowMinutes,
    resetsAt: formatTimestamp(window.resetsAt === null ? null : window.resetsAt * 1000),
    status: usedPercent >= 60 ? "watch" : "ok",
    sourceKind: "real" as const,
    sourceLabel: sourceLabels.real,
    observedAtMs,
  };
}

function toAggregatedTokenTotals(usage: CodexTokenUsage): AggregatedTokenTotals {
  return {
    totalTokens: toNumber(usage.totalTokens, "real"),
    inputTokens: toNumber(usage.inputTokens, "real"),
    cachedInputTokens: toNumber(usage.cachedInputTokens, "real"),
    outputTokens: toNumber(usage.outputTokens, "real"),
    reasoningOutputTokens: toNumber(usage.reasoningOutputTokens, "real"),
  };
}

function toModelMix(sessions: Map<string, SessionAccumulator>) {
  const groups = new Map<string, AggregatedModelMixItem>();
  const sessionList = [...sessions.values()];
  const totalTokens = sessionList.reduce((sum, session) => sum + session.totalTokens, 0);

  for (const session of sessionList) {
    const existing = groups.get(session.model);
    const sourceKind = existing
      ? leastCertainSourceKind(existing.sourceKind, session.modelSourceKind)
      : session.modelSourceKind;

    groups.set(session.model, {
      model: session.model,
      tokens: (existing?.tokens ?? 0) + session.totalTokens,
      sessions: (existing?.sessions ?? 0) + 1,
      share: 0,
      sourceKind,
      sourceLabel: sourceLabels[sourceKind],
    });
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      share:
        totalTokens > 0
          ? item.tokens / totalTokens
          : item.sessions / Math.max(sessionList.length, 1),
    }))
    .sort((left, right) => right.share - left.share || left.model.localeCompare(right.model));
}

function toDailyTokenBurn(samples: readonly UsageSample[]): AggregatedDailyTokenBurn[] {
  const timestamps = samples
    .map((sample) => sample.timestampMs)
    .filter((timestamp): timestamp is number => timestamp !== null);

  if (timestamps.length === 0) {
    return [];
  }

  const latestDayMs = startOfUtcDay(Math.max(...timestamps));
  const firstDayMs = latestDayMs - 6 * dayMs;
  const dailyTotals = new Map<string, AggregatedDailyTokenBurn>();

  for (let index = 0; index < 7; index += 1) {
    const dayTimestampMs = firstDayMs + index * dayMs;
    const date = formatDate(dayTimestampMs);

    dailyTotals.set(date, {
      date,
      day: formatDay(dayTimestampMs),
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      sourceKind: "real",
      sourceLabel: sourceLabels.real,
    });
  }

  for (const sample of samples) {
    if (sample.timestampMs === null) {
      continue;
    }

    const date = formatDate(sample.timestampMs);
    const day = dailyTotals.get(date);

    if (!day) {
      continue;
    }

    day.inputTokens += sample.usage.inputTokens;
    day.cachedInputTokens += sample.usage.cachedInputTokens;
    day.outputTokens += sample.usage.outputTokens;
    day.totalTokens += sample.usage.totalTokens;
  }

  return [...dailyTotals.values()];
}

function toRecentSessions(
  sessions: Map<string, SessionAccumulator>,
  limit: number,
): AggregatedRecentSession[] {
  return [...sessions.values()]
    .sort((left, right) => (right.lastSeenAtMs ?? 0) - (left.lastSeenAtMs ?? 0))
    .slice(0, limit)
    .map((session) => ({
      sessionId: session.sessionId ?? session.key,
      name: toSessionName(session),
      cwd: session.cwd,
      startedAt: formatTimestamp(session.startedAtMs),
      lastSeenAt: formatTimestamp(session.lastSeenAtMs),
      model: session.model,
      totalTokens: session.totalTokens,
      status: toSessionStatus(session),
      sourceKind: "derived" as const,
      sourceLabel: sourceLabels.derived,
    }));
}

function toSessionName(session: SessionAccumulator) {
  const label = session.cwd ? basename(session.cwd) : (session.sessionId ?? session.key);
  const time = formatTime(session.startedAtMs ?? session.lastSeenAtMs);

  return time ? `${time} ${label}` : label;
}

function toSessionStatus(session: SessionAccumulator): AggregatedRecentSession["status"] {
  if (session.failedEvents > 0) {
    return "retry";
  }

  return session.observedEvents > 0 ? "ok" : "unknown";
}

function toSuccessRate(outcomes: { successful: number; failed: number }): AggregatedSuccessRate {
  const total = outcomes.successful + outcomes.failed;

  return {
    successful: outcomes.successful,
    failed: outcomes.failed,
    total,
    rate: total === 0 ? 0 : outcomes.successful / total,
    sourceKind: "derived",
    sourceLabel: sourceLabels.derived,
  };
}

function toLatency(durations: readonly number[]): AggregatedLatency {
  return {
    averageMs: average(durations),
    p95Ms: percentile(durations, 0.95),
    samples: durations.length,
    sourceKind: "derived",
    sourceLabel: sourceLabels.derived,
  };
}

function toThroughput(
  usage: CodexTokenUsage,
  usageSamples: readonly UsageSample[],
): AggregatedThroughput {
  const timestamps = usageSamples
    .map((sample) => sample.timestampMs)
    .filter((timestamp): timestamp is number => timestamp !== null);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const elapsedMs = timestamps.length < 2 ? 0 : Math.max(maxTimestamp - minTimestamp, 0);
  const elapsedMinutes = elapsedMs / 60_000;

  return {
    elapsedMs,
    outputTokensPerMinute: elapsedMinutes > 0 ? usage.outputTokens / elapsedMinutes : 0,
    totalTokensPerMinute: elapsedMinutes > 0 ? usage.totalTokens / elapsedMinutes : 0,
    sourceKind: "derived",
    sourceLabel: sourceLabels.derived,
  };
}

function toNumber(value: number, sourceKind: AggregatedValueKind): AggregatedNumber {
  return { value, sourceKind, sourceLabel: sourceLabels[sourceKind] };
}

function leastCertainSourceKind(
  left: AggregatedValueKind,
  right: AggregatedValueKind,
): AggregatedValueKind {
  if (left === "estimated" || right === "estimated") {
    return "estimated";
  }

  if (left === "derived" || right === "derived") {
    return "derived";
  }

  return "real";
}

function compareSampleOrder(left: UsageSample, right: UsageSample) {
  return (
    compareNullableTimestamp(left.timestampMs, right.timestampMs) ||
    left.lineNumber - right.lineNumber
  );
}

function compareNullableTimestamp(left: number | null, right: number | null) {
  return (left ?? 0) - (right ?? 0);
}

function parseTimestampMs(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatTimestamp(timestampMs: number | null) {
  return timestampMs === null ? null : new Date(timestampMs).toISOString();
}

const dayMs = 86_400_000;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function startOfUtcDay(timestampMs: number) {
  const date = new Date(timestampMs);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDate(timestampMs: number) {
  return new Date(startOfUtcDay(timestampMs)).toISOString().slice(0, 10);
}

function formatDay(timestampMs: number) {
  return dayLabels[new Date(timestampMs).getUTCDay()] ?? "";
}

function formatTime(timestampMs: number | null) {
  if (timestampMs === null) {
    return null;
  }

  return new Date(timestampMs).toISOString().slice(11, 16);
}

function formatWindowLength(windowMinutes: number | null) {
  if (windowMinutes === null) {
    return "unknown window";
  }

  if (windowMinutes % 10_080 === 0) {
    return `${windowMinutes / 10_080}w window`;
  }

  if (windowMinutes % 60 === 0) {
    return `${windowMinutes / 60}h window`;
  }

  return `${windowMinutes}m window`;
}

function average(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: readonly number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * percentileValue) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

function maxNullable(left: number | null, right: number | null) {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return Math.max(left, right);
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function basename(path: string) {
  const normalizedPath = path.replaceAll("\\", "/");
  const parts = normalizedPath.split("/").filter(Boolean);

  return parts.at(-1) ?? normalizedPath;
}
