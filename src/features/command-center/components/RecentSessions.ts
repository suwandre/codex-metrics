import type { Session } from "../types";
import { classNames, escapeHtml } from "./rendering";

type RecentSessionsProps = {
  sessions: Session[];
};

export function renderRecentSessions({ sessions }: RecentSessionsProps): string {
  return `
    <article id="sessions" class="card panel">
      <div class="panel-head">
        <h2>Recent sessions</h2>
        <span class="source">JSONL rollouts</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.length > 0 ? sessions.map(renderSessionRow).join("") : renderEmptyRow()}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderEmptyRow(): string {
  return `
    <tr class="empty-row">
      <td colspan="5">No Codex sessions found in generated metrics.</td>
    </tr>
  `;
}

function renderSessionRow(session: Session): string {
  return `
    <tr>
      <td>${escapeHtml(session.name)}</td>
      <td>${escapeHtml(session.model)}</td>
      <td>${escapeHtml(session.tokens)}</td>
      <td>${escapeHtml(session.cost)}</td>
      <td>
        <span class="${classNames("badge", session.status === "retry" && "warn")}">
          ${escapeHtml(session.status)}
        </span>
      </td>
    </tr>
  `;
}
