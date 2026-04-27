import { z } from "zod";
import { MainMenuItemSchema } from "./common.js";

export const ThemeOverrideSchema = z
  .object({
    background: z.string().optional(),
    foreground: z.string().optional(),
    accent: z.string().optional(),
  })
  .optional();

export const PageSchema = z.object({
  main_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "main_color must be a hex color")
    .optional(),
  layout_type: z.enum(["grid", "flex", "sidebar", "tabs"]),
  theme: ThemeOverrideSchema,
  /** Sidebar-layout menu items. Ignored by other layouts. */
  main_menu: z.array(MainMenuItemSchema).optional(),
});

export type Page = z.infer<typeof PageSchema>;
