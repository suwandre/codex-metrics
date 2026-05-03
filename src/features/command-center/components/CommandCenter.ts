import type { CommandCenterData } from "../types";
import { renderApiProductsSection } from "./ApiProductsSection";
import { renderBillingSection } from "./BillingSection";
import { renderCacheSection } from "./CacheSection";
import { renderContextSection } from "./ContextSection";
import { renderRateLimitSection } from "./RateLimitSection";
import { renderRepoSection } from "./RepoSection";
import { renderSessionStreamSection } from "./SessionStreamSection";
import { renderSidebarNav } from "./SidebarNav";
import { renderStickyHeader } from "./StickyHeader";
import { renderSystemPulse } from "./SystemPulse";
import { renderTokenBurnSection } from "./TokenBurnSection";
import { renderToolReliabilitySection } from "./ToolReliabilitySection";

export function renderCommandCenter(data: CommandCenterData): string {
  return `
    <div class="layout">
      ${renderSidebarNav()}
      <main class="main" id="main">
        ${renderStickyHeader(data.refreshStatus)}
        ${renderSystemPulse(data.kpis)}
        ${renderTokenBurnSection(data.tokenBurn)}
        ${renderRateLimitSection(data.rateLimits)}
        ${renderSessionStreamSection(data.sessionStream)}
        ${renderCacheSection(data.cache)}
        ${renderContextSection(data.context)}
        ${renderToolReliabilitySection(data.tools)}
        ${renderRepoSection(data.repos)}
        ${renderBillingSection(data.billing)}
        ${renderApiProductsSection(data.products)}
      </main>
    </div>
  `;
}
