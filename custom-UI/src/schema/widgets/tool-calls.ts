import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";

/**
 * Payload shape the `tool-calls` widget consumes from its `useAgentInbox`.
 *
 * Two phases are routed as separate payloads with a shared `id`:
 *   - `phase: "start"` opens a row.
 *   - `phase: "end"` finalizes that row (output or error).
 *
 * The widget reduces the inbox history into one entry per id. Emitting
 * an `end` without a prior `start` is tolerated (the widget renders a
 * one-shot completed entry).
 */
export type ToolCallStartPayload = {
  phase: "start";
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
};

export type ToolCallEndPayload = {
  phase: "end";
  id: string;
  /** Optional — clients may omit when they only know the id at end time. */
  name?: string;
  output?: unknown;
  error?: string | null;
};

export type ToolCallPayload = ToolCallStartPayload | ToolCallEndPayload;

export const ToolCallsWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "tool-calls" },
    /** Header label above the list. */
    title: { type: "string" },
    /** Shown when no tool calls have arrived yet. */
    empty_text: { type: "string" },
    /** Hard cap on entries shown (oldest dropped). Default unlimited. */
    max_items: { type: "integer", minimum: 1 },
    /** If true, each entry starts expanded with args + output visible. */
    default_expanded: { type: "boolean" },
  },
  required: ["name", "type", "size"],
  additionalProperties: false,
} as const;

export type ToolCallsWidget = FromSchema<typeof ToolCallsWidgetSchema>;
