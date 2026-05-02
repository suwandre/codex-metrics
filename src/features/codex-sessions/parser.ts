import type {
  CodexExecCommandEndRecord,
  CodexJsonlMalformedLine,
  CodexJsonlParseResult,
  CodexJsonlRecord,
  CodexJsonlRecordSource,
  CodexRateLimits,
  CodexSessionMetaRecord,
  CodexTaskStartedRecord,
  CodexTokenCountRecord,
  CodexTokenUsage,
  CodexToolCallOutputRecord,
  CodexToolCallRecord,
  CodexWebSearchRecord,
  JsonObject,
  JsonValue,
} from "./types";

type RawCodexJsonlLine = {
  timestamp?: unknown;
  type?: unknown;
  payload?: unknown;
};

export function parseCodexJsonl(text: string, filePath = ""): CodexJsonlParseResult {
  const records: CodexJsonlRecord[] = [];
  const malformedLines: CodexJsonlMalformedLine[] = [];
  let ignoredLineCount = 0;

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;

    if (!line.trim()) {
      continue;
    }

    const parsedLine = parseJsonObject(line);

    if (!parsedLine) {
      malformedLines.push({
        filePath,
        lineNumber,
        raw: line,
        message: "Line is not valid JSON object.",
      });
      continue;
    }

    const source = readSource(parsedLine, filePath, lineNumber);
    const record = parseCodexRecord(parsedLine, source);

    if (!record) {
      ignoredLineCount += 1;
      continue;
    }

    records.push(record);
  }

  return { records, malformedLines, ignoredLineCount };
}

function parseCodexRecord(
  line: RawCodexJsonlLine,
  source: CodexJsonlRecordSource,
): CodexJsonlRecord | null {
  if (line.type === "session_meta") {
    return parseSessionMeta(line.payload, source);
  }

  if (line.type === "event_msg") {
    return parseEventMessage(line.payload, source);
  }

  if (line.type === "response_item") {
    return parseResponseItem(line.payload, source);
  }

  return null;
}

function parseEventMessage(
  payload: unknown,
  source: CodexJsonlRecordSource,
): CodexJsonlRecord | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  if (payload.type === "task_started") {
    return parseTaskStarted(payload, source);
  }

  if (payload.type === "token_count") {
    return parseTokenCount(payload, source);
  }

  if (payload.type === "exec_command_end") {
    return parseExecCommandEnd(payload, source);
  }

  if (payload.type === "web_search_end") {
    return parseWebSearchEnd(payload, source);
  }

  return null;
}

function parseResponseItem(
  payload: unknown,
  source: CodexJsonlRecordSource,
): CodexJsonlRecord | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  if (payload.type === "function_call") {
    return parseFunctionCall(payload, source);
  }

  if (payload.type === "custom_tool_call") {
    return parseCustomToolCall(payload, source);
  }

  if (payload.type === "function_call_output") {
    return parseToolCallOutput(payload, source, "function_call_output");
  }

  if (payload.type === "custom_tool_call_output") {
    return parseToolCallOutput(payload, source, "custom_tool_call_output");
  }

  if (payload.type === "web_search_call") {
    return parseWebSearchCall(payload, source);
  }

  return null;
}

function parseSessionMeta(
  payload: unknown,
  source: CodexJsonlRecordSource,
): CodexSessionMetaRecord | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  return {
    kind: "session_meta",
    source,
    sessionId: stringOrNull(payload.id),
    startedAt: stringOrNull(payload.timestamp),
    cwd: stringOrNull(payload.cwd),
    originator: stringOrNull(payload.originator),
    cliVersion: stringOrNull(payload.cli_version),
    sourceName: stringOrNull(payload.source),
    model:
      stringOrNull(payload.model) ??
      stringOrNull(payload.model_slug) ??
      stringOrNull(payload.model_id) ??
      stringOrNull(payload.model_name),
    modelProvider: stringOrNull(payload.model_provider),
    git: parseGit(payload.git),
  };
}

