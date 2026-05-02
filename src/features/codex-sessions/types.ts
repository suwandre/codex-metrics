export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type CodexJsonlRecordSource = {
  filePath: string;
  lineNumber: number;
  timestamp: string | null;
};

export type CodexGitMetadata = {
  branch: string | null;
  commitHash: string | null;
  repositoryUrl: string | null;
};

export type CodexSessionMetaRecord = {
  kind: "session_meta";
  source: CodexJsonlRecordSource;
  sessionId: string | null;
  startedAt: string | null;
  cwd: string | null;
  originator: string | null;
  cliVersion: string | null;
  sourceName: string | null;
  modelProvider: string | null;
  git: CodexGitMetadata | null;
};

export type CodexTaskStartedRecord = {
  kind: "task_started";
  source: CodexJsonlRecordSource;
  turnId: string | null;
  startedAt: number | null;
  modelContextWindow: number | null;
  collaborationModeKind: string | null;
};

export type CodexTokenUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

export type CodexRateLimitWindow = {
  usedPercent: number | null;
  windowMinutes: number | null;
  resetsAt: number | null;
};

export type CodexRateLimits = {
  limitId: string | null;
  limitName: string | null;
  primary: CodexRateLimitWindow | null;
  secondary: CodexRateLimitWindow | null;
  planType: string | null;
  rateLimitReachedType: string | null;
};

export type CodexTokenCountRecord = {
  kind: "token_count";
  source: CodexJsonlRecordSource;
  totalTokenUsage: CodexTokenUsage | null;
  lastTokenUsage: CodexTokenUsage | null;
  modelContextWindow: number | null;
  rateLimits: CodexRateLimits | null;
};

export type CodexExecCommandEndRecord = {
  kind: "exec_command_end";
  source: CodexJsonlRecordSource;
  callId: string | null;
  turnId: string | null;
  command: string[] | null;
  commandText: string | null;
  cwd: string | null;
  stdout: string | null;
  stderr: string | null;
  aggregatedOutput: string | null;
  formattedOutput: string | null;
  outputText: string | null;
  exitCode: number | null;
  durationMs: number | null;
  status: string | null;
};

export type CodexToolCallRecord = {
  kind: "tool_call";
  source: CodexJsonlRecordSource;
  callType: "custom_tool_call" | "function_call";
  callId: string | null;
  name: string | null;
  status: string | null;
  argumentsText: string | null;
  argumentsJson: JsonObject | null;
  input: string | null;
};

export type CodexToolCallOutputRecord = {
  kind: "tool_call_output";
  source: CodexJsonlRecordSource;
  outputType: "custom_tool_call_output" | "function_call_output";
  callId: string | null;
  status: string | null;
  outputText: string | null;
  outputJson: JsonObject | null;
  metadata: JsonObject | null;
  exitCode: number | null;
  durationMs: number | null;
};

export type CodexWebSearchRecord = {
  kind: "web_search";
  source: CodexJsonlRecordSource;
  eventType: "web_search_call" | "web_search_end";
  callId: string | null;
  status: string | null;
  query: string | null;
  actionType: string | null;
  action: JsonObject | null;
};

export type CodexJsonlRecord =
  | CodexExecCommandEndRecord
  | CodexSessionMetaRecord
  | CodexTaskStartedRecord
  | CodexTokenCountRecord
  | CodexToolCallRecord
  | CodexToolCallOutputRecord
  | CodexWebSearchRecord;

export type CodexJsonlMalformedLine = {
  filePath: string;
  lineNumber: number;
  raw: string;
  message: string;
};

export type CodexJsonlParseResult = {
  records: CodexJsonlRecord[];
  malformedLines: CodexJsonlMalformedLine[];
  ignoredLineCount: number;
};

export type CodexJsonlIngestionResult = CodexJsonlParseResult & {
  files: string[];
};
