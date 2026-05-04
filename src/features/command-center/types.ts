export type Metric = {
  label: string;
  source: string;
  value: string;
  delta: string;
};

export type BurnBarTone = "input" | "output";

export type BurnBar = {
  day: string;
  height: number;
  totalTokens: number;
  tone: BurnBarTone;
};

export type LimitWindowStatus = "ok" | "watch";

export type LimitWindow = {
  title: string;
  copy: string;
  progress: number;
  status: LimitWindowStatus;
};

export type SessionStatus = "live" | "ok" | "retry" | "unknown";

export type Session = {
  name: string;
  model: string;
  tokens: string;
  cost: string;
  status: SessionStatus;
};

export type ModelUsageTone = "green" | "orange" | "blue" | "red";

export type ModelUsage = {
  model: string;
  share: number;
  tone: ModelUsageTone;
};

export type NavItem = {
  label: string;
  href: `#${string}`;
  order: string;
  active?: boolean;
};

export type FilterPill = {
  label: string;
  live?: boolean;
};

export type KpiMetric = {
  label: string;
  value: string;
  unit?: string;
  color: "success" | "warning" | "accent" | "danger" | "info" | "default";
  delta: string;
  deltaDirection: "up" | "down" | "neutral";
  deltaColor: "success" | "warning" | "danger" | "default";
  sparkline: Array<number | null>;
  timestamps?: string[];
  sparklineLabels?: string[];
  description?: string;
};

export type SessionRow = {
  id: string;
  repo: string;
  model: string;
  turns: number;
  tokens: string;
  latency: string;
  success: SessionStatus;
  age: string;
};

export type RateLimitRow = {
  window: string;
  used: string;
  remaining: string;
  countdown: string;
  status: LimitWindowStatus;
};

export type ToolCall = {
  tool: string;
  count: number;
};

export type FailedCommand = {
  tool: string;
  command: string;
  session: string;
  error: string;
  time: string;
};

export type RepoBreakdown = {
  name: string;
  tokens: number;
  failures: number;
  avgLatency: string;
  p95Latency: string;
  count: number;
};

export type BillingCost = {
  day: string;
  amount: number;
};

export type ApiProduct = {
  name: string;
  metric: string;
  unit: string;
  cost: string;
  sparkline: number[];
};

export type CommandCenterData = {
  title: string;
  subtitle: string;
  refreshStatus: string;
  navItems: NavItem[];
  sideNote: string;
  filters: FilterPill[];
  metrics: Metric[];
  burnBars: BurnBar[];
  limitWindows: LimitWindow[];
  sessions: Session[];
  modelUsage: ModelUsage[];
  kpis: KpiMetric[];
  tokenBurn: {
    composition: { label: string; value: number; color: string }[];
    areaChart: { input: number[]; cached: number[] };
    dailyBurn: { day: string; tokens: number }[];
    modelMix: { model: string; share: number }[];
  };
  rateLimits: {
    rows: RateLimitRow[];
    burnRate: number[];
    projection: string;
    safeBudget: number;
  };
  sessionStream: {
    rows: SessionRow[];
    turnHistogram: { label: string; value: number }[];
    scatter: { x: number; y: number }[];
    longest: { name: string; age: string }[];
    biggest: { name: string; tokens: string }[];
  };
  cache: {
    hitRatio: number;
    tokensSaved: string;
    savings: string;
    uncachedTrend: number[];
    byModel: { model: string; ratio: number }[];
  };
  context: {
    avgUsage: number;
    maxUsage: number;
    thresholds: { label: string; count: number; width: number }[];
    candidates: { session: string; current: number; turnsLeft: string }[];
    growth: number[];
  };
  tools: {
    calls: ToolCall[];
    failed: FailedCommand[];
    failureRate: { tool: string; rate: number }[];
    slowest: { tool: string; command: string; latency: string; count: number }[];
    retryProne: { session: string; retries: number }[];
  };
  repos: {
    distribution: { name: string; tokens: number }[];
    failures: { name: string; count: number; width: number }[];
    latency: RepoBreakdown[];
    mostExpensiveRepo: { name: string; tokens: string };
    mostExpensiveSession: { name: string; tokens: string };
  };
  billing: {
    byDay: BillingCost[];
    breakdown: { label: string; value: number; cost: string }[];
    completions: {
      model: string;
      project: string;
      user: string;
      key: string;
      tier: string;
      tokens: string;
      cost: string;
    }[];
    totalRequests: number;
    batchShare: number;
  };
  products: ApiProduct[];
};
