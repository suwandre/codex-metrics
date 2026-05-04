import "./styles.css";
import { renderCommandCenter } from "./features/command-center/components/CommandCenter";
import { renderDashboardState } from "./features/command-center/components/DashboardState";
import { isGeneratedMetricsFile, toCommandCenterData } from "./features/command-center/metrics";
import { loadHistory, saveSnapshot } from "./features/history/storage";
import type { TimeWindow } from "./features/history/types";

// Polling chosen over SSE/WebSocket because:
// - 1s HTTP polling on localhost has negligible overhead
// - SSE/WebSocket would require persistent server process, connection management, and reconnection logic
// - For a local dev tool dashboard, the complexity outweighs the ~500ms latency savings per update
const pollIntervalMs = 1000;
let currentWindow: TimeWindow = "24h";
let cleanupSectionTracking: (() => void) | null = null;
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const appRoot = app;
let currentGeneratedAt: string | null = null;
let hasRenderedDashboard = false;

appRoot.innerHTML = renderDashboardState({
  title: "Loading metrics",
  copy: "Reading generated Codex metrics from public/metrics.json.",
});

void refreshDashboard({ forceRender: true });
setInterval(() => {
  void refreshDashboard({ forceRender: false });
}, pollIntervalMs);

async function refreshDashboard({ forceRender }: { forceRender: boolean }) {
  try {
    const metrics = await loadMetrics();

    if (!forceRender && metrics.generatedAt === currentGeneratedAt) {
      setRefreshStatus(`Checked ${formatTime(new Date())}. No new metrics.`);
      return;
    }

    currentGeneratedAt = metrics.generatedAt;
    hasRenderedDashboard = true;

    const history = loadHistory();
    saveSnapshot({ generatedAt: metrics.generatedAt, metrics: metrics.metrics });

    appRoot.innerHTML = renderCommandCenter(
      toCommandCenterData(metrics, {
        refreshStatus: `Updated ${formatTime(metrics.generatedAt)}. Polling every ${pollIntervalMs / 1000}s.`,
        history,
        window: currentWindow,
        timeWindows: metrics.timeWindows,
      }),
      currentWindow,
    );
    setupInteractions();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown metrics loading error.";

    if (hasRenderedDashboard) {
      setRefreshStatus(`Refresh failed ${formatTime(new Date())}: ${message}`);
      return;
    }

    appRoot.innerHTML = renderDashboardState({
      title: "Metrics unavailable",
      copy: message,
    });
  }
}

async function loadMetrics() {
  const response = await fetch("/metrics.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load metrics.json. HTTP ${response.status}.`);
  }

  const metrics: unknown = await response.json();

  if (!isGeneratedMetricsFile(metrics)) {
    throw new Error("metrics.json has an unsupported shape. Regenerate metrics.");
  }

  return metrics;
}

function setRefreshStatus(message: string) {
  const status = document.querySelector<HTMLParagraphElement>("#refresh-status");
  if (!status) return;
  status.textContent = message;
}

function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "unknown";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setupInteractions() {
  // Section collapse
  document.querySelectorAll("[data-toggle='section']").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.closest(".section");
      if (section) section.classList.toggle("collapsed");
    });
  });

  // Toggle tabs
  document.querySelectorAll(".toggle-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const parent = tab.closest(".toggle-tabs");
      if (!parent) return;
      parent.querySelectorAll(".toggle-tab").forEach((t) => {
        t.classList.remove("active");
      });
      tab.classList.add("active");
    });
  });

  // Window toggle
  document.querySelectorAll(".window-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const w = btn.getAttribute("data-window");
      if (!w) return;
      currentWindow = w as TimeWindow;
      void refreshDashboard({ forceRender: true });
    });
  });

  setupSidebarActiveTracking();

  // Refresh now button
  const btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      const ts = document.getElementById("timestamp");
      if (ts) ts.textContent = "Updated just now";
      void refreshDashboard({ forceRender: true });
    });
  }

  // Export CSV button
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      // eslint-disable-next-line no-console
      console.log("CSV export triggered");
    });
  }

  setupSparklines();
}

