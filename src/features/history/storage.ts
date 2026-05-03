import type { HistoryStorage, MetricsSnapshot } from "./types";

const STORAGE_KEY = "codex-metrics-history";
const MAX_SNAPSHOTS = 500;
const MAX_SNAPSHOTS_AGGRESSIVE = 200;

export function loadHistory(): HistoryStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyHistory();

    const parsed: unknown = JSON.parse(raw);
    if (!isHistoryStorage(parsed)) return emptyHistory();

    return pruneHistory(parsed);
  } catch {
    return emptyHistory();
  }
}

export function saveSnapshot(snapshot: MetricsSnapshot): void {
  const history = loadHistory();

  const alreadyExists = history.snapshots.some((s) => s.generatedAt === snapshot.generatedAt);
  if (alreadyExists) return;

  history.snapshots.push(snapshot);
  history.snapshots.sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
  );

  const pruned = pruneHistory(history);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch (e) {
    if (isQuotaError(e)) {
      const aggressive = pruneToLimit(pruned, MAX_SNAPSHOTS_AGGRESSIVE);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(aggressive));
      } catch {
        // localStorage disabled or full; silently drop
      }
    }
  }
}

export function pruneHistory(history: HistoryStorage): HistoryStorage {
  return pruneToLimit(history, MAX_SNAPSHOTS);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be disabled
  }
}

function emptyHistory(): HistoryStorage {
  return { schemaVersion: 1, snapshots: [] };
}

function pruneToLimit(history: HistoryStorage, limit: number): HistoryStorage {
  if (history.snapshots.length <= limit) return history;

  const trimmed = history.snapshots.slice(history.snapshots.length - limit);
  return { schemaVersion: 1, snapshots: trimmed };
}

function isHistoryStorage(value: unknown): value is HistoryStorage {
  const record = asRecord(value);
  if (!record) return false;
  return (
    record.schemaVersion === 1 &&
    Array.isArray(record.snapshots) &&
    record.snapshots.every(isMetricsSnapshot)
  );
}

function isMetricsSnapshot(value: unknown): value is MetricsSnapshot {
  const record = asRecord(value);
  if (!record) return false;
  return typeof record.generatedAt === "string" && isRecord(record.metrics);
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("quota") || msg.includes("exceeded") || msg.includes("storage");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
