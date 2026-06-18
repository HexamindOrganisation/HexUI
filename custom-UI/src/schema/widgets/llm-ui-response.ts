import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";

/**
 * Host widget for agent-authored UI. It renders no static content of its own;
 * instead it receives a validated, display-only UI document on the run stream
 * (a `ui` native event routed to this widget by name) and compiles + renders it
 * inside itself, inheriting the host page theme.
 */
export const LlmUiResponseWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "llm-ui-response" },
    /** Shown before the agent has emitted any UI. */
    empty_text: { type: "string" },
    /** Heading rendered above the generated UI. */
    title: { type: "string" },
  },
  required: ["name", "type", "size"],
  additionalProperties: false,
} as const;

export type LlmUiResponseWidget = FromSchema<typeof LlmUiResponseWidgetSchema>;
