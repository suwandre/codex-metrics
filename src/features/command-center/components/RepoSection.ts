import type { CommandCenterData } from "../types";
import { escapeHtml, formatCompactNumber } from "./rendering";

export function renderRepoSection(data: CommandCenterData["repos"]): string {
  return `
    <section class="section" id="s7">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Repo / Workspace Map</div>
        <div class="section-badge">4</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-container mb-12">
          <div class="chart-title">Token Distribution by Repo</div>
          <div style="display:flex;gap:3px;height:60px;align-items:flex-end">
            ${data.distribution
              .map(
                (r, i) => {
                  const colors = ["var(--accent)", "var(--info)", "var(--success)", "var(--warning)"];
                  return `
                <div style="flex:${r.tokens};background:${colors[i % colors.length]};border-radius:3px 3px 0 0;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:4px;min-width:40px">
                  <span style="font-size:11px;font-weight:700">${escapeHtml(r.name)}</span>
                  <span style="font-size:10px;color:var(--text-secondary)">${formatCompactNumber(r.tokens)}</span>
                </div>
              `;
                },
              )
              .join("")}
          </div>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Failures by Repo (24h)</div>
          <div style="display:flex;gap:3px;height:32px;align-items:flex-end">
            ${data.failures
              .map(
                (f, i) => {
                  const opacity = 1 - i * 0.2;
                  return `
                <div style="width:${f.width}%;background:rgba(255,107,107,${opacity});border-radius:3px 3px 0 0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;padding:4px">
                  ${escapeHtml(f.name)} — ${f.count}
                </div>
              `;
                },
              )
              .join("")}
          </div>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Latency by Repo</div>
          <table class="data-table">
            <thead><tr><th>Repo</th><th>Avg</th><th>p95</th><th>Count</th></tr></thead>
            <tbody>
              ${data.latency.length > 0
                ? data.latency
                    .map(
                      (r) => `
                <tr>
                  <td>${escapeHtml(r.name)}</td>
                  <td>${escapeHtml(r.avgLatency)}</td>
                  <td class="${r.p95Latency.includes("s") && parseFloat(r.p95Latency) > 12 ? "text-warning" : ""}">${escapeHtml(r.p95Latency)}</td>
                  <td>${r.count}</td>
                </tr>
              `,
                    )
                    .join("")
                : `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No repo data</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="chart-row col-2">
          <div class="card">
            <div class="card-label">Most Expensive Repo</div>
            <div class="card-value text-accent" style="margin-top:6px">${escapeHtml(data.mostExpensiveRepo.name)}</div>
            <div class="card-sub">${escapeHtml(data.mostExpensiveRepo.tokens)} tokens</div>
          </div>
          <div class="card">
            <div class="card-label">Most Expensive Session</div>
            <div class="card-value text-accent" style="margin-top:6px">${escapeHtml(data.mostExpensiveSession.name)}</div>
            <div class="card-sub">${escapeHtml(data.mostExpensiveSession.tokens)} tokens</div>
          </div>
        </div>
      </div>
    </section>
  `;
}
