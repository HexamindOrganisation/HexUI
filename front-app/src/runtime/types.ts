/**
 * Mirror of the platform-runtime's wire types for the parts this UI consumes.
 * Kept narrow on purpose — extend as new events become user-visible.
 */

export interface AgentCapabilities {
  streaming: boolean;
  tools: boolean;
  state: boolean;
  approvals: boolean;
  multi_turn: boolean;
}

export interface AgentMetadata {
  agent_id: string;
  name: string;
  framework: string;
  version: string;
  description: string;
  capabilities: AgentCapabilities;
  /** UI-triggered action names declared by the agent's manifest. */
  actions: string[];
  extra: Record<string, unknown>;
}

/** One widget-targeted side-effect event emitted by an action handler. */
export interface WidgetEvent {
  widget: string;
  payload: unknown;
}

/** Envelope returned by `POST /agents/{id}/actions/{name}`. */
export interface ActionResult {
  result: unknown;
  events: WidgetEvent[];
}

type BaseEvent = {
  id: string;
  run_id: string;
  ts: string;
  seq: number;
};

export type RuntimeEvent =
  | (BaseEvent & {
      type: "run.started";
      agent_id: string;
      input: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "message.delta";
      message_id: string;
      delta: string;
      role: "assistant";
    })
  | (BaseEvent & {
      type: "message.completed";
      message_id: string;
      role: "assistant" | "user" | "system" | "tool";
      content: string;
      metadata: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "tool.start";
      tool_call_id: string;
      name: string;
      arguments: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "tool.end";
      tool_call_id: string;
      name: string;
      output: unknown;
      error: string | null;
    })
  | (BaseEvent & {
      type: "state.update";
      key: string;
      value: unknown;
    })
  | (BaseEvent & {
      type: "trace.span";
      span_id: string;
      parent_span_id: string | null;
      name: string;
      start_ts: string;
      end_ts: string | null;
      attributes: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "approval.requested";
      approval_id: string;
      reason: string;
      payload: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "error";
      message: string;
      recoverable: boolean;
      details: Record<string, unknown>;
    })
  | (BaseEvent & {
      type: "run.completed";
      agent_id: string;
      output: unknown;
    });
