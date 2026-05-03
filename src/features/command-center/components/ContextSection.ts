import type { CommandCenterData } from "../types";
import { escapeHtml } from "./rendering";

export function renderContextSection(data: CommandCenterData["context"]): string {
  return `
    <section class="section" id="s5">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Context Pressure</div>
        <div class="section-badge">3</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-row col-2 mb-12">
          <div class="card" style="text-align:center">
            <div class="chart-title">Avg Context Usage</div>
            <svg width="160" height="90" viewBox="0 0 160 90">
              <path d="M 25 80 A 55 55 0 0 1 135 80" fill="none" stroke="var(--chart-grid)" stroke-width="12" stroke-linecap="round"/>
              <path d="M 25 80 A 55 55 0 0 1 ${25 + 110 * data.avgUsage / 100} ${80 - 55 * Math.sin(Math.PI * data.avgUsage / 100)}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"/>
              <text x="80" y="72" text-anchor="middle" fill="var(--accent)" font-size="24" font-weight="700">${data.avgUsage}%</text>
            </svg>
          </div>
          <div class="card" style="text-align:center">
            <div class="chart-title">Max Context Usage</div>
            <svg width="160" height="90" viewBox="0 0 160 90">
              <path d="M 25 80 A 55 55 0 0 1 135 80" fill="none" stroke="var(--chart-grid)" stroke-width="12" stroke-linecap="round"/>
              <path d="M 25 80 A 55 55 0 0 1 ${25 + 110 * data.maxUsage / 100} ${80 - 55 * Math.sin(Math.PI * data.maxUsage / 100)}" fill="none" stroke="var(--danger)" stroke-width="12" stroke-linecap="round"/>
              <text x="80" y="72" text-anchor="middle" fill="var(--danger)" font-size="24" font-weight="700">${data.maxUsage}%</text>
            </svg>
          </div>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Turns Above Context Thresholds</div>
          ${data.thresholds
            .map(
              (t) => `
            <div class="hbar-row">
              <span class="hbar-label" style="width:80px">${escapeHtml(t.label)}: ${t.count}</span>
              <div class="hbar-track">
                <div class="hbar-fill" style="width:${t.width}%;background:${t.width > 40 ? "var(--danger)" : "var(--warning)"}">${t.count} turns</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Compaction Candidates</div>
          <table class="data-table">
            <thead><tr><th>Session</th><th>Current %</th><th>Turns to Limit</th></tr></thead>
            <tbody>
              ${data.candidates
                .map(
                  (c) => `
                <tr>
                  <td class="font-mono">${escapeHtml(c.session)}</td>
                  <td><span class="${c.current > 85 ? "text-danger" : "text-warning"} font-bold">${c.current}%</span></td>
                  <td>${escapeHtml(c.turnsLeft)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="chart-container">
          <div class="chart-title">Context Growth Per Turn (avg, last 50 sessions)</div>
          <svg width="100%" height="120" viewBox="0 0 600 120">
            <line x1="40" y1="100" x2="580" y2="100" stroke="var(--chart-grid)" stroke-width="1"/>
            <line x1="40" y1="10" x2="40" y2="100" stroke="var(--chart-grid)" stroke-width="1"/>
            <text x="10" y="15" fill="var(--text-secondary)" font-size="8">90%</text>
            <text x="10" y="100" fill="var(--text-secondary)" font-size="8">0%</text>
            <line x1="40" y1="20" x2="580" y2="20" stroke="var(--danger)" stroke-width="0.5" stroke-dasharray="4" opacity="0.5"/>
            <text x="585" y="23" fill="var(--danger)" font-size="8">limit</text>
            <polyline fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" points="${data.growth.map((v, i) => `${40 + (i / (data.growth.length - 1 || 1)) * 540},${100 - (v / 100) * 80}`).join(" ")}"/>
          </svg>
        </div>
      </div>
    </section>
  `;
}
