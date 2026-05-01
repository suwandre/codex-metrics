export type TokenUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

export type LimitWindow = {
  usedPercent: number | null;
  windowMinutes: number | null;
  resetsAt: string | null;
};

export type LimitMetrics = {
  planType: string | null;
  status: "ok" | "watch" | "capped" | "unknown";
  primary: LimitWindow;
  secondary: LimitWindow;
};

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  source: "local" | "derived" | "estimated" | "api";
  tone: "good" | "watch" | "neutral";
};

export type DailyTokenPoint = {
  date: string;
  label: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

export type RecentSession = {
  id: string;
  label: string;
  startedAt: string;
  lastEventAt: string;
  cwd: string | null;
  model: string;
  tokens: TokenUsage;
  estimatedCost: number;
  status: "live" | "ok" | "retry" | "unknown";
};

export type ModelUsage = {
  model: string;
  sessions: number;
  tokens: number;
  estimatedCost: number;
  share: number;
};

export type MetricsSnapshot = {
  generatedAt: string;
  codexHome: string;
  pricingSource: string;
  warnings: string[];
  summary: {
    totalTokens: TokenUsage;
    estimatedCost: number;
    cachedSavings: number;
    averageLatencySeconds: number | null;
    p95LatencySeconds: number | null;
    successRate: number | null;
    failedCommands: number;
    totalCommands: number;
    throughputTokensPerMinute: number | null;
    sessionCount: number;
    turnCount: number;
  };
  limits: LimitMetrics;
  metricCards: MetricCard[];
  dailyTokens: DailyTokenPoint[];
  recentSessions: RecentSession[];
  modelUsage: ModelUsage[];
};
