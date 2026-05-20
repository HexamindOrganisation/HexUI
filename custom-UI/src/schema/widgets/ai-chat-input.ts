import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";

export const AiChatInputWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "ai-chat-input" },
    placeholder: { type: "string" },
    /** Screen-reader label for the send button. Icon is fixed (right arrow). */
    submit_label: { type: "string" },
    rows: { type: "integer", minimum: 1, maximum: 20 },
  },
  required: ["name", "type", "size"],
  additionalProperties: false,
} as const;

export type AiChatInputWidget = FromSchema<typeof AiChatInputWidgetSchema>;
