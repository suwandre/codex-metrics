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
  tone: BurnBarTone;
};

export type LimitWindowStatus = "ok" | "watch";

export type LimitWindow = {
  title: string;
  copy: string;
  progress: number;
  status: LimitWindowStatus;
};

export type SessionStatus = "live" | "ok" | "retry";

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

export type CommandCenterData = {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  sideNote: string;
  filters: FilterPill[];
  metrics: Metric[];
  burnBars: BurnBar[];
  limitWindows: LimitWindow[];
  sessions: Session[];
  modelUsage: ModelUsage[];
};
