import { z } from "zod";
import { PositionSchema, SizeSchema } from "./common.js";

/**
 * Fields every widget has, regardless of type. Widget-specific schemas
 * extend this via z.object({...}).merge(...) or by reusing the keys.
 */
export const WidgetBaseShape = {
  name: z.string().min(1),
  type: z.string().min(1),
  position: PositionSchema.optional(),
  size: SizeSchema,
  tab: z.string().optional(),
} as const;

export const WidgetBaseSchema = z.object(WidgetBaseShape);
export type WidgetBase = z.infer<typeof WidgetBaseSchema>;
