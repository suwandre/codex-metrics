import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  aggregateCodexMetrics,
  readLocalCodexSessions,
  resolveLocalCodexSessionsRoot,
} from "../src/features/codex-sessions";
import type { GeneratedMetricsFile } from "../src/features/command-center/metrics";

type GenerateMetricsFileOptions = {
  outputPath?: string;
  sessionsRoot?: string;
};

export type GenerateMetricsFileResult = {
  file: GeneratedMetricsFile;
  outputPath: string;
};

export async function generateMetricsFile({
  outputPath = resolve(process.cwd(), "public", "metrics.json"),
  sessionsRoot = resolveLocalCodexSessionsRoot(),
}: GenerateMetricsFileOptions = {}): Promise<GenerateMetricsFileResult> {
  const ingestion = await readLocalCodexSessions({ sessionsRoot });
  const metrics = aggregateCodexMetrics(ingestion.records, { recentSessionLimit: 50 });
  const file = {
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
  await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");

  return { file, outputPath };
}
