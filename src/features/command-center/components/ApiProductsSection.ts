import type { CommandCenterData } from "../types";
import { escapeHtml, sparklineSvg } from "./rendering";

export function renderApiProductsSection(products: CommandCenterData["products"]): string {
  return `
    <section class="section" id="s9">
      <div class="section-header" data-toggle="section">
        <div class="section-title">Other OpenAI Products</div>
        <div class="section-badge">7</div>
        <div class="section-collapse">&#9660;</div>
      </div>
      <div class="section-body">
        <div class="card-grid col-3">
          ${products
            .map(
              (p) => `
            <div class="card">
              <div class="card-label">${escapeHtml(p.name)}</div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px">
                <div>
                  <div class="card-value">${escapeHtml(p.metric)}<span style="font-size:12px;color:var(--text-secondary)">${escapeHtml(p.unit)}</span></div>
                  <div class="card-sub">${escapeHtml(p.unit)}</div>
                </div>
                <div style="text-align:right"><div style="font-size:16px;font-weight:700">${escapeHtml(p.cost)}</div></div>
              </div>
              ${sparklineSvg(p.sparkline, "var(--text-secondary)", 100, 20)}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}
