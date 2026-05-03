import type { CommandCenterData } from "../types";
import { escapeHtml, statusBadge } from "./rendering";

export function renderSessionStreamSection(data: CommandCenterData["sessionStream"]): string {
  return `
    <section class="section" id="s3">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Session Stream</div>
        <div class="section-badge">5</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-container mb-12">
          <div class="chart-title">Active Sessions</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Session ID</th><th>Repo</th><th>Model</th><th>Turns</th>
                <th>Tokens</th><th>Latency</th><th>Success</th><th>Age</th>
              </tr>
            </thead>
            <tbody>
              ${data.rows
                .map(
                  (row) => `
                <tr>
                  <td class="font-mono">${escapeHtml(row.id)}</td>
                  <td class="text-muted">${escapeHtml(row.repo)}</td>
                  <td>${escapeHtml(row.model)}</td>
                  <td>${row.turns}</td>
                  <td>${escapeHtml(row.tokens)}</td>
                  <td>${escapeHtml(row.latency)}</td>
                  <td>${statusBadge(row.success)}</td>
                  <td>${escapeHtml(row.age)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="chart-row col-2">
          <!-- Turns histogram -->
          <div class="chart-container">
            <div class="chart-title">Turns Per Session Distribution</div>
            <svg width="100%" height="100" viewBox="0 0 300 100">
              <line x1="30" y1="80" x2="280" y2="80" stroke="var(--chart-grid)" stroke-width="1"/>
              ${data.turnHistogram
                .map((bar, i) => {
                  const x = 40 + i * 46;
                  const maxV = Math.max(...data.turnHistogram.map((b) => b.value), 1);
                  const h = (bar.value / maxV) * 60;
                  return `
                    <rect x="${x}" y="${80 - h}" width="36" height="${h}" rx="2" fill="var(--accent)" opacity="0.8">
                      <title>${escapeHtml(bar.label)}: ${bar.value} sessions</title>
                    </rect>
                    <text x="${x + 18}" y="95" fill="var(--text-secondary)" font-size="9" text-anchor="middle">${escapeHtml(bar.label)}</text>
                  `;
                })
                .join("")}
            </svg>
          </div>
          <!-- Scatter -->
          <div class="chart-container">
            <div class="chart-title">Tokens Per Turn vs Output/Input Ratio</div>
            <svg width="100%" height="100" viewBox="0 0 300 100">
              <line x1="30" y1="80" x2="280" y2="80" stroke="var(--chart-grid)" stroke-width="1"/>
              <line x1="30" y1="10" x2="30" y2="80" stroke="var(--chart-grid)" stroke-width="1"/>
              <text x="10" y="18" fill="var(--text-secondary)" font-size="8">1.0</text>
              <text x="10" y="80" fill="var(--text-secondary)" font-size="8">0</text>
              <text x="280" y="93" fill="var(--text-secondary)" font-size="8">tokens/turn</text>
              ${data.scatter
                .map(
                  (pt) => `
                <circle cx="${30 + pt.x * 250}" cy="${80 - pt.y * 70}" r="4" fill="var(--accent)" opacity="0.8"/>
              `,
                )
                .join("")}
            </svg>
          </div>
        </div>
        <div class="chart-row col-2 mt-12">
          <div class="chart-container">
            <div class="chart-title">Top 5 Longest Sessions</div>
            <div style="font-size:12px">
              ${data.longest
                .map(
                  (item, i, arr) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;${i < arr.length - 1 ? "border-bottom:1px solid var(--border)" : ""}">
                  <span>${escapeHtml(item.name)}</span>
                  <span class="text-muted">${escapeHtml(item.age)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          <div class="chart-container">
            <div class="chart-title">Top 5 Biggest Sessions</div>
            <div style="font-size:12px">
              ${data.biggest
                .map(
                  (item, i, arr) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;${i < arr.length - 1 ? "border-bottom:1px solid var(--border)" : ""}">
                  <span>${escapeHtml(item.name)}</span>
                  <span class="font-bold">${escapeHtml(item.tokens)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
