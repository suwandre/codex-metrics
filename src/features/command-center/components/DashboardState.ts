import { escapeHtml } from "./rendering";

type DashboardStateProps = {
  title: string;
  copy: string;
};

export function renderDashboardState({ title, copy }: DashboardStateProps): string {
  return `
    <main class="app-state" role="status" aria-live="polite">
      <div class="state-mark">C</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(copy)}</p>
    </main>
  `;
}
