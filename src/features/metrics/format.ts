export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "n/a";

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

export function formatSeconds(value: number | null): string {
  if (value === null) return "n/a";
  if (value < 60) return `${value.toFixed(1)}s`;

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${seconds}s`;
}

export function formatResetTime(value: string | null): string {
  if (!value) return "Reset time unavailable";

  const date = new Date(value);
  return `resets ${date.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function getRepoLabel(cwd: string | null): string {
  if (!cwd) return "unknown workspace";

  const normalized = cwd.replaceAll("\\", "/");
  return normalized.split("/").filter(Boolean).at(-1) ?? cwd;
}