function parseTaskStarted(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexTaskStartedRecord {
  return {
    kind: "task_started",
    source,
    turnId: stringOrNull(payload.turn_id),
    startedAt: numberOrNull(payload.started_at),
    modelContextWindow: numberOrNull(payload.model_context_window),
    collaborationModeKind: stringOrNull(payload.collaboration_mode_kind),
  };
}

function parseTokenCount(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexTokenCountRecord {
  const info = isJsonObject(payload.info) ? payload.info : null;

  return {
    kind: "token_count",
    source,
    totalTokenUsage: parseTokenUsage(info?.total_token_usage),
    lastTokenUsage: parseTokenUsage(info?.last_token_usage),
    modelContextWindow: numberOrNull(info?.model_context_window),
    rateLimits: parseRateLimits(payload.rate_limits),
  };
}

function parseExecCommandEnd(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexExecCommandEndRecord {
  const command = stringArrayOrNull(payload.command);
  const stdout = stringOrNull(payload.stdout);
  const stderr = stringOrNull(payload.stderr);
  const aggregatedOutput = stringOrNull(payload.aggregated_output);
  const formattedOutput = stringOrNull(payload.formatted_output);

  return {
    kind: "exec_command_end",
    source,
    callId: stringOrNull(payload.call_id),
    turnId: stringOrNull(payload.turn_id),
    command,
    commandText: command?.join(" ") ?? stringOrNull(payload.command),
    cwd: stringOrNull(payload.cwd),
    stdout,
    stderr,
    aggregatedOutput,
    formattedOutput,
    outputText: firstNonEmptyString(stdout, stderr, aggregatedOutput, formattedOutput),
    exitCode: numberOrNull(payload.exit_code),
    durationMs: durationMsOrNull(payload.duration),
    status: stringOrNull(payload.status),
  };
}

function parseFunctionCall(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexToolCallRecord {
  const argumentsText = stringOrNull(payload.arguments);

  return {
    kind: "tool_call",
    source,
    callType: "function_call",
    callId: stringOrNull(payload.call_id),
    name: stringOrNull(payload.name),
    status: stringOrNull(payload.status),
    argumentsText,
    argumentsJson: argumentsText ? parseJsonObject(argumentsText) : null,
    input: null,
  };
}

function parseCustomToolCall(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexToolCallRecord {
  return {
    kind: "tool_call",
    source,
    callType: "custom_tool_call",
    callId: stringOrNull(payload.call_id),
    name: stringOrNull(payload.name),
    status: stringOrNull(payload.status),
    argumentsText: null,
    argumentsJson: null,
    input: stringOrNull(payload.input),
  };
}

function parseToolCallOutput(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
  outputType: CodexToolCallOutputRecord["outputType"],
): CodexToolCallOutputRecord {
  const outputText = stringOrNull(payload.output);
  const outputJson = outputText ? parseJsonObject(outputText) : null;
  const metadata = parseToolCallOutputMetadata(payload, outputJson);

  return {
    kind: "tool_call_output",
    source,
    outputType,
    callId: stringOrNull(payload.call_id),
    status: stringOrNull(payload.status),
    outputText,
    outputJson,
    metadata,
    exitCode: parseToolCallOutputExitCode(payload, metadata),
    durationMs: parseToolCallOutputDurationMs(payload, metadata),
  };
}

function parseWebSearchEnd(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexWebSearchRecord {
  const action = parseAction(payload.action);

  return {
    kind: "web_search",
    source,
    eventType: "web_search_end",
    callId: stringOrNull(payload.call_id),
    status: stringOrNull(payload.status),
    query: stringOrNull(payload.query),
    actionType: stringOrNull(action?.type),
    action,
  };
}

function parseWebSearchCall(
  payload: JsonObject,
  source: CodexJsonlRecordSource,
): CodexWebSearchRecord {
  const action = parseAction(payload.action);

  return {
    kind: "web_search",
    source,
    eventType: "web_search_call",
    callId: stringOrNull(payload.call_id),
    status: stringOrNull(payload.status),
    query: stringOrNull(payload.query) ?? stringOrNull(action?.query),
    actionType: stringOrNull(action?.type),
    action,
  };
}

function parseTokenUsage(value: unknown): CodexTokenUsage | null {
  if (!isJsonObject(value)) {
    return null;
  }

  return {
    inputTokens: numberOrZero(value.input_tokens),
    cachedInputTokens: numberOrZero(value.cached_input_tokens),
    outputTokens: numberOrZero(value.output_tokens),
    reasoningOutputTokens: numberOrZero(value.reasoning_output_tokens),
    totalTokens: numberOrZero(value.total_tokens),
  };
}

function parseRateLimits(value: unknown): CodexRateLimits | null {
  if (!isJsonObject(value)) {
    return null;
  }

  return {
    limitId: stringOrNull(value.limit_id),
    limitName: stringOrNull(value.limit_name),
    primary: parseRateLimitWindow(value.primary),
    secondary: parseRateLimitWindow(value.secondary),
    planType: stringOrNull(value.plan_type),
    rateLimitReachedType: stringOrNull(value.rate_limit_reached_type),
  };
}

function parseRateLimitWindow(value: unknown) {
  if (!isJsonObject(value)) {
    return null;
  }

  return {
    usedPercent: numberOrNull(value.used_percent),
    windowMinutes: numberOrNull(value.window_minutes),
    resetsAt: numberOrNull(value.resets_at),
  };
}

function parseGit(value: unknown) {
  if (!isJsonObject(value)) {
    return null;
  }

  return {
    branch: stringOrNull(value.branch),
    commitHash: stringOrNull(value.commit_hash),
    repositoryUrl: stringOrNull(value.repository_url),
  };
}

function parseAction(value: unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

function parseToolCallOutputMetadata(
  payload: JsonObject,
  outputJson: JsonObject | null,
): JsonObject | null {
  if (isJsonObject(payload.metadata)) {
    return payload.metadata;
  }

  if (isJsonObject(outputJson?.metadata)) {
    return outputJson.metadata;
  }

  return null;
}

function parseToolCallOutputExitCode(
  payload: JsonObject,
  metadata: JsonObject | null,
): number | null {
  return numberOrNull(payload.exit_code) ?? numberOrNull(metadata?.exit_code);
}

function parseToolCallOutputDurationMs(
  payload: JsonObject,
  metadata: JsonObject | null,
): number | null {
  const durationMs =
    numberOrNull(payload.duration_ms) ??
    numberOrNull(metadata?.duration_ms) ??
    durationMsOrNull(payload.duration) ??
    durationMsOrNull(metadata?.duration);

  if (durationMs !== null) {
    return durationMs;
  }

  const durationSeconds =
    numberOrNull(payload.duration_seconds) ?? numberOrNull(metadata?.duration_seconds);

  return durationSeconds === null ? null : durationSeconds * 1000;
}

function readSource(
  line: RawCodexJsonlLine,
  filePath: string,
  lineNumber: number,
): CodexJsonlRecordSource {
  return {
    filePath,
    lineNumber,
    timestamp: stringOrNull(line.timestamp),
  };
}

function parseJsonObject(raw: string): JsonObject | null {
  try {
    const parsed: JsonValue = JSON.parse(raw);
    return isJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function stringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.every((item) => typeof item === "string") ? value : null;
}

function firstNonEmptyString(...values: Array<string | null>) {
  return values.find((value) => value !== null && value.length > 0) ?? null;
}

function durationMsOrNull(value: unknown): number | null {
  const durationMs = numberOrNull(value);

  if (durationMs !== null) {
    return durationMs;
  }

  if (!isJsonObject(value)) {
    return null;
  }

  const secs = numberOrNull(value.secs);
  const nanos = numberOrNull(value.nanos);

  if (secs === null || nanos === null) {
    return null;
  }

  return secs * 1000 + nanos / 1_000_000;
}