function setupSidebarActiveTracking() {
  cleanupSectionTracking?.();

  const sections = [...document.querySelectorAll<HTMLElement>(".section")];
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".nav-link")];
  const headerOffset = 64;
  let pendingFrame = 0;

  const setActiveSection = () => {
    pendingFrame = 0;

    const activeId = getActiveSectionId(sections, headerOffset);
    if (!activeId) return;

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
    });
  };

  const requestUpdate = () => {
    if (pendingFrame !== 0) return;
    pendingFrame = requestAnimationFrame(setActiveSection);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();

  cleanupSectionTracking = () => {
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    if (pendingFrame !== 0) cancelAnimationFrame(pendingFrame);
  };
}

function getActiveSectionId(sections: readonly HTMLElement[], headerOffset: number) {
  if (sections.length === 0) return null;

  let activeSection = sections[0];
  let activeDistance = Number.NEGATIVE_INFINITY;

  for (const section of sections) {
    const distance = section.getBoundingClientRect().top - headerOffset;
    if (distance > 8 || distance <= activeDistance) continue;

    activeSection = section;
    activeDistance = distance;
  }

  return activeSection.id;
}

// Sparkline hover
function setupSparklines() {
  document.querySelectorAll(".kpi-sparkline").forEach((container) => {
    const wrapper = container as HTMLElement;
    const rects = wrapper.querySelectorAll("rect[data-idx]");
    const guide = wrapper.querySelector(".sparkline-guide") as SVGLineElement | null;
    const dot = wrapper.querySelector(".sparkline-dot") as SVGCircleElement | null;
    const tooltip = wrapper.querySelector(".sparkline-tooltip") as HTMLElement | null;
    const pointsData = wrapper.dataset.points;
    const timestampsData = wrapper.dataset.timestamps;
    const pointValuesData = wrapper.dataset.pointValues;
    const valueLabel = wrapper.dataset.value ?? "";
    const color = wrapper.dataset.color ?? "var(--text-secondary)";

    if (!pointsData || !timestampsData || !guide || !dot || !tooltip) return;

    const points: Array<{ x: number; y: number } | null> = JSON.parse(pointsData);
    const timestamps: string[] = JSON.parse(timestampsData);
    const pointValues: string[] = pointValuesData ? JSON.parse(pointValuesData) : [];

    rects.forEach((rect) => {
      rect.addEventListener("mouseenter", (e) => {
        const idx = Number((e.target as HTMLElement).dataset.idx);
        const pt = points[idx];
        if (!pt) return;

        guide.setAttribute("x1", String(pt.x));
        guide.setAttribute("x2", String(pt.x));
        guide.style.opacity = "1";

        dot.setAttribute("cx", String(pt.x));
        dot.setAttribute("cy", String(pt.y));
        dot.setAttribute("fill", color);
        dot.style.opacity = "1";

        const valueEl = tooltip.querySelector(".sparkline-tooltip-value") as HTMLElement;
        const timeEl = tooltip.querySelector(".sparkline-tooltip-time") as HTMLElement;
        if (valueEl) valueEl.textContent = pointValues[idx] ?? valueLabel;
        if (timeEl) timeEl.textContent = timestamps[idx] ?? "";

        // Position tooltip above the point, but flip if near top
        const tooltipHeight = tooltip.offsetHeight || 40;
        let top = pt.y - tooltipHeight - 6;
        if (top < 0) top = pt.y + 10; // flip below
        tooltip.style.left = `${pt.x}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = "1";
      });

      rect.addEventListener("mouseleave", () => {
        guide.style.opacity = "0";
        dot.style.opacity = "0";
        tooltip.style.opacity = "0";
      });
    });
  });
}
