import type { KpiMetric } from "../types";
import { escapeHtml, sparklineSvg } from "./rendering";

const colorVar: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  accent: "var(--accent)",
  danger: "var(--danger)",
  info: "var(--info)",
  default: "var(--text-secondary)",
};

const deltaArrow: Record<string, string> = {
  up: "&#9650;",
  down: "&#9660;",
  neutral: "&#8212;",
};

export function renderSystemPulse(kpis: KpiMetric[], window: string): string {
  const buttons = ["1h", "24h", "7d", "30d", "all"].map(
    (w) =>
      `<button class="window-btn${w === window ? " active" : ""}" data-window="${w}">${w}</button>`,
  );

  return `
    <section class="section" id="pulse">
      <div class="section-header" data-toggle="section">
        <div class="section-title">System Pulse</div>
        <div class="section-badge">${kpis.length}</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="window-toggle">${buttons.join("")}</div>
        <div class="kpi-grid">
          ${kpis.map((kpi) => renderKpiTile(kpi)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderKpiTile(kpi: KpiMetric): string {
  const colorClass = kpi.color === "default" ? "" : ` text-${kpi.color}`;
  const deltaClass = kpi.deltaDirection;
  const unitHtml = kpi.unit
    ? `<span style="font-size:14px;color:var(--text-secondary)">${escapeHtml(kpi.unit)}</span>`
    : "";
  const smallUnit =
    kpi.label === "Throughput"
      ? `<span style="font-size:11px;color:var(--text-secondary)">/min</span>`
      : "";

  return `
    <div class="kpi-tile">
      <div class="kpi-big${colorClass}">${escapeHtml(kpi.value)}${unitHtml}${smallUnit}</div>
      <div class="kpi-label">${escapeHtml(kpi.label)}</div>
      <div class="kpi-delta ${deltaClass}">${deltaArrow[kpi.deltaDirection]} ${escapeHtml(kpi.delta)}</div>
      ${sparklineSvg(kpi.sparkline, colorVar[kpi.color] ?? "var(--text-secondary)", 120, 28, kpi.timestamps ?? [], `${kpi.value}${kpi.unit ?? ""}`)}
    </div>
  `;
}
