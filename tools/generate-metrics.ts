import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  aggregateCodexMetrics,
  readLocalCodexSessions,
  resolveLocalCodexSessionsRoot,
} from "../src/features/codex-sessions";
import type { GeneratedMetricsFile } from "../src/features/command-center/metrics";

const outputPath = resolve(process.cwd(), "public", "metrics.json");
const sessionsRoot = resolveLocalCodexSessionsRoot();
const ingestion = await readLocalCodexSessions({ sessionsRoot });
const metrics = aggregateCodexMetrics(ingestion.records, { recentSessionLimit: 50 });

const generatedMetrics = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  ingestion: {
    sessionsRoot,
    fileCount: ingestion.files.length,
    recordCount: ingestion.records.length,
    malformedLineCount: ingestion.malformedLines.length,
    ignoredLineCount: ingestion.ignoredLineCount,
  },
  metrics,
} satisfies GeneratedMetricsFile;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(generatedMetrics, null, 2)}\n`, "utf8");

console.log(
  `Wrote public/metrics.json from ${ingestion.files.length} files and ${ingestion.records.length} records.`,
);
