import "./styles.css";
import { renderCommandCenter } from "./features/command-center/components/CommandCenter";
import { renderDashboardState } from "./features/command-center/components/DashboardState";
import { isGeneratedMetricsFile, toCommandCenterData } from "./features/command-center/metrics";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const appRoot = app;

appRoot.innerHTML = renderDashboardState({
  title: "Loading metrics",
  copy: "Reading generated Codex metrics from public/metrics.json.",
});

loadDashboard().catch((error: unknown) => {
  appRoot.innerHTML = renderDashboardState({
    title: "Metrics unavailable",
    copy: error instanceof Error ? error.message : "Unknown metrics loading error.",
  });
});

async function loadDashboard() {
  const response = await fetch("/metrics.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load metrics.json. HTTP ${response.status}.`);
  }

  const metrics: unknown = await response.json();

  if (!isGeneratedMetricsFile(metrics)) {
    throw new Error("metrics.json has an unsupported shape. Regenerate metrics.");
  }

  appRoot.innerHTML = renderCommandCenter(toCommandCenterData(metrics));
}
