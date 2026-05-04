import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";
import { DataSourceSchema } from "../common.js";

export const TableModeSchema = z.enum(["head", "tail"]);

export const TableWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("table"),
  /** Inline CSV content. Ignored when `data_source` is set. */
  content: z.string().optional(),
  /**
   * Dispatcher action returning the CSV payload as a string,
   * or `{ csv: string }`, or a 2D array of rows (`string[][]`).
   */
  data_source: DataSourceSchema.optional(),
  /** Whether to take rows from the start (`head`) or end (`tail`). */
  mode: TableModeSchema.optional(),
  /**
   * How many data rows to show. Renamed from "size" to avoid clashing with
   * the widget-base layout `size`. Defaults to 20.
   */
  rows: z.number().int().min(1).max(10_000).optional(),
  /** CSV delimiter. Defaults to auto-detect among `,`, `;`, `\t`. */
  delimiter: z.string().min(1).max(1).optional(),
  /** Treat the first row as a header. Defaults to true. */
  has_header: z.boolean().optional(),
  /** Shown when no source is configured or the payload is empty. */
  empty_text: z.string().optional(),
  /** Shown while data_source is loading and no payload has arrived. */
  loading_text: z.string().optional(),
});

export type TableMode = z.infer<typeof TableModeSchema>;
export type TableWidget = z.infer<typeof TableWidgetSchema>;
