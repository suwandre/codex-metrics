import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCodexJsonl } from "./parser";
import type { CodexJsonlIngestionResult, CodexJsonlMalformedLine, CodexJsonlRecord } from "./types";

type DirectoryEntry = {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
};

type CodexSessionFileSystem = {
  readdir(path: string, options: { withFileTypes: true }): Promise<DirectoryEntry[]>;
  readFile(path: string, encoding: "utf8"): Promise<string>;
};

type ReadLocalCodexSessionsOptions = {
  sessionsRoot?: string;
  userProfile?: string;
  fs?: CodexSessionFileSystem;
};

declare const process: {
  env: Record<string, string | undefined>;
};

const rolloutFilePattern = /^rollout-.*\.jsonl$/;

export async function readLocalCodexSessions(
  options: ReadLocalCodexSessionsOptions = {},
): Promise<CodexJsonlIngestionResult> {
  const fileSystem = options.fs ?? { readdir, readFile };
  const sessionsRoot = resolveSessionsRoot(options);
  const files = await collectRolloutFiles(sessionsRoot, fileSystem);
  const records: CodexJsonlRecord[] = [];
  const malformedLines: CodexJsonlMalformedLine[] = [];
  let ignoredLineCount = 0;

  for (const filePath of files) {
    const text = await fileSystem.readFile(filePath, "utf8");
    const parsed = parseCodexJsonl(text, filePath);

    records.push(...parsed.records);
    malformedLines.push(...parsed.malformedLines);
    ignoredLineCount += parsed.ignoredLineCount;
  }

  return {
    files,
    records,
    malformedLines,
    ignoredLineCount,
  };
}

export function resolveLocalCodexSessionsRoot(
  userProfile = process.env.USERPROFILE ?? process.env.HOME,
) {
  if (!userProfile) {
    throw new Error("Cannot resolve Codex sessions path: USERPROFILE and HOME are not set.");
  }

  return join(userProfile, ".codex", "sessions");
}

async function collectRolloutFiles(
  root: string,
  fileSystem: CodexSessionFileSystem,
): Promise<string[]> {
  const files: string[] = [];

  await walkCodexSessions(root, fileSystem, files);

  return files.sort();
}

async function walkCodexSessions(
  directory: string,
  fileSystem: CodexSessionFileSystem,
  files: string[],
) {
  const entries = await readDirectoryOrEmpty(directory, fileSystem);

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkCodexSessions(entryPath, fileSystem, files);
      continue;
    }

    if (entry.isFile() && rolloutFilePattern.test(entry.name)) {
      files.push(entryPath);
    }
  }
}

async function readDirectoryOrEmpty(directory: string, fileSystem: CodexSessionFileSystem) {
  try {
    return await fileSystem.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    throw error;
  }
}

function resolveSessionsRoot(options: ReadLocalCodexSessionsOptions) {
  if (options.sessionsRoot) {
    return options.sessionsRoot;
  }

  return resolveLocalCodexSessionsRoot(options.userProfile);
}

function isMissingPathError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
