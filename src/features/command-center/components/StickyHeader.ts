import { escapeHtml } from "./rendering";

export function renderStickyHeader(timestamp: string): string {
  return `
    <header class="header" id="sticky-header">
      <div class="header-left">
        <div class="header-logo"><span>Codex</span> Metrics</div>
        <div class="live-dot"></div>
        <span class="refresh-label">1s refresh</span>
      </div>
      <div class="header-center">
        <span class="alert-pill yellow hidden" id="alert-rate">&#9889; Rate limit &gt;80%</span>
        <span class="alert-pill red hidden" id="alert-ctx">&#128293; Context &gt;90%</span>
        <span class="alert-pill yellow hidden" id="alert-success">&#9888; Success &lt;85%</span>
        <span class="alert-pill blue hidden" id="alert-cache">&#128190; Cache &lt;50%</span>
      </div>
      <div class="header-right">
        <button class="btn" id="btn-export">Export CSV</button>
        <button class="btn btn-accent" id="btn-refresh">Refresh now</button>
        <span class="timestamp" id="timestamp">${escapeHtml(timestamp)}</span>
      </div>
    </header>
  `;
}
