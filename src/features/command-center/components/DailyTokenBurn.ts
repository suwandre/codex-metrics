import type { BurnBar } from "../types";
import { classNames, escapeHtml, percentage } from "./rendering";

type DailyTokenBurnProps = {
  burnBars: BurnBar[];
};

export function renderDailyTokenBurn({ burnBars }: DailyTokenBurnProps): string {
  if (burnBars.length === 0) {
    return `
      <article class="card panel">
        <div class="panel-head">
          <h2>Daily token burn</h2>
          <span class="source">Session token events</span>
        </div>
        <div class="empty-state">No token events found in local Codex sessions.</div>
      </article>
    `;
  }

  const yAxisLabels = toYAxisLabels(burnBars);

  return `
    <article class="card panel">
      <div class="panel-head">
        <h2>Daily token burn</h2>
        <span class="source">Session token events</span>
      </div>
      <div class="chart" aria-label="Daily token chart">
        <div class="y-axis">${yAxisLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>
        ${burnBars.map(renderBurnBar).join("")}
      </div>
    </article>
  `;
}

function renderBurnBar(bar: BurnBar): string {
  const height = bar.totalTokens > 0 ? Math.max(3, percentage(bar.height)) : 0;

  return `
    <div class="bar-wrap" title="${escapeHtml(`${bar.day}: ${formatCompactNumber(bar.totalTokens)} tokens`)}">
      <div
        class="${classNames("bar", bar.tone === "output" && "output")}"
        style="height: ${height}%"
        aria-label="${escapeHtml(`${bar.day}: ${formatCompactNumber(bar.totalTokens)} tokens`)}"
      ></div>
      <div class="bar-label">${escapeHtml(bar.day)}</div>
    </div>
  `;
}

function toYAxisLabels(burnBars: BurnBar[]) {
  const maxTokens = Math.max(...burnBars.map((bar) => bar.totalTokens), 0);
  const top = roundUpScale(maxTokens);

  return [
    formatCompactNumber(top),
    formatCompactNumber(top * (2 / 3)),
    formatCompactNumber(top / 3),
    "0",
  ];
}

function roundUpScale(value: number) {
  if (value <= 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return rounded * magnitude;
}

function formatCompactNumber(value: number) {
  const rounded = Math.round(value);
  const absoluteValue = Math.abs(rounded);

  if (absoluteValue >= 1_000_000) {
    return `${trimDecimal(rounded / 1_000_000)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${trimDecimal(rounded / 1_000)}k`;
  }

  return String(rounded);
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
