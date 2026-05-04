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
  const dayPart = date.toLocaleDateString([], { day: "numeric", month: "short" });

  if (window === "1h" || window === "24h") {
    const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dayPart} ${timePart}`;
  }

  if (window === "7d") {
    const weekday = date.toLocaleDateString([], { weekday: "short" });
    return `${weekday} ${dayPart}`;
  }

  // 30d and all
  return dayPart;
}

function getBucketSize(window: TimeWindow): number {
  if (window === "1h") return fiveMinutesMs;
  if (window === "24h") return hourMs;
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
