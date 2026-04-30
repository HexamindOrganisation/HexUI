import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";
import { DataSourceSchema, IconSchema } from "../common.js";

export const MetricFormatSchema = z.enum([
  "number",
  "percent",
  "currency",
  "duration",
  "bytes",
  "string",
]);

export const MetricSpecSchema = z.object({
  id: z.string().min(1).describe("Key looked up in the data_source payload"),
  label: z.string().min(1),
  format: MetricFormatSchema.optional(),
  /** Decimal places for numeric formats. */
  precision: z.number().int().min(0).max(10).optional(),
  /** Prepended to the formatted value (e.g. "$"). */
  prefix: z.string().optional(),
  /** Appended to the formatted value (e.g. " req/s"). */
  suffix: z.string().optional(),
  /** Optional muted line under the value. Overridden by payload `hint`. */
  hint: z.string().optional(),
  icon: IconSchema.optional(),
});

export const MetricsWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("metrics"),
  metrics: z.array(MetricSpecSchema).min(1),
  /**
   * Dispatcher action returning a record keyed by each metric's `id`.
   * If `subscribe: true` and the dispatcher supports it, values update live.
   */
  data_source: DataSourceSchema.optional(),
  /** Number of columns on wide screens (1–6). Otherwise flex-wraps. */
  columns: z.number().int().min(1).max(6).optional(),
  /** Shown while data_source is loading and no payload has arrived. */
  loading_text: z.string().optional(),
  /** Shown when there is no data_source or the payload is empty. */
  empty_text: z.string().optional(),
});

export type MetricFormat = z.infer<typeof MetricFormatSchema>;
export type MetricSpec = z.infer<typeof MetricSpecSchema>;
export type MetricsWidget = z.infer<typeof MetricsWidgetSchema>;
