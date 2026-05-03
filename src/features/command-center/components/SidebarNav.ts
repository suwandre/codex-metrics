import { escapeHtml } from "./rendering";

const sectionLinks = [
  { id: "pulse", label: "System Pulse", badge: 8 },
  { id: "s1", label: "Token Burn", badge: 4 },
  { id: "s2", label: "Rate Limits", badge: 3 },
  { id: "s3", label: "Sessions", badge: 5 },
  { id: "s4", label: "Cache", badge: 4 },
  { id: "s5", label: "Context", badge: 3 },
  { id: "s6", label: "Tools", badge: 4 },
  { id: "s7", label: "Repos", badge: 4 },
  { id: "s8", label: "Billing", badge: 4 },
  { id: "s9", label: "Products", badge: 7 },
];

export function renderSidebarNav(): string {
  return `
    <nav class="sidebar" id="sidebar">
      <div class="nav-logo"><span>Codex</span> Metrics</div>
      <div class="nav-section">Overview</div>
      <a class="nav-link active" href="#pulse">System Pulse</a>
      <div class="nav-section">Sections</div>
      ${sectionLinks
        .filter((link) => link.id !== "pulse")
        .map(
          (link) => `
        <a class="nav-link" href="#${link.id}">
          ${escapeHtml(link.label)}
          <span class="badge">${link.badge}</span>
        </a>
      `,
        )
        .join("")}
    </nav>
  `;
}
