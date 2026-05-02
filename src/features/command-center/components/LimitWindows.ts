import type { LimitWindow } from "../types";
import { classNames, escapeHtml, percentage } from "./rendering";

type LimitWindowsProps = {
  limitWindows: LimitWindow[];
};

export function renderLimitWindows({ limitWindows }: LimitWindowsProps): string {
  return `
    <article id="limits" class="card panel">
      <div class="panel-head">
        <h2>Limit windows</h2>
        <span class="source">Codex rate limits</span>
      </div>
      <div class="limits">
        ${
          limitWindows.length > 0
            ? limitWindows.map(renderLimitWindow).join("")
            : '<div class="empty-state">No rate-limit events found in local sessions.</div>'
        }
      </div>
    </article>
  `;
}

function renderLimitWindow(window: LimitWindow): string {
  const progress = percentage(window.progress);

  return `
    <div class="limit-row">
      <div class="ring" style="--progress: ${progress}">
        <span>${progress}%</span>
      </div>
      <div>
        <div class="limit-title">${escapeHtml(window.title)}</div>
        <p class="limit-copy">${escapeHtml(window.copy)}</p>
      </div>
      <span class="${classNames("badge", window.status === "watch" && "warn")}">
        ${escapeHtml(window.status)}
      </span>
    </div>
  `;
}
