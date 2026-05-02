import type { Metric } from "../types";
import { escapeHtml } from "./rendering";

type KpiCardsProps = {
  metrics: Metric[];
};

export function renderKpiCards({ metrics }: KpiCardsProps): string {
  return `
    <section id="overview" class="grid metrics" aria-label="Key metrics">
      ${metrics.map(renderMetricCard).join("")}
    </section>
  `;
}

function renderMetricCard(metric: Metric): string {
  return `
    <article class="card metric">
      <div class="label">
        <span>${escapeHtml(metric.label)}</span>
        <span>${escapeHtml(metric.source)}</span>
      </div>
      <div class="value">${escapeHtml(metric.value)}</div>
      <div class="delta">${escapeHtml(metric.delta)}</div>
    </article>
  `;
}
