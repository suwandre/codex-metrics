import type { CommandCenterData } from "../types";
import { renderDailyTokenBurn } from "./DailyTokenBurn";
import { renderKpiCards } from "./KpiCards";
import { renderLimitWindows } from "./LimitWindows";
import { renderModelUsage } from "./ModelUsage";
import { renderRecentSessions } from "./RecentSessions";
import { renderSidebar } from "./Sidebar";
import { renderTopbar } from "./Topbar";

export function renderCommandCenter(data: CommandCenterData): string {
  return `
    <div class="shell">
      ${renderSidebar({ navItems: data.navItems, sideNote: data.sideNote })}

      <main class="workspace">
        ${renderTopbar({
          title: data.title,
          subtitle: data.subtitle,
          filters: data.filters,
        })}

        ${renderKpiCards({ metrics: data.metrics })}

        <section id="tokens" class="section">
          ${renderDailyTokenBurn({ burnBars: data.burnBars })}
          ${renderLimitWindows({ limitWindows: data.limitWindows })}
        </section>

        <section class="section">
          ${renderRecentSessions({ sessions: data.sessions })}
          ${renderModelUsage({ modelUsage: data.modelUsage })}
        </section>
      </main>
    </div>
  `;
}
