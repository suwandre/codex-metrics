import type { BurnBar } from "../types";
import { classNames, escapeHtml, percentage } from "./rendering";

type DailyTokenBurnProps = {
  burnBars: BurnBar[];
};

export function renderDailyTokenBurn({ burnBars }: DailyTokenBurnProps): string {
  return `
    <article class="card panel">
      <div class="panel-head">
        <h2>Daily token burn</h2>
        <span class="source">Input / cached / output</span>
      </div>
      <div class="chart" aria-label="Daily token chart">
        <div class="y-axis"><span>3.0M</span><span>2.0M</span><span>1.0M</span><span>0</span></div>
        ${burnBars.map(renderBurnBar).join("")}
      </div>
    </article>
  `;
}

function renderBurnBar(bar: BurnBar): string {
  return `
    <div class="bar-wrap">
      <div class="${classNames("bar", bar.tone === "output" && "output")}" style="height: ${percentage(bar.height)}%"></div>
      <div class="bar-label">${escapeHtml(bar.day)}</div>
    </div>
  `;
}
