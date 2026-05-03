import type { CommandCenterData } from "../types";
import { escapeHtml } from "./rendering";

export function renderToolReliabilitySection(data: CommandCenterData["tools"]): string {
  const maxCalls = Math.max(...data.calls.map((c) => c.count), 1);

  return `
    <section class="section" id="s6">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Tool Reliability</div>
        <div class="section-badge">4</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="chart-container mb-12">
          <div class="chart-title">Calls by Tool</div>
          ${data.calls
            .map(
              (t, i) => `
            <div class="hbar-row">
              <span class="hbar-label">${escapeHtml(t.tool)}</span>
              <div class="hbar-track">
                <div class="hbar-fill" style="width:${(t.count / maxCalls) * 100}%;background:var(${i === 0 ? "--accent" : i === 1 ? "--info" : "--success"})">${t.count}</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Failed Commands</div>
          <table class="data-table">
            <thead><tr><th>Tool</th><th>Command</th><th>Session</th><th>Error</th><th>Time</th></tr></thead>
            <tbody>
              ${data.failed.length > 0
                ? data.failed
                    .map(
                      (f) => `
                <tr>
                  <td>${escapeHtml(f.tool)}</td>
                  <td class="font-mono">${escapeHtml(f.command)}</td>
                  <td>${escapeHtml(f.session)}</td>
                  <td><span class="text-danger">${escapeHtml(f.error)}</span></td>
                  <td>${escapeHtml(f.time)}</td>
                </tr>
              `,
                    )
                    .join("")
                : `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No failed commands</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Failure Rate by Tool</div>
          ${data.failureRate
            .map(
              (f) => `
            <div class="hbar-row">
              <span class="hbar-label">${escapeHtml(f.tool)}</span>
              <div class="hbar-track">
                <div class="hbar-fill" style="width:${Math.max(f.rate, 0.5)}%;background:${f.rate > 0 ? "var(--danger)" : "var(--success)"}">${f.rate}%</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="chart-container mb-12">
          <div class="chart-title">Slowest Commands</div>
          <table class="data-table">
            <thead><tr><th>Tool</th><th>Command</th><th>p95 Latency</th><th>Count</th></tr></thead>
            <tbody>
              ${data.slowest.length > 0
                ? data.slowest
                    .map(
                      (s) => `
                <tr>
                  <td>${escapeHtml(s.tool)}</td>
                  <td class="font-mono">${escapeHtml(s.command)}</td>
                  <td><span class="${s.latency.includes("s") && parseFloat(s.latency) > 10 ? "text-warning" : ""}">${escapeHtml(s.latency)}</span></td>
                  <td>${s.count}</td>
                </tr>
              `,
                    )
                    .join("")
                : `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No data</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="chart-title">Retry-Prone Sessions</div>
          <div style="font-size:12px">
            ${data.retryProne.length > 0
              ? data.retryProne
                  .map(
                    (r, i, arr) => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;${i < arr.length - 1 ? "border-bottom:1px solid var(--border)" : ""}">
                <span class="font-mono">${escapeHtml(r.session)}</span>
                <span class="text-warning font-bold">${r.retries} retries</span>
              </div>
            `,
                  )
                  .join("")
              : `<div style="color:var(--text-secondary);padding:6px 0">No retry-prone sessions</div>`}
          </div>
        </div>
      </div>
    </section>
  `;
}
