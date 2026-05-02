import type { CommandCenterData } from "./types";

export const commandCenterData = {
  title: "Codex usage command center",
  subtitle:
    "Token burn, model mix, rolling limits, session health, and estimated spend in one operator-grade dashboard.",
  refreshStatus: "Static mock data. Generated metrics poll every 3s in the live dashboard.",
  navItems: [
    { label: "Overview", href: "#overview", order: "01", active: true },
    { label: "Tokens", href: "#tokens", order: "02" },
    { label: "Limits", href: "#limits", order: "03" },
    { label: "Models", href: "#models", order: "04" },
    { label: "Sessions", href: "#sessions", order: "05" },
  ],
  sideNote:
    "Data model: Codex JSONL session events plus OpenAI cost and usage APIs where available. Limit windows come from local Codex rate-limit events.",
  filters: [
    { label: "Live session", live: true },
    { label: "Last 7 days" },
    { label: "Local + API" },
  ],
  metrics: [
    {
      label: "Total tokens",
      source: "local",
      value: "12.8M",
      delta: "+18.4% vs prior week",
    },
    {
      label: "Estimated cost",
      source: "price map",
      value: "$41.72",
      delta: "Cached input saved $22.10",
    },
    {
      label: "Avg latency",
      source: "derived",
      value: "12.4s",
      delta: "p95 31.8s",
    },
    {
      label: "Success rate",
      source: "derived",
      value: "97.6%",
      delta: "11 failed tool exits",
    },
    {
      label: "Throughput",
      source: "derived",
      value: "1.9k/s",
      delta: "Output tokens per minute",
    },
  ],
  burnBars: [
    { day: "Mon", height: 46, tone: "input" },
    { day: "Tue", height: 63, tone: "input" },
    { day: "Wed", height: 31, tone: "output" },
    { day: "Thu", height: 82, tone: "input" },
    { day: "Fri", height: 58, tone: "input" },
    { day: "Sat", height: 37, tone: "output" },
    { day: "Sun", height: 71, tone: "input" },
  ],
  limitWindows: [
    {
      title: "5 hour usage",
      copy: "Primary window resets at 23:38. Current model: gpt-5.5 high.",
      progress: 63,
      status: "watch",
    },
    {
      title: "Weekly usage",
      copy: "Secondary window resets Monday morning. Trend is below weekly pace.",
      progress: 28,
      status: "ok",
    },
  ],
  sessions: [
    {
      name: "22:37 codex-metrics",
      model: "gpt-5.5 high",
      tokens: "592.5k",
      cost: "$1.94",
      status: "live",
    },
    {
      name: "20:52 portfolio-work",
      model: "gpt-5.4 medium",
      tokens: "1.8M",
      cost: "$5.80",
      status: "ok",
    },
    {
      name: "11:06 app-debug",
      model: "gpt-5.4 mini",
      tokens: "438k",
      cost: "$0.41",
      status: "retry",
    },
  ],
  modelUsage: [
    { model: "gpt-5.5 high", share: 61, tone: "green" },
    { model: "gpt-5.5 medium", share: 22, tone: "orange" },
    { model: "gpt-5.4 mini", share: 12, tone: "blue" },
    { model: "other", share: 5, tone: "red" },
  ],
} satisfies CommandCenterData;
