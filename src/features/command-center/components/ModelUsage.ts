import type { ModelUsage } from "../types";
import { classNames, escapeHtml, percentage } from "./rendering";

type ModelUsageProps = {
  modelUsage: ModelUsage[];
};

export function renderModelUsage({ modelUsage }: ModelUsageProps): string {
  return `
    <article id="models" class="card panel">
      <div class="panel-head">
        <h2>Model usage</h2>
        <span class="source">session meta</span>
      </div>
      <div class="model-list">
        ${modelUsage.map(renderModelUsageRow).join("")}
      </div>
    </article>
  `;
}

function renderModelUsageRow(usage: ModelUsage): string {
  const share = percentage(usage.share);

  return `
    <div class="model-row">
      <strong>${escapeHtml(usage.model)}</strong>
      <div class="track">
        <div class="${classNames("fill", usage.tone !== "green" && usage.tone)}" style="width: ${share}%"></div>
      </div>
      <span>${share}%</span>
    </div>
  `;
}
