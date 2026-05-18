import type { AgentBridge, AgentEvent } from "agent-ui";
import { cancelRun } from "./api.js";
import { streamRun } from "./sseStream.js";
import type { RuntimeEvent } from "./types.js";

/**
 * Implements `agent-ui`'s `AgentBridge` interface against the platform
 * runtime's HTTP+SSE API.
 *
 * Event translation
 * -----------------
 * The runtime emits a richer, closed-set event vocabulary
 * (message.delta, tool.start, state.update, trace.span, …).
 * `agent-ui` consumes a smaller set (token, message, status, error).
 * This bridge is the translation seam — every runtime event becomes
 * zero or one `AgentEvent`.
 *
 *   runtime                    agent-ui
 *   ─────────────────          ─────────────────
 *   run.started        →       status: thinking
 *   message.delta      →       token
 *   message.completed  →       message (assistant)
 *   tool.start         →       message (system, "[tool] X(args)")
 *   tool.end           →       message (system, "[result] X → output")
 *   error              →       error (or system "Run cancelled" if details.cancelled)
 *   run.completed      →       status: idle
 *
 * Cancellation
 * ------------
 * Holds the current run's id + an AbortController. `cancel()` calls the
 * runtime's POST /runs/{run_id}/cancel and also aborts the fetch — the
 * latter is a fallback for the case where the runtime has already
 * disconnected.
 */
export class RuntimeBridge implements AgentBridge {
  private listeners = new Set<(event: AgentEvent) => void>();
  private currentRunId: string | null = null;
  private currentAbort: AbortController | null = null;

  constructor(
    private readonly agentId: string,
    private readonly framework: string,
  ) {}

  subscribeAgentOutput = (cb: (event: AgentEvent) => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  onUserSubmit = async (text: string): Promise<void> => {
    if (this.currentRunId) {
      // Already streaming. Ignore the second submit; the UI cancel button
      // is the right way to stop the current run before a new one.
      return;
    }

    const runId = crypto.randomUUID();
    const controller = new AbortController();
    this.currentRunId = runId;
    this.currentAbort = controller;

    this.emit({ kind: "status", state: "thinking" });

    try {
      const body = {
        input: this.buildInput(text),
        run_id: runId,
      };

      for await (const event of streamRun(this.agentId, body, controller.signal)) {
        this.translate(event);
      }
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (!isAbort) {
        const message = e instanceof Error ? e.message : String(e);
        this.emit({ kind: "error", message });
      }
    } finally {
      this.emit({ kind: "status", state: "idle" });
      this.currentRunId = null;
      this.currentAbort = null;
    }
  };

  /** Cancel the in-flight run, if any. Returns true if a cancel was sent. */
  cancel = async (): Promise<boolean> => {
    const runId = this.currentRunId;
    if (!runId) return false;
    try {
      await cancelRun(this.agentId, runId);
    } catch (e) {
      // Even if the HTTP call fails, abort the local stream so the user
      // is freed from the spinner.
      this.emit({
        kind: "error",
        message: `Cancel failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
    // Belt-and-braces: also abort the in-flight fetch. The runtime will
    // see the disconnect and stop emitting.
    this.currentAbort?.abort();
    return true;
  };

  // ---- internal ----------------------------------------------------------

  private buildInput(text: string): unknown {
    // The HTTP `input` field is adapter-specific by design. LangChain-family
    // agents expect a chat-history shape; OpenAI Agents and Google ADK take
    // a raw string. We branch on the manifest's framework value (already
    // fetched at App startup).
    switch (this.framework) {
      case "langchain":
      case "langgraph":
      case "deepagents":
        return { messages: [{ role: "user", content: text }] };
      default:
        return text;
    }
  }

  private translate(event: RuntimeEvent): void {
    switch (event.type) {
      case "run.started":
        // status already emitted in onUserSubmit; nothing more to surface.
        return;

      case "message.delta":
        this.emit({
          kind: "token",
          text: event.delta,
          messageId: event.message_id,
        });
        return;

      case "message.completed":
        // The library expects only "assistant" or "system" — collapse the
        // other roles into system so they still show up.
        this.emit({
          kind: "message",
          role: event.role === "assistant" ? "assistant" : "system",
          content: event.content,
          messageId: event.message_id,
        });
        return;

      case "tool.start": {
        const args = JSON.stringify(event.arguments);
        this.emit({
          kind: "message",
          role: "system",
          content: `[tool] ${event.name}(${args})`,
        });
        return;
      }

      case "tool.end": {
        const out = formatToolOutput(event.output);
        this.emit({
          kind: "message",
          role: "system",
          content: `[result] ${event.name} -> ${out}`,
        });
        return;
      }

      case "state.update":
        // Useful but noisy in chat; render only multi-agent handoffs.
        if (event.key === "active_agent") {
          this.emit({
            kind: "message",
            role: "system",
            content: `[active agent] ${String(event.value)}`,
          });
        }
        return;

      case "error":
        if (event.details && event.details.cancelled === true) {
          this.emit({
            kind: "message",
            role: "system",
            content: "Run cancelled.",
          });
        } else {
          this.emit({ kind: "error", message: event.message });
        }
        return;

      case "run.completed":
        // status: idle is emitted in onUserSubmit's finally.
        return;

      // trace.span / approval.requested: not surfaced in chat for v0.
      default:
        return;
    }
  }

  private emit(event: AgentEvent): void {
    for (const cb of this.listeners) cb(event);
  }
}

function formatToolOutput(output: unknown): string {
  if (output === null || output === undefined) return "";
  if (typeof output === "string") return output;
  try {
    const s = JSON.stringify(output);
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  } catch {
    return String(output);
  }
}
