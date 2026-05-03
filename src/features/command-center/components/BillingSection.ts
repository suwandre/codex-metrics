import type { CommandCenterData } from "../types";
import { escapeHtml } from "./rendering";

export function renderBillingSection(data: CommandCenterData["billing"]): string {
  const maxCost = Math.max(...data.byDay.map((d) => d.amount), 1);

  return `
    <section class="section" id="s8">
      <div class="section-header" data-toggle="section">
        <div class="section-title">OpenAI API Billing</div>
        <div class="section-badge">4</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-container mb-12">
          <div class="chart-title">Cost by Day (last 14 days)</div>
          <svg width="100%" height="130" viewBox="0 0 600 130">
            <line x1="40" y1="110" x2="580" y2="110" stroke="var(--chart-grid)" stroke-width="1"/>
            <line x1="40" y1="10" x2="40" y2="110" stroke="var(--chart-grid)" stroke-width="1"/>
            <text x="10" y="18" fill="var(--text-secondary)" font-size="8">$${Math.ceil(maxCost)}</text>
            <text x="10" y="110" fill="var(--text-secondary)" font-size="8">$0</text>
            <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${data.byDay.map((d, i) => `${40 + (i / (data.byDay.length - 1 || 1)) * 540},${110 - (d.amount / maxCost) * 100}`).join(" ")}"/>
            <circle cx="${40 + ((data.byDay.length - 1) / (data.byDay.length - 1 || 1)) * 540}" cy="${110 - (data.byDay[data.byDay.length - 1].amount / maxCost) * 100}" r="3" fill="var(--accent)"/>
            <text x="40" y="123" fill="var(--text-secondary)" font-size="8">${escapeHtml(data.byDay[0]?.day ?? "")}</text>
            <text x="200" y="123" fill="var(--text-secondary)" font-size="8">${escapeHtml(data.byDay[Math.floor((data.byDay.length - 1) / 2)]?.day ?? "")}</text>
            <text x="530" y="123" fill="var(--text-secondary)" font-size="8">${escapeHtml(data.byDay[data.byDay.length - 1]?.day ?? "")}</text>
          </svg>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Cost Breakdown</div>
          <div class="toggle-tabs">
            <button class="toggle-tab active" data-tab="project">By Project</button>
            <button class="toggle-tab" data-tab="key">By API Key</button>
          </div>
          <div class="stacked-bar">
            ${data.breakdown
              .map((b, i) => {
                const colors = ["var(--accent)", "var(--info)", "var(--success)", "var(--warning)"];
                return `
                <div style="width:${b.value}%;background:${colors[i % colors.length]}">${escapeHtml(b.label)} — ${escapeHtml(b.cost)}</div>
              `;
              })
              .join("")}
          </div>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Completions by Model</div>
          <table class="data-table">
            <thead><tr><th>Model</th><th>Project</th><th>User</th><th>Key</th><th>Tier</th><th>Tokens</th><th>Cost</th></tr></thead>
            <tbody>
              ${
                data.completions.length > 0
                  ? data.completions
                      .map(
                        (c) => `
                <tr>
                  <td>${escapeHtml(c.model)}</td>
                  <td>${escapeHtml(c.project)}</td>
                  <td>${escapeHtml(c.user)}</td>
                  <td class="font-mono">${escapeHtml(c.key)}</td>
                  <td><span class="status info">${escapeHtml(c.tier)}</span></td>
                  <td>${escapeHtml(c.tokens)}</td>
                  <td class="font-bold">${escapeHtml(c.cost)}</td>
                </tr>
              `,
                      )
                      .join("")
                  : `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">No API key configured</td></tr>`
              }
            </tbody>
          </table>
        </div>
        <div class="chart-row col-2">
          <div class="card">
            <div class="card-label">Total Requests (24h)</div>
            <div class="card-value" style="font-size:28px;margin-top:8px">${data.totalRequests.toLocaleString()}</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="chart-title">Batch vs Non-Batch</div>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" stroke-width="14"/>
              <text x="50" y="48" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="700">${data.batchShare}%</text>
              <text x="50" y="62" text-anchor="middle" fill="var(--text-secondary)" font-size="9">batch</text>
            </svg>
            <div style="font-size:11px;margin-top:4px"><span style="color:var(--accent)">&#9679;</span> non-batch ${100 - data.batchShare}%</div>
          </div>
        </div>
      </div>
    </section>
  `;
}
