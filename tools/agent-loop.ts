import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type AgentRole = "builder" | "reviewer" | "repair";

type CliOptions = {
  dryRun: boolean;
  maxRepairs: number;
  maxTasks: number;
  model?: string;
  reviewModel?: string;
  todoPath: string;
};

type Task = {
  id: string;
  title: string;
  block: string;
  lineIndex: number;
};

type ReviewIssue = {
  severity: "blocker" | "major" | "minor";
  file?: string;
  line?: number;
  issue: string;
  fix: string;
};

type ReviewResult = {
  status: "lgtm" | "changes_requested";
  summary: string;
  issues: ReviewIssue[];
  verification: string[];
};

const repoRoot = process.cwd();
const defaultTodoPath = "TODO.md";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(repoRoot, ".agent-runs", runStamp);
const reviewSchemaPath = join(repoRoot, "tools", "review-result.schema.json");
const codexCommand = process.platform === "win32" ? "codex.cmd" : "codex";

const options = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const todoPath = resolve(repoRoot, options.todoPath);

  if (!existsSync(todoPath)) {
    throw new Error(`TODO file not found: ${todoPath}`);
  }

  if (!existsSync(reviewSchemaPath)) {
    throw new Error(`Reviewer schema not found: ${reviewSchemaPath}`);
  }

  for (let completed = 0; completed < options.maxTasks; completed += 1) {
    const todo = readFileSync(todoPath, "utf8");
    const task = findNextTask(todo);

    if (!task) {
      console.log("No unchecked tasks left.");
      return;
    }

    console.log(`\n== ${task.id}: ${task.title}`);

    if (options.dryRun) {
      console.log("Dry run. First unchecked task selected. No agents spawned.");
      return;
    }

    await runBuilder(task);

    let review = await runReviewer(task, 0);
    for (let attempt = 1; review.status === "changes_requested"; attempt += 1) {
      if (attempt > options.maxRepairs) {
        writeReviewResult(task, review, "failed");
        throw new Error(`${task.id} failed review after ${options.maxRepairs} repair attempt(s).`);
      }

      await runRepair(task, review, attempt);
      review = await runReviewer(task, attempt);
    }

    writeReviewResult(task, review, "passed");
    markTaskDone(todoPath, task);
    console.log(`${task.id} marked complete.`);
  }
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {
    dryRun: false,
    maxRepairs: 2,
    maxTasks: 1,
    todoPath: defaultTodoPath,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--all") {
      parsed.maxTasks = Number.MAX_SAFE_INTEGER;
      continue;
    }

    if (arg === "--todo") {
      parsed.todoPath = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--max-tasks") {
      parsed.maxTasks = readPositiveInteger(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--max-repairs") {
      parsed.maxRepairs = readPositiveInteger(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--model") {
      parsed.model = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--review-model") {
      parsed.reviewModel = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function readPositiveInteger(args: string[], index: number, flag: string): number {
  const value = Number(readValue(args, index, flag));

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flag} requires a positive integer.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage: bun run tools/agent-loop.ts -- [options]

Options:
  --todo <path>          TODO file to read. Default: TODO.md
  --max-tasks <count>   Number of tasks to complete. Default: 1
  --all                 Continue until no unchecked tasks remain
  --max-repairs <count> Repair attempts before failing. Default: 2
  --model <model>       Codex model for builder and repair
  --review-model <model> Codex model for reviewer
  --dry-run             Show first selected task without spawning agents
`);
}

function findNextTask(todo: string): Task | undefined {
  const lines = todo.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^- \[ \] (TASK-\d+):\s*(.+)$/);

    if (!match) {
      continue;
    }

    return {
      id: match[1],
      title: match[2].trim(),
      block: readTaskBlock(lines, index),
      lineIndex: index,
    };
  }

  return undefined;
}

function readTaskBlock(lines: string[], startIndex: number): string {
  const block: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const isNextTask = index > startIndex && /^- \[[ xX]\] TASK-\d+:/.test(line);

    if (isNextTask) {
      break;
    }

    block.push(line);
  }

  return block.join("\n").trim();
}

async function runBuilder(task: Task) {
  const prompt = `You are the builder agent for this repository.

Implement exactly this task from TODO.md:

${task.block}

Rules:
- Read the repo before editing.
- Keep changes scoped to this task.
- Preserve existing uncommitted work from earlier completed tasks.
- Follow project instructions from AGENTS.md and .codex/rules.
- Do not mark TODO.md complete. The orchestrator does that after review.
- Do not commit.
- If JavaScript or TypeScript files change, run available verification commands: typecheck, lint, biome, tests, build.
- Final response must include summary, files changed, and verification run.`;

  await runCodex("builder", task, prompt, {
    sandbox: "workspace-write",
    outputLastMessage: true,
  });
}

async function runReviewer(task: Task, attempt: number): Promise<ReviewResult> {
  const prompt = `You are the reviewer agent for this repository.

Review the current uncommitted changes against this task:

${task.block}

Review only for this task. Return "lgtm" only when:
- Acceptance criteria are met.
- Implementation is scoped and maintainable.
- No obvious bugs, regressions, missing states, or missing verification remain.

The worktree may include earlier completed tasks. Do not fail this task for unrelated earlier changes.
If changes are needed, list concrete fix instructions.
Return JSON only matching the provided schema.`;

  const resultPath = await runCodex("reviewer", task, prompt, {
    attempt,
    outputSchema: reviewSchemaPath,
    sandbox: "read-only",
    outputLastMessage: true,
    model: options.reviewModel,
  });

  return parseReviewResult(resultPath);
}

async function runRepair(task: Task, review: ReviewResult, attempt: number) {
  const prompt = `You are the repair agent for this repository.

Fix reviewer feedback for this task:

${task.block}

Reviewer summary:
${review.summary}

Reviewer issues:
${formatIssues(review.issues)}

Rules:
- Change only what is needed to satisfy the reviewer.
- Keep task scope tight.
- Preserve existing uncommitted work from earlier completed tasks.
- Do not mark TODO.md complete.
- Do not commit.
- Run relevant verification after changes.
- Final response must include summary, files changed, and verification run.`;

  await runCodex("repair", task, prompt, {
    attempt,
    sandbox: "workspace-write",
    outputLastMessage: true,
  });
}

function formatIssues(issues: ReviewIssue[]): string {
  if (issues.length === 0) {
    return "- No structured issues supplied. Re-check task acceptance criteria.";
  }

  return issues
    .map((issue, index) => {
      const location = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ""})` : "";
      return `${index + 1}. [${issue.severity}]${location} ${issue.issue}\n   Fix: ${issue.fix}`;
    })
    .join("\n");
}

