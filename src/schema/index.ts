import { z } from "zod";
import { PageSchema } from "./page.js";
import { BuiltinWidgetUnion } from "./widgets/index.js";

export * from "./common.js";
export * from "./page.js";
export * from "./widget-base.js";
export * from "./widgets/index.js";

/**
 * Root config schema with only the built-in widgets. For host-defined
 * widgets, build a registry-aware schema via `buildConfigSchema(registry)`.
 */
export const ConfigSchema = z.object({
  page: PageSchema,
  widgets: z.array(BuiltinWidgetUnion).default([]),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Construct a Config schema with a dynamically-assembled widgets union
 * that includes custom widgets from the host registry.
 */
export function buildConfigSchema(
  widgetSchemas: readonly z.ZodTypeAny[],
): z.ZodType<{ page: z.infer<typeof PageSchema>; widgets: unknown[] }> {
  if (widgetSchemas.length < 2) {
    // Discriminated unions need 2+ members. Fall back to passthrough if fewer.
    const only = widgetSchemas[0] ?? z.any();
    return z.object({
      page: PageSchema,
      widgets: z.array(only).default([]),
    }) as unknown as z.ZodType<{
      page: z.infer<typeof PageSchema>;
      widgets: unknown[];
    }>;
  }
  const union = z.discriminatedUnion(
    "type",
    widgetSchemas as unknown as [z.ZodDiscriminatedUnionOption<"type">, ...z.ZodDiscriminatedUnionOption<"type">[]],
  );
  return z.object({
    page: PageSchema,
    widgets: z.array(union).default([]),
  }) as unknown as z.ZodType<{
    page: z.infer<typeof PageSchema>;
    widgets: unknown[];
  }>;
}
