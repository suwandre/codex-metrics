import {
  aggregateCodexMetrics,
  type CodexJsonlRecord,
  type CodexMetricsAggregation,
} from "../codex-sessions";
import { formatBucketLabel, type TimeWindow } from "../history";

type TimedRecord = {
  record: CodexJsonlRecord;
  timestampMs: number;
};

export type MetricsWindowBucket = {
  timestamp: string;
  label: string;
  metrics: CodexMetricsAggregation;
};

export type MetricsWindowSeries = {
  window: TimeWindow;
  buckets: MetricsWindowBucket[];
  current: CodexMetricsAggregation;
  previous: CodexMetricsAggregation | null;
};

export type MetricsTimeWindows = Partial<Record<TimeWindow, MetricsWindowSeries>>;

const fiveMinutesMs = 5 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;
const timeWindows = ["1h", "24h", "7d", "30d", "all"] as const satisfies readonly TimeWindow[];

export function buildMetricsTimeWindows(
  records: readonly CodexJsonlRecord[],
  nowMs = Date.now(),
): MetricsTimeWindows {
  const timedRecords = toTimedRecords(records);
  const windows: MetricsTimeWindows = {};

  for (const window of timeWindows) {
    windows[window] = buildMetricsWindow(window, records, timedRecords, nowMs);
  }

  return windows;
}

function buildMetricsWindow(
  window: TimeWindow,
  records: readonly CodexJsonlRecord[],
  timedRecords: readonly TimedRecord[],
  nowMs: number,
): MetricsWindowSeries {
  const range = getWindowRange(window, timedRecords, nowMs);
  const buckets = Array.from({ length: range.bucketCount }, (_, index) => {
    const bucketStart = range.startMs + index * range.bucketSizeMs;
    const bucketEnd = bucketStart + range.bucketSizeMs;
    const bucketRecords = recordsInRange(timedRecords, bucketStart, bucketEnd);

    return {
      timestamp: new Date(bucketStart).toISOString(),
      label: formatBucketLabel(bucketStart, window),
      metrics: aggregateCodexMetrics(bucketRecords, { recentSessionLimit: 50 }),
    };
  });

  const currentRecords =
    window === "all" ? records : recordsInRange(timedRecords, range.startMs, range.endMs);
  const previousRecords =
    window === "all"
      ? null
      : recordsInRange(timedRecords, range.startMs - range.durationMs, range.startMs);

  return {
    window,
    buckets,
    current: aggregateCodexMetrics(currentRecords, { recentSessionLimit: 50 }),
    previous: previousRecords
      ? aggregateCodexMetrics(previousRecords, { recentSessionLimit: 50 })
      : null,
  };
}

function getWindowRange(window: TimeWindow, timedRecords: readonly TimedRecord[], nowMs: number) {
  const bucketSizeMs = getBucketSize(window);

  if (window === "all") {
    const firstTimestamp = timedRecords[0]?.timestampMs ?? nowMs;
    const startMs = alignDown(firstTimestamp, dayMs);
    const endMs = alignDown(nowMs, dayMs) + dayMs;
    const bucketCount = Math.max(1, Math.ceil((endMs - startMs) / bucketSizeMs));

    return {
      startMs,
      endMs,
      bucketSizeMs,
      bucketCount,
      durationMs: endMs - startMs,
    };
  }

  const bucketCount = getBucketCount(window);
  const currentBucketStart = alignDown(nowMs, bucketSizeMs);
  const startMs = currentBucketStart - (bucketCount - 1) * bucketSizeMs;
  const endMs = currentBucketStart + bucketSizeMs;

  return {
    startMs,
    endMs,
    bucketSizeMs,
    bucketCount,
    durationMs: endMs - startMs,
  };
}

function toTimedRecords(records: readonly CodexJsonlRecord[]): TimedRecord[] {
  return records
    .map((record) => {
      const timestampMs = parseTimestampMs(record.source.timestamp);
      return timestampMs === null ? null : { record, timestampMs };
    })
    .filter((record): record is TimedRecord => record !== null)
    .sort((left, right) => left.timestampMs - right.timestampMs);
}

function recordsInRange(
  timedRecords: readonly TimedRecord[],
  startMs: number,
  endMs: number,
): CodexJsonlRecord[] {
  return timedRecords
    .filter((record) => record.timestampMs >= startMs && record.timestampMs < endMs)
    .map((record) => record.record);
}

function getBucketSize(window: TimeWindow): number {
  if (window === "1h") return fiveMinutesMs;
  if (window === "24h") return hourMs;
  return dayMs;
}

function getBucketCount(window: TimeWindow): number {
  if (window === "1h") return 12;
  if (window === "24h") return 24;
  if (window === "7d") return 7;
  if (window === "30d") return 30;
  return 1;
}

function alignDown(timestampMs: number, bucketSizeMs: number): number {
  return Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs;
}

function parseTimestampMs(value: string | null) {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}
