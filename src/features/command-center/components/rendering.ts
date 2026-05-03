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
  points: number[],
  color: string,
  width = 120,
  height = 28,
  timestamps: string[] = [],
  metricValue: string = "",
): string {
  if (points.length === 0) {
    return `<svg width="100%" height="${height + 12}" viewBox="0 0 ${width} ${height + 12}" preserveAspectRatio="none"><polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="1.5" points="0,${height / 2} ${width},${height / 2}"/></svg>`;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1 || 1);

  const coords = points.map((p, i) => {
    const x = Math.round(i * step);
    const y = Math.round(height - ((p - min) / range) * (height - 4) - 2);
    return `${x},${y}`;
  });

  const pointObjs = points.map((p, i) => {
    const x = Math.round(i * step);
    const y = Math.round(height - ((p - min) / range) * (height - 4) - 2);
    return { x, y };
  });

  const hitWidth = width / points.length;
  const hitRects = points
    .map((_, i) => {
      const x = Math.round(i * hitWidth);
      return `<rect data-idx="${i}" x="${x}" y="0" width="${hitWidth}" height="${height}" fill="transparent" cursor="crosshair" />`;
    })
    .join("");

  const xLabels = [
    { text: "24h", idx: 0 },
    { text: "16h", idx: 2 },
    { text: "8h", idx: 4 },
    { text: "now", idx: 6 },
  ];
  const labelEls = xLabels
    .map((l) => {
      const x = Math.round(l.idx * step);
      return `<text x="${x}" y="${height + 10}" font-size="9" fill="var(--text-secondary)" text-anchor="middle">${l.text}</text>`;
    })
    .join("");

  return `
    <div class="kpi-sparkline" data-points="${escapeHtml(JSON.stringify(pointObjs))}" data-timestamps="${escapeHtml(JSON.stringify(timestamps))}" data-value="${escapeHtml(metricValue)}" data-color="${escapeHtml(color)}">
      <svg width="100%" height="${height + 12}" viewBox="0 0 ${width} ${height + 12}" preserveAspectRatio="none">
        <polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="1.5" points="${coords.join(" ")}"/>
        <line class="sparkline-guide" x1="0" y1="0" x2="0" y2="${height}" stroke="var(--text-secondary)" stroke-dasharray="2,2" opacity="0" />
        <circle class="sparkline-dot" cx="0" cy="0" r="3" fill="${escapeHtml(color)}" opacity="0" />
        ${hitRects}
        ${labelEls}
      </svg>
      <div class="sparkline-tooltip">
        <div class="sparkline-tooltip-value">${escapeHtml(metricValue)}</div>
        <div class="sparkline-tooltip-time"></div>
      </div>
    </div>
  `;
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
