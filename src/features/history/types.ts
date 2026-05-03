import type { CodexMetricsAggregation } from "../codex-sessions";

export type MetricsSnapshot = {
  generatedAt: string; // ISO timestamp
  metrics: CodexMetricsAggregation;
};

export type HistoryStorage = {
  schemaVersion: 1;
  snapshots: MetricsSnapshot[];
};

export type TimeWindow = "1h" | "24h" | "7d" | "30d" | "all";

export type BucketedMetrics = {
  timestamp: number; // ms
  label: string; // display label e.g. "14:00" or "May 3"
  metrics: CodexMetricsAggregation;
};

export type AggregatedWindow = {
  window: TimeWindow;
  buckets: BucketedMetrics[];
  latest: CodexMetricsAggregation | null;
  previous: CodexMetricsAggregation | null; // for delta
};
