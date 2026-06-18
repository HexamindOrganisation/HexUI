import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";

export const ContainerToneSchema = {
  enum: ["default", "muted", "card", "accent", "outline"],
} as const;

/**
 * A purely decorative panel — a titled, optionally bordered/tinted box with
 * a short body. Use it to group or caption a region of a generated layout.
 * It does not nest other widgets; grouping is visual, achieved by placing
 * sibling widgets near it in the grid.
 */
export const ContainerWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "container" },
    /** Optional heading shown at the top of the panel. */
    title: { type: "string" },
    /** Optional body text (plain text; not markdown). */
    body: { type: "string" },
    /** Visual treatment of the panel surface. Defaults to "card". */
    tone: ContainerToneSchema,
    /** Horizontal alignment of the content. Defaults to "left". */
    align: { enum: ["left", "center", "right"] },
  },
  required: ["name", "type", "size"],
  additionalProperties: false,
} as const;

export type ContainerTone = FromSchema<typeof ContainerToneSchema>;
export type ContainerWidget = FromSchema<typeof ContainerWidgetSchema>;
