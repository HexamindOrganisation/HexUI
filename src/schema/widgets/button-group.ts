import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";

export const ButtonVariantSchema = z.enum([
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
]);

export const ButtonSizeSchema = z.enum(["default", "sm", "lg", "icon"]);

export const ButtonGroupItemSchema = z.object({
  label: z.string().min(1),
  action: z.string().min(1),
  args: z.record(z.unknown()).optional(),
  variant: ButtonVariantSchema.optional(),
  size: ButtonSizeSchema.optional(),
  disabled: z.boolean().optional(),
});

export const ButtonGroupWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("button-group"),
  buttons: z.array(ButtonGroupItemSchema).min(1),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
});

export type ButtonVariant = z.infer<typeof ButtonVariantSchema>;
export type ButtonSize = z.infer<typeof ButtonSizeSchema>;
export type ButtonGroupItem = z.infer<typeof ButtonGroupItemSchema>;
export type ButtonGroupWidget = z.infer<typeof ButtonGroupWidgetSchema>;
