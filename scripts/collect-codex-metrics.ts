import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
  DailyTokenPoint,
  LimitMetrics,
  MetricCard,
  MetricsSnapshot,
  ModelUsage,
  RecentSession,
  TokenUsage,
} from "../src/features/metrics/types";

type UnknownRecord = Record<string, unknown>;

type Price = {
  input: number;
  cachedInput: number;
  output: number;
};

type SessionDraft = {
  id: string;
  label: string;
  filePath: string;
  startedAt: string;
  lastEventAt: string;
  cwd: string | null;
  model: string;
  failedCommands: number;
  totalCommands: number;
  turnCount: number;
  latestTokens: TokenUsage;
  tokenEvents: Array<{ timestamp: string; usage: TokenUsage; model: string }>;
  latencies: number[];
  latestLimit: { timestamp: string; limits: LimitMetrics } | null;
};

const pricing: Array<{ match: string; price: Price }> = [
  { match: "gpt-5.5", price: { input: 5, cachedInput: 0.5, output: 30 } },
  { match: "gpt-5.4 mini", price: { input: 0.75, cachedInput: 0.075, output: 4.5 } },
  { match: "gpt-5.4", price: { input: 2.5, cachedInput: 0.25, output: 15 } },
  { match: "gpt-5.2", price: { input: 1.75, cachedInput: 0.175, output: 14 } },
  { match: "gpt-5.1", price: { input: 1.25, cachedInput: 0.125, output: 10 } },
  { match: "gpt-5-codex", price: { input: 1.25, cachedInput: 0.125, output: 10 } },
  { match: "gpt-5", price: { input: 1.25, cachedInput: 0.125, output: 10 } },
];

const zeroUsage: TokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0,
};

const unknownLimits: LimitMetrics = {
  planType: null,
  status: "unknown",
  primary: { usedPercent: null, windowMinutes: null, resetsAt: null },
  secondary: { usedPercent: null, windowMinutes: null, resetsAt: null },
};

const codexHome = process.env.CODEX_HOME ?? path.join(homedir(), ".codex");
const sessionRoot = path.join(codexHome, "sessions");
const outputPath = path.join(process.cwd(), "public", "metrics.json");

