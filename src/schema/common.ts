import { z } from "zod";

export const IconSchema = z
  .string()
  .describe("Icon URL or data URI");

export const ActionSchema = z
  .string()
  .min(1)
  .describe("Action name dispatched to the host");

export const PositionSchema = z.object({
  horizontal: z.enum(["left", "right", "center"]).optional(),
  vertical: z.enum(["high", "low", "middle"]).optional(),
});

export const SizeSchema = z.object({
  width: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe("Grid columns (1-12); ignored by non-grid layouts"),
  height: z.union([z.number().positive(), z.literal("auto")]),
});

export const MainMenuItemSchema = z.object({
  name: z.string().min(1),
  icon: IconSchema.optional(),
  action: ActionSchema,
});

export const DataSourceSchema = z.object({
  action: ActionSchema,
  args: z.record(z.unknown()).optional(),
  subscribe: z.boolean().optional(),
});

export type Position = z.infer<typeof PositionSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type MainMenuItem = z.infer<typeof MainMenuItemSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
