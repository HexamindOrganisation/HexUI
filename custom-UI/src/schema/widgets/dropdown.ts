import type { FromSchema } from "json-schema-to-ts";
import { WidgetBaseProperties } from "../widget-base.js";
import { RefreshSchema } from "../common.js";

/**
 * A single selectable option. Like a `button-group` button, choosing it invokes
 * `action` (with `args`) and then re-pulls any widgets named in `refresh` —
 * which is how a dropdown switches another widget's `data_source` content.
 */
export const DropdownOptionSchema = {
  type: "object",
  properties: {
    label: { type: "string", minLength: 1 },
    /** Stable value for this option (what the <select> binds to). */
    value: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
    args: { type: "object", additionalProperties: true },
    /** Widget names to re-pull after this option's action succeeds. */
    refresh: RefreshSchema,
  },
  required: ["label", "value", "action"],
  additionalProperties: false,
} as const;

export const DropdownWidgetSchema = {
  type: "object",
  properties: {
    ...WidgetBaseProperties,
    type: { const: "dropdown" },
    options: {
      type: "array",
      items: DropdownOptionSchema,
      minItems: 1,
    },
    /**
     * `value` of the option shown as selected initially. Mirror your backend's
     * default state so the bound widget's first `data_source` pull matches.
     * Defaults to the first option.
     */
    default: { type: "string" },
    /** Optional inline label rendered before the select. */
    label: { type: "string" },
    /** Optional disabled placeholder row. */
    placeholder: { type: "string" },
  },
  required: ["name", "type", "size", "options"],
  additionalProperties: false,
} as const;

export type DropdownOption = FromSchema<typeof DropdownOptionSchema>;
export type DropdownWidget = FromSchema<typeof DropdownWidgetSchema>;
