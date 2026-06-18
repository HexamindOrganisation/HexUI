import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";
import { DataSourceSchema } from "../common.js";

export const ChartKindSchema = {
  enum: ["bar", "line", "area", "scatter", "pie"],
} as const;

/** One plotted series. For `pie`, exactly one series is used (its `key` is the slice value). */
export const ChartSeriesSchema = {
  type: "object",
  properties: {
    /** Key read from each data row for this series' value. */
    key: { type: "string", minLength: 1 },
    /** Legend label. Defaults to `key`. */
    label: { type: "string" },
    /** Hex color. Defaults to a palette derived from the page accent. */
    color: { type: "string" },
  },
  required: ["key"],
  additionalProperties: false,
} as const;

export const ChartWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "chart" },
    /** Plot kind. */
    chart_type: ChartKindSchema,
    /** Chart heading. */
    title: { type: "string" },
    /**
     * Inline data: an array of flat objects (rows). Each series reads its
     * `key` from every row; `x_key` names the category/x-axis field.
     * Ignored when `data_source` is set.
     */
    data: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    /**
     * Dispatcher action returning the same row array as `data`.
     * (Forbidden in agent-generated UI — display-only there.)
     */
    data_source: DataSourceSchema,
    /** Field naming the category / x-axis value (and pie slice label). */
    x_key: { type: "string", minLength: 1 },
    /** One or more series to plot. */
    series: {
      type: "array",
      items: ChartSeriesSchema,
      minItems: 1,
    },
    /** Stack bars/areas instead of grouping. */
    stacked: { type: "boolean" },
    /** Show the legend. Defaults to true when more than one series. */
    show_legend: { type: "boolean" },
    /** Show background grid lines (cartesian charts). Defaults to true. */
    show_grid: { type: "boolean" },
    /** Shown while data_source is loading and no payload has arrived. */
    loading_text: { type: "string" },
    /** Shown when there is no data. */
    empty_text: { type: "string" },
  },
  required: ["name", "type", "size", "chart_type", "x_key", "series"],
  additionalProperties: false,
} as const;

export type ChartKind = FromSchema<typeof ChartKindSchema>;
export type ChartSeries = FromSchema<typeof ChartSeriesSchema>;
export type ChartWidget = FromSchema<typeof ChartWidgetSchema>;
