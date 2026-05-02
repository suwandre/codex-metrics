import type { FilterPill } from "../types";
import { escapeHtml } from "./rendering";

type TopbarProps = {
  title: string;
  subtitle: string;
  filters: FilterPill[];
};

export function renderTopbar({ title, subtitle, filters }: TopbarProps): string {
  return `
    <header class="topbar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="subhead">${escapeHtml(subtitle)}</p>
      </div>
      <div class="toolbar" aria-label="Filters">
        ${filters.map(renderFilterPill).join("")}
      </div>
    </header>
  `;
}

function renderFilterPill(filter: FilterPill): string {
  return `
    <button class="pill" type="button">
      ${filter.live ? '<span class="dot"></span>' : ""}
      ${escapeHtml(filter.label)}
    </button>
  `;
}
