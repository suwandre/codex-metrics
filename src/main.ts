import "./styles.css";

type Metric = {
  label: string;
  source: string;
  value: string;
  delta: string;
};

type LimitWindow = {
  title: string;
  copy: string;
  progress: number;
  status: "ok" | "watch";
};

type Session = {
  name: string;
  model: string;
  tokens: string;
  cost: string;
  status: "live" | "ok" | "retry";
};

type ModelUsage = {
  model: string;
  share: number;
  tone: "green" | "orange" | "blue" | "red";
};

const metrics: Metric[] = [
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
];

const burnBars = [
  { day: "Mon", height: 46, tone: "input" },
  { day: "Tue", height: 63, tone: "input" },
  { day: "Wed", height: 31, tone: "output" },
  { day: "Thu", height: 82, tone: "input" },
  { day: "Fri", height: 58, tone: "input" },
  { day: "Sat", height: 37, tone: "output" },
  { day: "Sun", height: 71, tone: "input" },
] as const;

const limitWindows: LimitWindow[] = [
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
];

const sessions: Session[] = [
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
];

const modelUsage: ModelUsage[] = [
  { model: "gpt-5.5 high", share: 61, tone: "green" },
  { model: "gpt-5.5 medium", share: 22, tone: "orange" },
  { model: "gpt-5.4 mini", share: 12, tone: "blue" },
  { model: "other", share: 5, tone: "red" },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="mark">C</span> Codex Metrics</div>
      <nav class="nav" aria-label="Dashboard sections">
        <a class="active" href="#overview">Overview <span>01</span></a>
        <a href="#tokens">Tokens <span>02</span></a>
        <a href="#limits">Limits <span>03</span></a>
        <a href="#models">Models <span>04</span></a>
        <a href="#sessions">Sessions <span>05</span></a>
      </nav>
      <div class="side-note">
        Data model: Codex JSONL session events plus OpenAI cost and usage APIs where available.
        Limit windows come from local Codex rate-limit events.
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <h1>Codex usage command center</h1>
          <p class="subhead">
            Token burn, model mix, rolling limits, session health, and estimated spend in one
            operator-grade dashboard.
          </p>
        </div>
        <div class="toolbar" aria-label="Filters">
          <button class="pill" type="button"><span class="dot"></span> Live session</button>
          <button class="pill" type="button">Last 7 days</button>
          <button class="pill" type="button">Local + API</button>
        </div>
      </header>

      <section id="overview" class="grid metrics" aria-label="Key metrics">
        ${metrics
          .map(
            (metric) => `
              <article class="card metric">
                <div class="label"><span>${metric.label}</span><span>${metric.source}</span></div>
                <div class="value">${metric.value}</div>
                <div class="delta">${metric.delta}</div>
              </article>
            `,
          )
          .join("")}
      </section>

      <section id="tokens" class="section">
        <article class="card panel">
          <div class="panel-head">
            <h2>Daily token burn</h2>
            <span class="source">Input / cached / output</span>
          </div>
          <div class="chart" aria-label="Daily token chart">
            <div class="y-axis"><span>3.0M</span><span>2.0M</span><span>1.0M</span><span>0</span></div>
            ${burnBars
              .map(
                (bar) => `
                  <div class="bar-wrap">
                    <div class="bar ${bar.tone}" style="height: ${bar.height}%"></div>
                    <div class="bar-label">${bar.day}</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>

        <article id="limits" class="card panel">
          <div class="panel-head">
            <h2>Limit windows</h2>
            <span class="source">Codex rate limits</span>
          </div>
          <div class="limits">
            ${limitWindows
              .map(
                (window) => `
                  <div class="limit-row">
                    <div class="ring" style="--progress: ${window.progress}">
                      <span>${window.progress}%</span>
                    </div>
                    <div>
                      <div class="limit-title">${window.title}</div>
                      <p class="limit-copy">${window.copy}</p>
                    </div>
                    <span class="badge ${window.status === "watch" ? "warn" : ""}">${window.status}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      </section>

      <section class="section">
        <article id="sessions" class="card panel">
          <div class="panel-head">
            <h2>Recent sessions</h2>
            <span class="source">JSONL rollouts</span>
          </div>
          <table class="table">
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
              ${sessions
                .map(
                  (session) => `
                    <tr>
                      <td>${session.name}</td>
                      <td>${session.model}</td>
                      <td>${session.tokens}</td>
                      <td>${session.cost}</td>
                      <td>
                        <span class="badge ${session.status === "retry" ? "warn" : ""}">
                          ${session.status}
                        </span>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </article>

        <article id="models" class="card panel">
          <div class="panel-head">
            <h2>Model usage</h2>
            <span class="source">session meta</span>
          </div>
          <div class="model-list">
            ${modelUsage
              .map(
                (usage) => `
                  <div class="model-row">
                    <strong>${usage.model}</strong>
                    <div class="track">
                      <div class="fill ${usage.tone}" style="width: ${usage.share}%"></div>
                    </div>
                    <span>${usage.share}%</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      </section>
    </main>
  </div>
`;
