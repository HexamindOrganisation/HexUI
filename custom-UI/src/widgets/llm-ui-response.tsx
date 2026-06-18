import { useMemo } from "react";
import type { WidgetProps } from "../registry/types.js";
import type { LlmUiResponseWidget } from "../schema/widgets/llm-ui-response.js";
import { useAgentInbox } from "../runtime/context.js";
import { nullDispatcher } from "../runtime/dispatcher.js";
import { parseYaml } from "../compile/parse.js";
import { compilePlan, type RenderPlan } from "../compile/plan.js";
import { llmDisplayRegistry } from "../registry/llm-display.js";
import { RenderPlanView } from "../components/RenderPlanView.js";
import type { Diagnostic } from "../diagnostics/types.js";

/**
 * Payload routed to this widget by a `ui` native event. Either a raw YAML
 * string, an already-parsed config object, or `{ ui: <string | object> }`.
 */
type UiPayload = string | { ui?: string | object } | Record<string, unknown>;

type CompileState =
  | { kind: "empty" }
  | { kind: "ready"; plan: RenderPlan }
  | { kind: "error"; diagnostics: Diagnostic[] };

function extractConfig(payload: UiPayload | undefined): string | object | null {
  if (payload == null) return null;
  if (typeof payload === "string") return payload;
  if ("ui" in payload && payload.ui != null) return payload.ui as string | object;
  // Treat the payload itself as a config object (has a `page` key).
  if ("page" in payload) return payload as object;
  return null;
}

export function LlmUiResponseWidgetComponent({
  props,
}: WidgetProps<LlmUiResponseWidget>): JSX.Element {
  const { lastPayload } = useAgentInbox<UiPayload>();

  const state = useMemo<CompileState>(() => {
    const config = extractConfig(lastPayload);
    if (config == null) return { kind: "empty" };

    let raw: unknown;
    let locate;
    if (typeof config === "string") {
      const parsed = parseYaml(config);
      if (!parsed.ok) return { kind: "error", diagnostics: parsed.errors };
      raw = parsed.value.data;
      locate = parsed.value.locate;
    } else {
      raw = config;
    }

    const result = compilePlan(raw, {
      registry: llmDisplayRegistry(),
      dispatcher: nullDispatcher,
      ...(locate && { locate }),
    });
    if (!result.ok) return { kind: "error", diagnostics: result.errors };
    return { kind: "ready", plan: result.value };
  }, [lastPayload]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {props.title && (
        <div className="mb-2 text-sm font-medium text-foreground">
          {props.title}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {state.kind === "empty" && (
          <div className="flex min-h-[4rem] items-center justify-center text-sm italic text-muted-foreground">
            {props.empty_text ?? ""}
          </div>
        )}
        {state.kind === "error" && <ErrorView diagnostics={state.diagnostics} />}
        {state.kind === "ready" && (
          <RenderPlanView plan={state.plan} dispatcher={nullDispatcher} />
        )}
      </div>
    </div>
  );
}

/**
 * Defensive: the agent's UI is validated by the MCP before it is emitted, so a
 * compile error here is unexpected. We surface it compactly rather than crash.
 */
function ErrorView({ diagnostics }: { diagnostics: Diagnostic[] }): JSX.Element {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <div className="mb-1 font-medium">Could not render generated UI</div>
      <ul className="list-disc space-y-0.5 pl-4">
        {diagnostics.slice(0, 6).map((d, i) => (
          <li key={i}>
            <span className="font-mono">{d.code}</span>: {d.message}
            {d.sourceLine !== undefined ? ` (line ${d.sourceLine})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
