import type { CommandCenterData } from "../types";
import { escapeHtml, statusBadge } from "./rendering";

export function renderRateLimitSection(data: CommandCenterData["rateLimits"]): string {
  return `
    <section class="section" id="s2">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Rate Limit Forecast</div>
        <div class="section-badge">3</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-container mb-12">
          <div class="chart-title">Rate Limit Windows</div>
          <table class="data-table">
            <thead><tr><th>Window</th><th>Used</th><th>Remaining</th><th>Reset Countdown</th><th>Status</th></tr></thead>
            <tbody>
              ${data.rows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row.window)}</td>
                  <td>${escapeHtml(row.used)}</td>
                  <td>${escapeHtml(row.remaining)}</td>
                  <td>${escapeHtml(row.countdown)}</td>
                  <td>${statusBadge(row.status)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Burn Rate — RPM vs Limit (last 1h)</div>
          <svg width="100%" height="140" viewBox="0 0 600 140">
            <line x1="40" y1="120" x2="580" y2="120" stroke="var(--chart-grid)" stroke-width="1"/>
            <line x1="40" y1="10" x2="40" y2="120" stroke="var(--chart-grid)" stroke-width="1"/>
            <line x1="40" y1="65" x2="580" y2="65" stroke="var(--danger)" stroke-width="0.7" stroke-dasharray="6,3"/>
            <text x="585" y="68" fill="var(--danger)" font-size="9">limit</text>
            <text x="10" y="18" fill="var(--text-secondary)" font-size="9">500</text>
            <text x="10" y="123" fill="var(--text-secondary)" font-size="9">0</text>
            <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${data.burnRate.map((v, i) => `${40 + (i / (data.burnRate.length - 1 || 1)) * 540},${120 - (v / 500) * 110}`).join(" ")}"/>
            <circle cx="${40 + ((data.burnRate.length - 1) / (data.burnRate.length - 1 || 1)) * 540}" cy="${120 - (data.burnRate[data.burnRate.length - 1] / 500) * 110}" r="3" fill="var(--accent)"/>
            <text x="40" y="133" fill="var(--text-secondary)" font-size="9">-60m</text>
            <text x="280" y="133" fill="var(--text-secondary)" font-size="9">-30m</text>
            <text x="558" y="133" fill="var(--text-secondary)" font-size="9">now</text>
          </svg>
        </div>
        <div class="chart-row col-2">
          <div class="card">
            <div class="card-label">Projection</div>
            <div class="projection safe mt-8">&#10003; ${escapeHtml(data.projection)}</div>
          </div>
          <div class="card">
            <div class="card-label">Safe Budget Remaining</div>
            <div style="margin-top:8px">
              <div class="progress-bar"><div class="progress-fill" style="width:${data.safeBudget}%;background:var(--success)"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
                <span class="text-success font-bold">${data.safeBudget}%</span>
                <span class="text-muted">${100 - data.safeBudget}% used</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