async function main() {
  const warnings: string[] = [];
  const sessionFiles = await discoverSessionFiles(sessionRoot, warnings);
  const sessions = await parseSessions(sessionFiles, warnings);
  const snapshot = buildSnapshot(sessions, warnings);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Wrote ${path.relative(process.cwd(), outputPath)} from ${sessions.length} sessions.`);
}

async function discoverSessionFiles(root: string, warnings: string[]): Promise<string[]> {
  try {
    const rootStats = await stat(root);

    if (!rootStats.isDirectory()) {
      warnings.push(`Codex sessions path is not a directory: ${root}`);
      return [];
    }
  } catch {
    warnings.push(`Codex sessions path not found: ${root}`);
    return [];
  }

  return walkJsonl(root, warnings);
}

async function walkJsonl(root: string, warnings: string[]): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkJsonl(fullPath, warnings)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function parseSessions(files: string[], warnings: string[]): Promise<SessionDraft[]> {
  const sessions: SessionDraft[] = [];

  for (const filePath of files) {
    const session = await parseSession(filePath, warnings);

    if (session) {
      sessions.push(session);
    }
  }

  return sessions.sort((a, b) => new Date(b.lastEventAt).getTime() - new Date(a.lastEventAt).getTime());
}

async function parseSession(filePath: string, warnings: string[]): Promise<SessionDraft | null> {
  let fileText = "";

  try {
    fileText = await readFile(filePath, "utf8");
  } catch {
    warnings.push(`Could not read session: ${filePath}`);
    return null;
  }

  const basename = path.basename(filePath, ".jsonl");
  const draft: SessionDraft = {
    id: basename,
    label: basename,
    filePath,
    startedAt: new Date(0).toISOString(),
    lastEventAt: new Date(0).toISOString(),
    cwd: null,
    model: "unknown",
    failedCommands: 0,
    totalCommands: 0,
    turnCount: 0,
    latestTokens: { ...zeroUsage },
    tokenEvents: [],
    latencies: [],
    latestLimit: null,
  };

  let currentTurnStartedAt: string | null = null;
  let invalidLines = 0;

  for (const line of fileText.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const event = parseJson(line);

    if (!event) {
      invalidLines += 1;
      continue;
    }

    const timestamp = readString(event.timestamp) ?? draft.lastEventAt;
    const payload = readRecord(event.payload);

    if (draft.startedAt === new Date(0).toISOString()) {
      draft.startedAt = timestamp;
    }

    draft.lastEventAt = timestamp;

    if (!payload) continue;

    const payloadType = readString(payload.type) ?? readString(event.type);

    if (readString(event.type) === "session_meta") {
      applySessionMeta(draft, payload, timestamp);
      continue;
    }

    if (payloadType === "task_started") {
      currentTurnStartedAt = readString(payload.started_at) ?? timestamp;
      draft.turnCount += 1;
      continue;
    }

    if (payloadType === "token_count") {
      applyTokenCount(draft, payload, timestamp, currentTurnStartedAt);
      currentTurnStartedAt = null;
      continue;
    }

    if (readString(event.type) === "turn_context") {
      applyTurnContext(draft, payload);
      continue;
    }

    if (payloadType === "exec_command_end") {
      draft.totalCommands += 1;

      if (readNumber(payload.exit_code) !== 0) {
        draft.failedCommands += 1;
      }
    }
  }

  if (invalidLines > 0) {
    warnings.push(`${invalidLines} invalid JSONL lines skipped in ${path.basename(filePath)}`);
  }

  if (draft.startedAt === new Date(0).toISOString()) {
    return null;
  }

  return draft;
}

function applySessionMeta(draft: SessionDraft, payload: UnknownRecord, timestamp: string) {
  draft.id = readString(payload.id) ?? draft.id;
  draft.startedAt = readString(payload.timestamp) ?? timestamp;
  draft.cwd = readString(payload.cwd) ?? draft.cwd;
}

function applyTurnContext(draft: SessionDraft, payload: UnknownRecord) {
  draft.cwd = readString(payload.cwd) ?? draft.cwd;

  const model = readString(payload.model);
  const effort = readString(payload.effort);

  if (model) {
    draft.model = effort ? `${model} ${effort}` : model;
  }
}

function applyTokenCount(
  draft: SessionDraft,
  payload: UnknownRecord,
  timestamp: string,
  turnStartedAt: string | null,
) {
  const info = readRecord(payload.info);
  const totalUsage = readRecord(info?.total_token_usage);
  const lastUsage = readRecord(info?.last_token_usage);

  if (totalUsage) {
    draft.latestTokens = readTokenUsage(totalUsage);
  }

  if (lastUsage) {
    draft.tokenEvents.push({
      timestamp,
      usage: readTokenUsage(lastUsage),
      model: draft.model,
    });
  }

  if (turnStartedAt) {
    const latency = (new Date(timestamp).getTime() - new Date(turnStartedAt).getTime()) / 1000;

    if (Number.isFinite(latency) && latency >= 0) {
      draft.latencies.push(latency);
    }
  }

  const limits = readRateLimits(payload);

  if (limits) {
    draft.latestLimit = { timestamp, limits };
  }
}

function readRateLimits(payload: UnknownRecord): LimitMetrics | null {
  const rateLimits = readRecord(payload.rate_limits);
  const primary = readRecord(rateLimits?.primary);
  const secondary = readRecord(rateLimits?.secondary);

  if (!rateLimits) return null;

  const primaryPercent = readNumber(primary?.used_percent);
  const secondaryPercent = readNumber(secondary?.used_percent);
  const reachedType = readString(rateLimits.rate_limit_reached_type);

  return {
    planType: readString(rateLimits.plan_type),
    status: reachedType ? "capped" : primaryPercent !== null && primaryPercent >= 70 ? "watch" : "ok",
    primary: {
      usedPercent: primaryPercent,
      windowMinutes: readNumber(primary?.window_minutes),
      resetsAt: readUnixTimestamp(primary?.resets_at),
    },
    secondary: {
      usedPercent: secondaryPercent,
      windowMinutes: readNumber(secondary?.window_minutes),
      resetsAt: readUnixTimestamp(secondary?.resets_at),
    },
  };
}

function buildSnapshot(sessions: SessionDraft[], warnings: string[]): MetricsSnapshot {
  const totalTokens = sumUsage(sessions.map((session) => session.latestTokens));
  const estimatedCost = sessions.reduce(
    (sum, session) => sum + estimateCost(session.model, session.latestTokens),
    0,
  );
  const cachedSavings = sessions.reduce(
    (sum, session) => sum + estimateCachedSavings(session.model, session.latestTokens),
    0,
  );
  const latencies = sessions.flatMap((session) => session.latencies);
  const totalCommands = sessions.reduce((sum, session) => sum + session.totalCommands, 0);
  const failedCommands = sessions.reduce((sum, session) => sum + session.failedCommands, 0);
  const successRate = totalCommands > 0 ? ((totalCommands - failedCommands) / totalCommands) * 100 : null;
  const throughputTokensPerMinute = calculateThroughput(sessions);
  const latestLimits =
    sessions.flatMap((session) => (session.latestLimit ? [session.latestLimit] : []))[0]?.limits ??
    unknownLimits;

  return {
    generatedAt: new Date().toISOString(),
    codexHome,
    pricingSource: "OpenAI API pricing page, standard rates, estimated for local Codex plan usage",
    warnings,
    summary: {
      totalTokens,
      estimatedCost,
      cachedSavings,
      averageLatencySeconds: average(latencies),
      p95LatencySeconds: percentile(latencies, 95),
      successRate,
      failedCommands,
      totalCommands,
      throughputTokensPerMinute,
      sessionCount: sessions.length,
      turnCount: sessions.reduce((sum, session) => sum + session.turnCount, 0),
    },
    limits: latestLimits,
    metricCards: buildMetricCards({
      totalTokens,
      estimatedCost,
      cachedSavings,
      averageLatencySeconds: average(latencies),
      p95LatencySeconds: percentile(latencies, 95),
      successRate,
      failedCommands,
      throughputTokensPerMinute,
    }),
    dailyTokens: buildDailyTokens(sessions),
    recentSessions: buildRecentSessions(sessions),
    modelUsage: buildModelUsage(sessions),
  };
}

function buildMetricCards(input: {
  totalTokens: TokenUsage;
  estimatedCost: number;
  cachedSavings: number;
  averageLatencySeconds: number | null;
  p95LatencySeconds: number | null;
  successRate: number | null;
  failedCommands: number;
  throughputTokensPerMinute: number | null;
}): MetricCard[] {
  return [
    {
      label: "Total tokens",
      value: formatCompact(input.totalTokens.totalTokens),
      detail: `${formatCompact(input.totalTokens.cachedInputTokens)} cached input`,
      source: "local",
      tone: "good",
    },
    {
      label: "Estimated cost",
      value: formatUsd(input.estimatedCost),
      detail: `${formatUsd(input.cachedSavings)} cached savings`,
      source: "estimated",
      tone: "neutral",
    },
    {
      label: "Avg latency",
      value: formatSeconds(input.averageLatencySeconds),
      detail: `p95 ${formatSeconds(input.p95LatencySeconds)}`,
      source: "derived",
      tone: "neutral",
    },
    {
      label: "Success rate",
      value: input.successRate === null ? "n/a" : `${input.successRate.toFixed(1)}%`,
      detail: `${input.failedCommands} failed tool exits`,
      source: "derived",
      tone: input.failedCommands > 0 ? "watch" : "good",
    },
    {
      label: "Throughput",
      value:
        input.throughputTokensPerMinute === null
          ? "n/a"
          : `${formatCompact(input.throughputTokensPerMinute)}/m`,
      detail: "output tokens per minute",
      source: "derived",
      tone: "neutral",
    },
  ];
}

function buildDailyTokens(sessions: SessionDraft[]): DailyTokenPoint[] {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return toDateKey(date);
  });
  const totals = new Map(days.map((day) => [day, { ...zeroUsage }]));

  for (const session of sessions) {
    for (const event of session.tokenEvents) {
      const dateKey = toDateKey(new Date(event.timestamp));
      const total = totals.get(dateKey);

      if (!total) continue;

      addUsage(total, event.usage);
    }
  }

  return days.map((date) => {
    const usage = totals.get(date) ?? zeroUsage;

    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en", { weekday: "short" }),
      ...usage,
    };
  });
}

function buildRecentSessions(sessions: SessionDraft[]): RecentSession[] {
  return sessions.slice(0, 8).map((session, index) => ({
    id: session.id,
    label: session.label,
    startedAt: session.startedAt,
    lastEventAt: session.lastEventAt,
    cwd: session.cwd,
    model: session.model,
    tokens: session.latestTokens,
    estimatedCost: estimateCost(session.model, session.latestTokens),
    status:
      index === 0 && isRecent(session.lastEventAt) ? "live" : session.failedCommands > 0 ? "retry" : "ok",
  }));
}

function buildModelUsage(sessions: SessionDraft[]): ModelUsage[] {
  const groups = new Map<string, { sessions: number; tokens: number; estimatedCost: number }>();
  const totalTokens = sessions.reduce((sum, session) => sum + session.latestTokens.totalTokens, 0);

  for (const session of sessions) {
    const current = groups.get(session.model) ?? { sessions: 0, tokens: 0, estimatedCost: 0 };
    current.sessions += 1;
    current.tokens += session.latestTokens.totalTokens;
    current.estimatedCost += estimateCost(session.model, session.latestTokens);
    groups.set(session.model, current);
  }

  return [...groups.entries()]
    .map(([model, value]) => ({
      model,
      sessions: value.sessions,
      tokens: value.tokens,
      estimatedCost: value.estimatedCost,
      share: totalTokens > 0 ? (value.tokens / totalTokens) * 100 : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);
}

function calculateThroughput(sessions: SessionDraft[]): number | null {
  const outputTokens = sessions.reduce((sum, session) => sum + session.latestTokens.outputTokens, 0);
  const elapsedSeconds = sessions.reduce(
    (sum, session) => sum + session.latencies.reduce((a, b) => a + b, 0),
    0,
  );

  if (elapsedSeconds <= 0) return null;

  return outputTokens / (elapsedSeconds / 60);
}

function estimateCost(model: string, usage: TokenUsage): number {
  const price = findPrice(model);
  const billableInput = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);

  return (
    (billableInput / 1_000_000) * price.input +
    (usage.cachedInputTokens / 1_000_000) * price.cachedInput +
    (usage.outputTokens / 1_000_000) * price.output
  );
}

function estimateCachedSavings(model: string, usage: TokenUsage): number {
  const price = findPrice(model);
  const uncachedCost = (usage.cachedInputTokens / 1_000_000) * price.input;
  const cachedCost = (usage.cachedInputTokens / 1_000_000) * price.cachedInput;

  return Math.max(uncachedCost - cachedCost, 0);
}

function findPrice(model: string): Price {
  const normalized = model.toLowerCase();
  return (
    pricing.find((entry) => normalized.includes(entry.match))?.price ??
    pricing.at(-1)?.price ??
    pricing[0].price
  );
}

function readTokenUsage(value: UnknownRecord): TokenUsage {
  return {
    inputTokens: readNumber(value.input_tokens) ?? 0,
    cachedInputTokens: readNumber(value.cached_input_tokens) ?? 0,
    outputTokens: readNumber(value.output_tokens) ?? 0,
    reasoningOutputTokens: readNumber(value.reasoning_output_tokens) ?? 0,
    totalTokens: readNumber(value.total_tokens) ?? 0,
  };
}

function sumUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce((total, usage) => {
    addUsage(total, usage);
    return total;
  }, structuredClone(zeroUsage));
}

function addUsage(total: TokenUsage, usage: TokenUsage) {
  total.inputTokens += usage.inputTokens;
  total.cachedInputTokens += usage.cachedInputTokens;
  total.outputTokens += usage.outputTokens;
  total.reasoningOutputTokens += usage.reasoningOutputTokens;
  total.totalTokens += usage.totalTokens;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)] ?? null;
}

function parseJson(line: string): UnknownRecord | null {
  try {
    const value = JSON.parse(line) as unknown;
    return readRecord(value);
  } catch {
    return null;
  }
}

function readRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readUnixTimestamp(value: unknown): string | null {
  const timestamp = readNumber(value);

  if (timestamp === null) return null;

  return new Date(timestamp * 1000).toISOString();
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatSeconds(value: number | null): string {
  if (value === null) return "n/a";
  if (value < 60) return `${value.toFixed(1)}s`;

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${seconds}s`;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isRecent(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < 30 * 60 * 1000;
}

void main();
