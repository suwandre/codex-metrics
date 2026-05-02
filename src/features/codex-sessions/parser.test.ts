import { describe, expect, test } from "bun:test";
import { readLocalCodexSessions } from "./local";
import { parseCodexJsonl } from "./parser";

describe("Codex JSONL ingestion", () => {
  test("parses aggregation records and keeps malformed lines as diagnostics", () => {
    const result = parseCodexJsonl(
      [
        jsonl({
          timestamp: "2026-05-02T00:00:00.000Z",
          type: "session_meta",
          payload: {
            id: "session-1",
            timestamp: "2026-05-02T00:00:00.000Z",
            cwd: "C:\\repo",
            originator: "codex-tui",
            cli_version: "0.125.0",
            source: "cli",
            model_provider: "openai",
            git: {
              branch: "main",
              commit_hash: "abc123",
              repository_url: "https://github.com/example/repo.git",
            },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:01.000Z",
          type: "event_msg",
          payload: {
            type: "task_started",
            turn_id: "turn-1",
            started_at: 1777746293,
            model_context_window: 258400,
            collaboration_mode_kind: "default",
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:02.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: {
                input_tokens: 100,
                cached_input_tokens: 40,
                output_tokens: 25,
                reasoning_output_tokens: 5,
                total_tokens: 125,
              },
              last_token_usage: {
                input_tokens: 10,
                cached_input_tokens: 4,
                output_tokens: 2,
                reasoning_output_tokens: 1,
                total_tokens: 12,
              },
              model_context_window: 258400,
            },
            rate_limits: {
              limit_id: "codex",
              primary: { used_percent: 20, window_minutes: 300, resets_at: 1777750807 },
              secondary: { used_percent: 4, window_minutes: 10080, resets_at: 1778272734 },
              plan_type: "pro",
            },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:03.000Z",
          type: "event_msg",
          payload: {
            type: "exec_command_end",
            call_id: "call-1",
            turn_id: "turn-1",
            command: "bun run typecheck",
            cwd: "C:\\repo",
            stdout: "ok",
            stderr: "",
            exit_code: 0,
            duration: 123,
            status: "completed",
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:04.000Z",
          type: "response_item",
          payload: {
            type: "function_call",
            call_id: "call-2",
            name: "exec_command",
            arguments: JSON.stringify({ cmd: "bun run lint" }),
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:05.000Z",
          type: "response_item",
          payload: {
            type: "custom_tool_call",
            status: "completed",
            call_id: "call-3",
            name: "apply_patch",
            input: "*** Begin Patch",
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:06.000Z",
          type: "event_msg",
          payload: {
            type: "web_search_end",
            call_id: "web-1",
            query: "codex",
            action: { type: "search" },
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:07.000Z",
          type: "response_item",
          payload: {
            type: "web_search_call",
            status: "completed",
            action: { type: "open_page" },
          },
        }),
        "not-json",
      ].join("\n"),
      "rollout-test.jsonl",
    );

    expect(result.records.map((record) => record.kind)).toEqual([
      "session_meta",
      "task_started",
      "token_count",
      "exec_command_end",
      "tool_call",
      "tool_call",
      "web_search",
      "web_search",
    ]);
    expect(result.malformedLines).toHaveLength(1);
    expect(result.ignoredLineCount).toBe(0);

    const tokenCount = result.records.find((record) => record.kind === "token_count");
    expect(tokenCount?.totalTokenUsage?.cachedInputTokens).toBe(40);
  });

  test("reads rollout JSONL files recursively from a Codex sessions root", async () => {
    const result = await readLocalCodexSessions({
      sessionsRoot: "root",
      fs: {
        async readdir(path) {
          if (path === "root") {
            return [directoryEntry("2026"), fileEntry("notes.jsonl")];
          }

          return [fileEntry("rollout-child.jsonl")];
        },
        async readFile() {
          return jsonl({
            type: "event_msg",
            payload: { type: "task_started", turn_id: "turn-1" },
          });
        },
      },
    });

    expect(result.files).toHaveLength(1);
    expect(result.records.map((record) => record.kind)).toEqual(["task_started"]);
  });

  test("parses real exec command end argv and duration shapes", () => {
    const result = parseCodexJsonl(
      jsonl({
        timestamp: "2026-05-02T00:00:03.000Z",
        type: "event_msg",
        payload: {
          type: "exec_command_end",
          call_id: "call-1",
          turn_id: "turn-1",
          command: ["bun", "run", "typecheck"],
          cwd: "C:\\repo",
          stdout: "ok",
          stderr: "",
          exit_code: 0,
          duration: { secs: 1, nanos: 250_000_000 },
          status: "completed",
        },
      }),
      "rollout-real-exec.jsonl",
    );

    const [record] = result.records;

    expect(record?.kind).toBe("exec_command_end");
    if (record?.kind !== "exec_command_end") {
      return;
    }

    expect(record.command).toEqual(["bun", "run", "typecheck"]);
    expect(record.commandText).toBe("bun run typecheck");
    expect(record.durationMs).toBe(1250);
  });

  test("parses real exec command aggregated output when stdout and stderr are empty", () => {
    const result = parseCodexJsonl(
      jsonl({
        timestamp: "2026-05-02T00:00:03.000Z",
        type: "event_msg",
        payload: {
          type: "exec_command_end",
          call_id: "call-aggregated-output",
          turn_id: "turn-1",
          command: ["bun", "run", "build"],
          cwd: "C:\\repo",
          stdout: "",
          stderr: "",
          aggregated_output: "vite built in 67ms",
          formatted_output: "$ tsc --noEmit && vite build\nvite built in 67ms",
          exit_code: 0,
          duration: { secs: 0, nanos: 670_000_000 },
          status: "completed",
        },
      }),
      "rollout-real-exec-output.jsonl",
    );

    const [record] = result.records;

    expect(record?.kind).toBe("exec_command_end");
    if (record?.kind !== "exec_command_end") {
      return;
    }

    expect(record.stdout).toBe("");
    expect(record.stderr).toBe("");
    expect(record.aggregatedOutput).toBe("vite built in 67ms");
    expect(record.formattedOutput).toBe("$ tsc --noEmit && vite build\nvite built in 67ms");
    expect(record.outputText).toBe("vite built in 67ms");
  });

  test("parses tool call outputs and keeps malformed output as raw text", () => {
    const result = parseCodexJsonl(
      [
        jsonl({
          timestamp: "2026-05-02T00:00:04.000Z",
          type: "response_item",
          payload: {
            type: "function_call_output",
            call_id: "function-output",
            output: JSON.stringify({
              output: "Command failed",
              metadata: { exit_code: 1, duration_seconds: 0.25 },
            }),
          },
        }),
        jsonl({
          timestamp: "2026-05-02T00:00:05.000Z",
          type: "response_item",
          payload: {
            type: "custom_tool_call_output",
            call_id: "custom-output",
            status: "failed",
            output: "apply_patch verification failed: {not-json",
            metadata: { exit_code: 2, duration_ms: 17 },
          },
        }),
      ].join("\n"),
      "rollout-tool-output.jsonl",
    );

    const [functionOutput, customOutput] = result.records;

    expect(functionOutput?.kind).toBe("tool_call_output");
    if (functionOutput?.kind !== "tool_call_output") {
      return;
    }

    expect(functionOutput.outputType).toBe("function_call_output");
    expect(functionOutput.callId).toBe("function-output");
    expect(functionOutput.outputJson?.output).toBe("Command failed");
    expect(functionOutput.exitCode).toBe(1);
    expect(functionOutput.durationMs).toBe(250);

    expect(customOutput?.kind).toBe("tool_call_output");
    if (customOutput?.kind !== "tool_call_output") {
      return;
    }

    expect(customOutput.outputType).toBe("custom_tool_call_output");
    expect(customOutput.callId).toBe("custom-output");
    expect(customOutput.outputText).toBe("apply_patch verification failed: {not-json");
    expect(customOutput.outputJson).toBe(null);
    expect(customOutput.status).toBe("failed");
    expect(customOutput.exitCode).toBe(2);
    expect(customOutput.durationMs).toBe(17);
  });

  test("parses web search call queries from payload and action fixtures", () => {
    const result = parseCodexJsonl(
      [
        jsonl({
          type: "response_item",
          payload: {
            type: "web_search_call",
            call_id: "web-search",
            action: { type: "search", query: "codex jsonl" },
          },
        }),
        jsonl({
          type: "response_item",
          payload: {
            type: "web_search_call",
            call_id: "web-open",
            action: { type: "open", query: "codex docs", url: "https://example.com" },
          },
        }),
        jsonl({
          type: "response_item",
          payload: {
            type: "web_search_call",
            call_id: "web-find",
            query: "payload wins",
            action: { type: "find", query: "action fallback", pattern: "token_count" },
          },
        }),
      ].join("\n"),
      "rollout-web-search.jsonl",
    );

    expect(
      result.records.map((record) => (record.kind === "web_search" ? record.query : null)),
    ).toEqual(["codex jsonl", "codex docs", "payload wins"]);
  });
});

function jsonl(value: unknown) {
  return JSON.stringify(value);
}

function directoryEntry(name: string) {
  return {
    name,
    isDirectory: () => true,
    isFile: () => false,
  };
}

function fileEntry(name: string) {
  return {
    name,
    isDirectory: () => false,
    isFile: () => true,
  };
}