async function runCodex(
  role: AgentRole,
  task: Task,
  prompt: string,
  settings: {
    attempt?: number;
    model?: string;
    outputLastMessage?: boolean;
    outputSchema?: string;
    sandbox: "read-only" | "workspace-write";
  },
): Promise<string> {
  const attemptSuffix = settings.attempt ? `-${settings.attempt}` : "";
  const baseName = `${task.id}-${role}${attemptSuffix}`;
  const logPath = join(runDir, `${baseName}.log`);
  const lastMessagePath = join(runDir, `${baseName}.last.md`);
  const args = [
    "exec",
    "-C",
    repoRoot,
    "-s",
    settings.sandbox,
    "-a",
    "never",
  ];
  const model = settings.model ?? options.model;

  if (model) {
    args.push("-m", model);
  }

  if (settings.outputSchema) {
    args.push("--output-schema", settings.outputSchema);
  }

  if (settings.outputLastMessage) {
    args.push("-o", lastMessagePath);
  }

  args.push("-");

  console.log(`Running ${role}${attemptSuffix} agent...`);

  await spawnCodex(args, prompt, logPath);

  if (settings.outputLastMessage && !existsSync(lastMessagePath)) {
    throw new Error(`${role} did not write final message: ${lastMessagePath}`);
  }

  return lastMessagePath;
}

async function spawnCodex(args: string[], prompt: string, logPath: string): Promise<void> {
  mkdirSync(dirname(logPath), { recursive: true });

  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(codexCommand, args, {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const logChunks: string[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(text);
      logChunks.push(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      process.stderr.write(text);
      logChunks.push(text);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      writeFileSync(logPath, logChunks.join(""), "utf8");

      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`codex ${args[0]} failed with exit code ${code}. Log: ${logPath}`));
    });

    child.stdin.end(prompt);
  });
}

function parseReviewResult(path: string): ReviewResult {
  const raw = readFileSync(path, "utf8").trim();
  const json = parseJsonObject(raw);

  if (!isReviewResult(json)) {
    throw new Error(`Reviewer returned invalid result: ${path}`);
  }

  return json;
}

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Reviewer output did not contain JSON.");
    }

    return JSON.parse(raw.slice(start, end + 1));
  }
}

function isReviewResult(value: unknown): value is ReviewResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as ReviewResult;

  if (result.status !== "lgtm" && result.status !== "changes_requested") {
    return false;
  }

  if (typeof result.summary !== "string") {
    return false;
  }

  if (!Array.isArray(result.issues) || !Array.isArray(result.verification)) {
    return false;
  }

  return result.issues.every(isReviewIssue) && result.verification.every((item) => typeof item === "string");
}

function isReviewIssue(value: unknown): value is ReviewIssue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const issue = value as ReviewIssue;
  const validSeverity = issue.severity === "blocker" || issue.severity === "major" || issue.severity === "minor";
  const validFile = issue.file === undefined || typeof issue.file === "string";
  const validLine = issue.line === undefined || Number.isInteger(issue.line);

  return validSeverity && validFile && validLine && typeof issue.issue === "string" && typeof issue.fix === "string";
}

function writeReviewResult(task: Task, review: ReviewResult, status: "passed" | "failed") {
  const path = join(runDir, `${task.id}-review-${status}.json`);
  writeFileSync(path, `${JSON.stringify(review, null, 2)}\n`, "utf8");
}

function markTaskDone(todoPath: string, task: Task) {
  const todo = readFileSync(todoPath, "utf8");
  const lines = todo.split(/\r?\n/);
  const line = lines[task.lineIndex];

  if (!line?.startsWith(`- [ ] ${task.id}:`)) {
    throw new Error(`Cannot mark ${task.id} done. TODO line changed.`);
  }

  lines[task.lineIndex] = line.replace("- [ ]", "- [x]");
  writeFileSync(todoPath, lines.join("\n"), "utf8");
}
