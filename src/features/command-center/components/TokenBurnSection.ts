import type { CommandCenterData } from "../types";
import { escapeHtml, formatCompactNumber } from "./rendering";

export function renderTokenBurnSection(data: CommandCenterData["tokenBurn"]): string {
  const totalComp = data.composition.reduce((s, c) => s + c.value, 0) || 1;
  const maxDaily = Math.max(...data.dailyBurn.map((d) => d.tokens), 1);

  return `
    <section class="section" id="s1">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Token Burn &amp; Composition</div>
        <div class="section-badge">4</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <!-- Stacked bar -->
        <div class="chart-container mb-12">
          <div class="chart-title">Token Composition</div>
          <div class="stacked-bar">
            ${data.composition
              .map(
                (c) => `
              <div style="width:${((c.value / totalComp) * 100).toFixed(1)}%;background:var(${escapeHtml(c.color)})">
                ${formatCompactNumber(c.value)} ${escapeHtml(c.label)}
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        <!-- Stacked Area Chart -->
        <div class="chart-container mb-12">
          <div class="chart-title">Token Burn — 24h (stacked area, 5m buckets)</div>
          ${renderAreaChart(data.areaChart)}
        </div>
        <!-- Daily burn bar -->
        <div class="chart-container mb-12">
          <div class="chart-title">Daily Burn (this week)</div>
          <svg width="100%" height="120" viewBox="0 0 560 120">
            <line x1="40" y1="100" x2="540" y2="100" stroke="var(--chart-grid)" stroke-width="1"/>
            ${data.dailyBurn
              .map((d, i) => {
                const x = 60 + i * 70;
                const h = (d.tokens / maxDaily) * 100;
                const y = 100 - h;
                const fill = d.tokens === maxDaily && i > 0 ? "var(--danger)" : "var(--accent)";
                return `
                  <rect x="${x}" y="${y}" width="50" height="${h}" rx="2" fill="${fill}" opacity="0.8">
                    <title>${escapeHtml(d.day)}: ${formatCompactNumber(d.tokens)}</title>
                  </rect>
                  <text x="${x + 25}" y="115" fill="var(--text-secondary)" font-size="9" text-anchor="middle">${escapeHtml(d.day)}</text>
                `;
              })
              .join("")}
          </svg>
        </div>
        <!-- Model mix donut -->
        <div class="chart-row col-2">
          <div class="chart-container">
            <div class="chart-title">Model Mix</div>
            <div class="flex-center gap-16" style="justify-content:center;padding:8px 0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" stroke="var(--accent)" stroke-width="16"/>
                <text x="60" y="58" text-anchor="middle" fill="var(--text-primary)" font-size="16" font-weight="700">100%</text>
                <text x="60" y="72" text-anchor="middle" fill="var(--text-secondary)" font-size="9">openai</text>
              </svg>
              <div>
                ${data.modelMix
                  .map(
                    (m) => `
                  <div style="font-size:12px;margin-bottom:4px">
                    <span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px;margin-right:6px"></span>
                    ${escapeHtml(m.model)} — ${m.share}%
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAreaChart(area: { input: number[]; cached: number[] }): string {
  const n = Math.max(area.input.length, area.cached.length, 10);
  const w = 600;
  const h = 160;
  const pad = { l: 40, r: 20, t: 10, b: 20 };
  const xs = Array.from({ length: n }, (_, i) => pad.l + (i / (n - 1 || 1)) * (w - pad.l - pad.r));
  const maxV = Math.max(...area.input, ...area.cached, 1);
  const y = (v: number) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b);

  const inputPts = area.input.map((v, i) => `${xs[i]},${y(v)}`);
  const cachePts = area.cached.map((v, i) => `${xs[i]},${y(v)}`);
  const inputPoly = `${inputPts.join(" ")} ${xs[xs.length - 1]},${h - pad.b} ${xs[0]},${h - pad.b}`;
  const cachePoly = `${cachePts.join(" ")} ${xs[xs.length - 1]},${h - pad.b} ${xs[0]},${h - pad.b}`;

  return `
    <svg width="100%" height="160" viewBox="0 0 600 160">
      <defs>
        <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="gradCache" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--success)" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="var(--success)" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      <line x1="40" y1="10" x2="40" y2="140" stroke="var(--chart-grid)" stroke-width="1"/>
      <line x1="40" y1="140" x2="580" y2="140" stroke="var(--chart-grid)" stroke-width="1"/>
      <line x1="40" y1="75" x2="580" y2="75" stroke="var(--chart-grid)" stroke-width="0.5" stroke-dasharray="4"/>
      <text x="10" y="75" fill="var(--text-secondary)" font-size="9">${formatCompactNumber(Math.round(maxV * 0.5))}</text>
      <text x="10" y="140" fill="var(--text-secondary)" font-size="9">0</text>
      <polygon fill="url(#gradCache)" points="${cachePoly}"/>
      <polyline fill="none" stroke="var(--success)" stroke-width="1.5" points="${cachePts.join(" ")}"/>
      <polygon fill="url(#gradInput)" points="${inputPoly}"/>
      <polyline fill="none" stroke="var(--accent)" stroke-width="1.5" points="${inputPts.join(" ")}"/>
      <text x="40" y="155" fill="var(--text-secondary)" font-size="9">00:00</text>
      <text x="211" y="155" fill="var(--text-secondary)" font-size="9">04:00</text>
      <text x="382" y="155" fill="var(--text-secondary)" font-size="9">13:00</text>
      <text x="553" y="155" fill="var(--text-secondary)" font-size="9">now</text>
    </svg>
  `;
}
