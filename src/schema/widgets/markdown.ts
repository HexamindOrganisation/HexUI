import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";
import { DataSourceSchema } from "../common.js";

export const MarkdownWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("markdown"),
  /** Inline markdown content. Mutually exclusive with `data_source`. */
  content: z.string().optional(),
  /** Fetch markdown text dynamically; the resolved value must be a string. */
  data_source: DataSourceSchema.optional(),
  /** Text shown while loading or when content is empty. */
  empty_text: z.string().optional(),
});

export type MarkdownWidget = z.infer<typeof MarkdownWidgetSchema>;
