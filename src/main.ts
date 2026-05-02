import "./styles.css";
import { renderCommandCenter } from "./features/command-center/components/CommandCenter";
import { renderDashboardState } from "./features/command-center/components/DashboardState";
import { isGeneratedMetricsFile, toCommandCenterData } from "./features/command-center/metrics";

const pollIntervalMs = 3000;
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
    appRoot.innerHTML = renderCommandCenter(
      toCommandCenterData(metrics, {
        refreshStatus: `Updated ${formatTime(metrics.generatedAt)}. Polling every ${pollIntervalMs / 1000}s.`,
      }),
    );
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

  if (!status) {
    return;
  }

  status.textContent = message;
}

function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "unknown";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
