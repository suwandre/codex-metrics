import type { NavItem } from "../types";
import { classNames, escapeHtml } from "./rendering";

type SidebarProps = {
  navItems: NavItem[];
  sideNote: string;
};

export function renderSidebar({ navItems, sideNote }: SidebarProps): string {
  return `
    <aside class="sidebar">
      <div class="brand"><span class="mark">C</span> Codex Metrics</div>
      <nav class="nav" aria-label="Dashboard sections">
        ${navItems.map(renderNavItem).join("")}
      </nav>
      <div class="side-note">${escapeHtml(sideNote)}</div>
    </aside>
  `;
}

function renderNavItem(item: NavItem): string {
  return `
    <a class="${classNames(item.active && "active")}" href="${item.href}">
      ${escapeHtml(item.label)} <span>${escapeHtml(item.order)}</span>
    </a>
  `;
}
