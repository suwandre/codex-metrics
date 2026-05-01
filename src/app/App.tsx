import { Activity, Clock3, Database, RefreshCw } from "lucide-react";
import {
  formatCompactNumber,
  formatCurrency,
  formatPercent,
  formatResetTime,
  getRepoLabel,
} from "../features/metrics/format";
import type {
  DailyTokenPoint,
  LimitMetrics,
  MetricsSnapshot,
  ModelUsage,
  RecentSession,
} from "../features/metrics/types";
import { useMetrics } from "../features/metrics/useMetrics";

const navItems = ["Overview", "Tokens", "Limits", "Models", "Sessions"];

export function App() {
  const metrics = useMetrics();

  if (metrics.status === "loading") {
    return (
      <DashboardShell
        body={<StatePanel title="Loading metrics" detail="Reading generated Codex metrics." />}
      />
    );
  }

  if (metrics.status === "error") {
    return (
      <DashboardShell
        body={
          <StatePanel
            title="Metrics unavailable"
            detail={`${metrics.error}. Run bun run collect, then refresh this page.`}
          />
        }
      />
    );
  }

  return <DashboardShell body={<Dashboard data={metrics.data} />} />;
}

function DashboardShell({ body }: { body: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">C</span>
          <span>Codex Metrics</span>
        </div>
        <nav aria-label="Dashboard sections">
          {navItems.map((item, index) => (
            <a className={index === 0 ? "active" : ""} href={`#${item.toLowerCase()}`} key={item}>
              <span>{item}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </a>
          ))}
        </nav>
        <div className="side-note">
          Local JSONL events first. API reconciliation later. Prompt content stays out of this dashboard.
        </div>
      </aside>
      <main>{body}</main>
    </div>
  );
}

function Dashboard({ data }: { data: MetricsSnapshot }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Codex usage command center</h1>
          <p className="subhead">
            Token burn, model mix, rolling limits, session health, and estimated spend.
          </p>
        </div>
        <div className="toolbar">
          <span className="pill">
            <Activity size={16} aria-hidden="true" />
            {data.summary.sessionCount} sessions
          </span>
          <span className="pill">
            <Database size={16} aria-hidden="true" />
            Local JSONL
          </span>
          <button
            className="icon-button"
            type="button"
            title="Refresh metrics"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            <span className="sr-only">Refresh metrics</span>
          </button>
        </div>
      </header>

      {data.warnings.length > 0 ? (
        <section className="warning-strip" aria-label="Warnings">
          {data.warnings.slice(0, 2).map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </section>
      ) : null}

      <section className="grid metrics" aria-label="Key metrics">
        {data.metricCards.map((card) => (
          <article className="card metric" key={card.label}>
            <div className="label">
              <span>{card.label}</span>
              <span>{card.source}</span>
            </div>
            <div className="value">{card.value}</div>
            <div className={`delta ${card.tone}`}>{card.detail}</div>
          </article>
        ))}
      </section>

      <section className="section">
        <TokenChart points={data.dailyTokens} />
        <LimitPanel limits={data.limits} />
      </section>

      <section className="section">
        <RecentSessions sessions={data.recentSessions} />
        <ModelUsagePanel models={data.modelUsage} />
      </section>

      <footer className="footer-note">
        Generated {new Date(data.generatedAt).toLocaleString()} from {data.codexHome}. Costs:{" "}
        {data.pricingSource}.
      </footer>
    </>
  );
}

