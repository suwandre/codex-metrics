import { useEffect, useState } from "react";
import type { MetricsSnapshot } from "./types";

type MetricsState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: MetricsSnapshot; error: null }
  | { status: "error"; data: null; error: string };

export function useMetrics(): MetricsState {
  const [state, setState] = useState<MetricsState>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function loadMetrics() {
      try {
        const response = await fetch(`/metrics.json?ts=${Date.now()}`);

        if (!response.ok) {
          throw new Error(`Metrics file unavailable (${response.status})`);
        }

        const data = (await response.json()) as MetricsSnapshot;

        if (isActive) {
          setState({ status: "ready", data, error: null });
        }
      } catch (error) {
        if (!isActive) return;

        const message = error instanceof Error ? error.message : "Unknown metrics load error";
        setState({ status: "error", data: null, error: message });
      }
    }

    void loadMetrics();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
