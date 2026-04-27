import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";
import { IconSchema } from "../common.js";

export const PageHeaderWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("page-header"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  icon: IconSchema.optional(),
});

export type PageHeaderWidget = z.infer<typeof PageHeaderWidgetSchema>;
