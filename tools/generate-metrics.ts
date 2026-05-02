import { generateMetricsFile } from "./metrics-file";

const result = await generateMetricsFile();

console.log(
  `Wrote ${result.outputPath} from ${result.file.ingestion.fileCount} files and ${result.file.ingestion.recordCount} records.`,
);
