import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";

export const AiChatInputWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("ai-chat-input"),
  placeholder: z.string().optional(),
  submit_label: z.string().optional(),
  rows: z.number().int().min(1).max(20).optional(),
});

export type AiChatInputWidget = z.infer<typeof AiChatInputWidgetSchema>;
