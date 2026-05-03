import { existsSync, watch } from "node:fs";
import { generateMetricsFile } from "./metrics-file";
import { resolveLocalCodexSessionsRoot } from "../src/features/codex-sessions";

type WatchOptions = {
  debounceMs: number;
  intervalMs: number;
  once: boolean;
};

const options = parseArgs(process.argv.slice(2));
const sessionsRoot = resolveLocalCodexSessionsRoot();
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let isGenerating = false;
let pendingGeneration = false;

await regenerate("initial");

if (options.once) {
  process.exit(0);
}

const watcher = startWatcher();
const interval = setInterval(() => {
  scheduleRegeneration("fallback interval");
}, options.intervalMs);

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(
  `Watching ${sessionsRoot}. Debounce ${options.debounceMs}ms, fallback ${options.intervalMs}ms.`,
);

function parseArgs(args: string[]): WatchOptions {
  const parsed = {
    debounceMs: 500,
    intervalMs: 3_000,
    once: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--once") {
      parsed.once = true;
      continue;
    }

    if (arg === "--debounce-ms") {
      parsed.debounceMs = readPositiveInteger(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--interval-ms") {
      parsed.intervalMs = readPositiveInteger(args, index, arg);
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

function readPositiveInteger(args: string[], index: number, flag: string) {
  const value = Number(args[index + 1]);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flag} requires a positive integer.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage: bun run metrics:watch -- [options]

Options:
  --once                 Generate metrics once, then exit
  --debounce-ms <count>  Debounce file changes. Default: 500
  --interval-ms <count>  Fallback regeneration interval. Default: 3000
`);
}

function startWatcher() {
  if (!existsSync(sessionsRoot)) {
    console.warn(`Sessions root does not exist yet: ${sessionsRoot}. Fallback interval remains active.`);
    return null;
  }

  try {
    return watch(sessionsRoot, { recursive: true }, () => {
      scheduleRegeneration("file change");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not start recursive watcher: ${message}. Fallback interval remains active.`);
    return null;
  }
}

function scheduleRegeneration(reason: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void regenerate(reason);
  }, options.debounceMs);
}

async function regenerate(reason: string) {
  if (isGenerating) {
    pendingGeneration = true;
    return;
  }

  isGenerating = true;

  try {
    const result = await generateMetricsFile({ sessionsRoot });
    console.log(
      `[${new Date().toISOString()}] ${reason}: wrote ${result.outputPath} from ${result.file.ingestion.fileCount} files and ${result.file.ingestion.recordCount} records.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] ${reason}: failed to generate metrics: ${message}`);
  } finally {
    isGenerating = false;

    if (pendingGeneration) {
      pendingGeneration = false;
      scheduleRegeneration("queued change");
    }
  }
}

function stop() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  clearInterval(interval);
  watcher?.close();
  process.exit(0);
}
