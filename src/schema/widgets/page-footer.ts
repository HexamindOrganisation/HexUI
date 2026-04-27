import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";

export const PageFooterWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("page-footer"),
  text: z.string().optional(),
});

export type PageFooterWidget = z.infer<typeof PageFooterWidgetSchema>;
