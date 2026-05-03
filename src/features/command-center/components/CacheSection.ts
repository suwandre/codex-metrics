import type { CommandCenterData } from "../types";
import { escapeHtml } from "./rendering";

export function renderCacheSection(data: CommandCenterData["cache"]): string {
  return `
    <section class="section" id="s4">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Cache Efficiency</div>
        <div class="section-badge">4</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-row col-3 mb-12">
          <div class="card" style="text-align:center">
            <div class="chart-title">Hit Ratio</div>
            <svg width="140" height="90" viewBox="0 0 140 90">
              <path d="M 20 80 A 50 50 0 0 1 120 80" fill="none" stroke="var(--chart-grid)" stroke-width="10" stroke-linecap="round"/>
              <path d="M 20 80 A 50 50 0 0 1 ${20 + 100 * data.hitRatio / 100} ${80 - 50 * Math.sin(Math.PI * data.hitRatio / 100)}" fill="none" stroke="var(--success)" stroke-width="10" stroke-linecap="round"/>
              <text x="70" y="72" text-anchor="middle" fill="var(--success)" font-size="22" font-weight="700">${data.hitRatio}%</text>
            </svg>
          </div>
          <div class="card">
            <div class="card-label">Tokens Saved</div>
            <div class="card-value text-success" style="font-size:28px;margin-top:8px">${escapeHtml(data.tokensSaved)}</div>
          </div>
          <div class="card">
            <div class="card-label">Estimated Savings</div>
            <div class="card-value text-success" style="font-size:28px;margin-top:8px">${escapeHtml(data.savings)}</div>
            <div class="card-sub">based on current rates</div>
          </div>
        </div>
        <div class="chart-row col-2">
          <div class="chart-container">
            <div class="chart-title">Uncached Token Trend (24h)</div>
            <svg width="100%" height="120" viewBox="0 0 300 120">
              <line x1="30" y1="100" x2="280" y2="100" stroke="var(--chart-grid)" stroke-width="1"/>
              <line x1="30" y1="10" x2="30" y2="100" stroke="var(--chart-grid)" stroke-width="1"/>
              <text x="10" y="18" fill="var(--text-secondary)" font-size="8">2M</text>
              <text x="10" y="100" fill="var(--text-secondary)" font-size="8">0</text>
              <polyline fill="none" stroke="var(--danger)" stroke-width="1.5" points="${data.uncachedTrend.map((v, i) => `${30 + (i / (data.uncachedTrend.length - 1 || 1)) * 250},${100 - (v / 2_000_000) * 90}`).join(" ")}"/>
              <circle cx="${30 + ((data.uncachedTrend.length - 1) / (data.uncachedTrend.length - 1 || 1)) * 250}" cy="${100 - (data.uncachedTrend[data.uncachedTrend.length - 1] / 2_000_000) * 90}" r="3" fill="var(--danger)"/>
              <text x="30" y="113" fill="var(--text-secondary)" font-size="8">00:00</text>
              <text x="155" y="113" fill="var(--text-secondary)" font-size="8">12:00</text>
              <text x="270" y="113" fill="var(--text-secondary)" font-size="8">now</text>
            </svg>
          </div>
          <div class="chart-container">
            <div class="chart-title">Hit Ratio by Model</div>
            <div style="margin-top:12px">
              ${data.byModel
                .map(
                  (m) => `
                <div class="hbar-row">
                  <span class="hbar-label">${escapeHtml(m.model)}</span>
                  <div class="hbar-track"><div class="hbar-fill" style="width:${m.ratio}%;background:var(--success)">${m.ratio}%</div></div>
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
