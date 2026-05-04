import type { LimitWindowStatus, SessionStatus } from "../types";

const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character] ?? character);
}

export function classNames(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function percentage(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function formatCompactNumber(value: number): string {
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

export function sparklineSvg(
  points: Array<number | null>,
  color: string,
  width = 120,
  height = 28,
  timestamps: string[] = [],
  metricValue: string = "",
  pointValues: string[] = [],
): string {
  if (points.length === 0) {
    return `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="1.5" points="0,${height / 2} ${width},${height / 2}"/></svg>`;
  }
  const validPoints = points.filter((point): point is number => point !== null);
  if (validPoints.length === 0) {
    return `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="1.5" points="0,${height / 2} ${width},${height / 2}" opacity="0.35"/></svg>`;
  }

  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;
  const step = width / (points.length - 1 || 1);

  const coords = points.map((p, i) => {
    if (p === null) return null;

    const x = Math.round(i * step);
    const y = Math.round(height - ((p - min) / range) * (height - 4) - 2);
    return `${x},${y}`;
  });

  const pointObjs = points.map((p, i) => {
    if (p === null) return null;

    const x = Math.round(i * step);
    const y = Math.round(height - ((p - min) / range) * (height - 4) - 2);
    return { x, y };
  });

  const lineSegments = toLineSegments(coords);

  const hitWidth = width / points.length;
  const hitRects = points
    .map((_, i) => {
      const x = Math.round(i * hitWidth);
      return `<rect data-idx="${i}" x="${x}" y="0" width="${hitWidth}" height="${height}" fill="transparent" cursor="crosshair" />`;
    })
    .join("");

  return `
    <div class="kpi-sparkline" data-points="${escapeHtml(JSON.stringify(pointObjs))}" data-timestamps="${escapeHtml(JSON.stringify(timestamps))}" data-value="${escapeHtml(metricValue)}" data-point-values="${escapeHtml(JSON.stringify(pointValues))}" data-color="${escapeHtml(color)}">
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${lineSegments
          .map(
            (segment) =>
              `<polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="1.5" points="${segment.join(" ")}"/>`,
          )
          .join("")}
        <line class="sparkline-guide" x1="0" y1="0" x2="0" y2="${height}" stroke="var(--text-secondary)" stroke-dasharray="2,2" opacity="0" />
        <circle class="sparkline-dot" cx="0" cy="0" r="3" fill="${escapeHtml(color)}" opacity="0" />
        ${hitRects}
      </svg>
      <div class="sparkline-tooltip">
        <div class="sparkline-tooltip-value">${escapeHtml(metricValue)}</div>
        <div class="sparkline-tooltip-time"></div>
      </div>
    </div>
  `;
}

function toLineSegments(coords: Array<string | null>): string[][] {
  const segments: string[][] = [];
  let current: string[] = [];

  for (const coord of coords) {
    if (coord !== null) {
      current.push(coord);
      continue;
    }

    if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

export function statusBadge(status: SessionStatus | LimitWindowStatus): string {
  const map: Record<string, { cls: string; text: string }> = {
    ok: { cls: "ok", text: "ok" },
    live: { cls: "ok", text: "ok" },
    retry: { cls: "retry", text: "retry" },
    unknown: { cls: "unknown", text: "unknown" },
    watch: { cls: "warn", text: "watch" },
  };
  const mapped = map[status] ?? { cls: "unknown", text: status };
  return `<span class="status ${mapped.cls}">${mapped.text}</span>`;
}
