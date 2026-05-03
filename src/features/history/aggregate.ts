import type { AggregatedWindow, BucketedMetrics, HistoryStorage, TimeWindow } from "./types";

const fiveMinutesMs = 5 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

export function aggregateToWindow(window: TimeWindow, history: HistoryStorage): AggregatedWindow {
  const snapshots = history.snapshots;
  if (snapshots.length === 0) {
    return { window, buckets: [], latest: null, previous: null };
  }

  const now = Date.now();
  const bucketSize = getBucketSize(window);
  const startMs = getWindowStart(now, window, snapshots);

  const bucketCount = Math.max(1, Math.ceil((now - startMs) / bucketSize));
  const buckets: BucketedMetrics[] = [];

  let lastKnownMetrics = snapshots[0].metrics;

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = startMs + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;

    const snapsInBucket = snapshots.filter((s) => {
      const t = new Date(s.generatedAt).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    if (snapsInBucket.length > 0) {
      lastKnownMetrics = snapsInBucket[snapsInBucket.length - 1].metrics;
    }

    buckets.push({
      timestamp: bucketStart,
      label: formatBucketLabel(bucketStart, window),
      metrics: lastKnownMetrics,
    });
  }

  const latest = buckets.at(-1)?.metrics ?? null;
  const previous = buckets.length >= 2 ? buckets[buckets.length - 2].metrics : null;

  return { window, buckets, latest, previous };
}

export function getBucketStart(timestampMs: number, window: TimeWindow): number {
  const size = getBucketSize(window);
  return Math.floor(timestampMs / size) * size;
}

export function formatBucketLabel(timestampMs: number, window: TimeWindow): string {
  const date = new Date(timestampMs);

  if (window === "1h" || window === "24h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (window === "7d") {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // 30d and all
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getBucketSize(window: TimeWindow): number {
  if (window === "1h") return fiveMinutesMs;
  return dayMs;
}

function getWindowStart(
  now: number,
  window: TimeWindow,
  snapshots: HistoryStorage["snapshots"],
): number {
  switch (window) {
    case "1h":
      return now - hourMs;
    case "24h":
      return now - 24 * hourMs;
    case "7d":
      return now - 7 * dayMs;
    case "30d":
      return now - 30 * dayMs;
    case "all": {
      const first = snapshots[0];
      if (!first) return now - dayMs;
      return new Date(first.generatedAt).getTime();
    }
    default:
      return now - dayMs;
  }
}