function TokenChart({ points }: { points: DailyTokenPoint[] }) {
  const maxTokens = Math.max(...points.map((point) => point.totalTokens), 1);

  return (
    <article className="card panel">
      <div className="panel-head">
        <h2>Daily token burn</h2>
        <span className="source">input / cached / output</span>
      </div>
      <div className="chart" role="img" aria-label="Daily token chart">
        <div className="y-axis">
          <span>{formatCompactNumber(maxTokens)}</span>
          <span>{formatCompactNumber(maxTokens * 0.66)}</span>
          <span>{formatCompactNumber(maxTokens * 0.33)}</span>
          <span>0</span>
        </div>
        {points.map((point) => {
          const inputHeight = Math.max((point.inputTokens / maxTokens) * 100, point.totalTokens > 0 ? 8 : 0);
          const outputHeight = Math.max(
            (point.outputTokens / maxTokens) * 100,
            point.outputTokens > 0 ? 6 : 0,
          );

          return (
            <div
              className="bar-wrap"
              key={point.date}
              title={`${point.label}: ${formatCompactNumber(point.totalTokens)}`}
            >
              <div
                className="stacked-bar"
                style={{ height: `${Math.min(inputHeight + outputHeight, 100)}%` }}
              >
                <span className="bar output" style={{ height: `${outputHeight}%` }} />
                <span className="bar" style={{ height: `${inputHeight}%` }} />
              </div>
              <div className="bar-label">{point.label}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function LimitPanel({ limits }: { limits: LimitMetrics }) {
  const primaryPercent = limits.primary.usedPercent ?? 0;
  const secondaryPercent = limits.secondary.usedPercent ?? 0;

  return (
    <article className="card panel">
      <div className="panel-head">
        <h2>Limit windows</h2>
        <span className="source">Codex rate limits</span>
      </div>
      <div className="limits">
        <LimitRow
          label="5 hour usage"
          percent={primaryPercent}
          status={limits.status === "capped" ? "capped" : primaryPercent >= 70 ? "watch" : "ok"}
          copy={`${formatResetTime(limits.primary.resetsAt)}. Plan: ${limits.planType ?? "unknown"}.`}
        />
        <LimitRow
          label="Weekly usage"
          percent={secondaryPercent}
          status={secondaryPercent >= 70 ? "watch" : "ok"}
          copy={`${formatResetTime(limits.secondary.resetsAt)}. ${limits.secondary.windowMinutes ?? 0} minute window.`}
        />
      </div>
    </article>
  );
}

function LimitRow({
  label,
  percent,
  copy,
  status,
}: {
  label: string;
  percent: number;
  copy: string;
  status: "ok" | "watch" | "capped";
}) {
  return (
    <div className="limit-row">
      <div className="ring" style={{ "--p": percent } as React.CSSProperties}>
        <span>{formatPercent(percent)}</span>
      </div>
      <div>
        <div className="limit-title">{label}</div>
        <p className="limit-copy">{copy}</p>
      </div>
      <span className={`badge ${status === "ok" ? "" : "warn"}`}>{status}</span>
    </div>
  );
}

function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  return (
    <article className="card panel">
      <div className="panel-head">
        <h2>Recent sessions</h2>
        <span className="source">JSONL rollouts</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <strong>{getRepoLabel(session.cwd)}</strong>
                  <span>{new Date(session.startedAt).toLocaleString()}</span>
                </td>
                <td>{session.model}</td>
                <td>{formatCompactNumber(session.tokens.totalTokens)}</td>
                <td>{formatCurrency(session.estimatedCost)}</td>
                <td>
                  <span className={`badge ${session.status === "retry" ? "warn" : ""}`}>
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ModelUsagePanel({ models }: { models: ModelUsage[] }) {
  return (
    <article className="card panel">
      <div className="panel-head">
        <h2>Model usage</h2>
        <span className="source">turn metadata</span>
      </div>
      <div className="model-list">
        {models.map((model, index) => (
          <div className="model-row" key={model.model}>
            <strong>{model.model}</strong>
            <div className="track">
              <div className={`fill fill-${index % 4}`} style={{ width: `${model.share}%` }} />
            </div>
            <span>{formatPercent(model.share)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function StatePanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="state-panel">
      <Clock3 size={28} aria-hidden="true" />
      <h1>{title}</h1>
      <p>{detail}</p>
    </section>
  );
}
