import { stringify } from "yaml";
import {
  LLM_DISPLAY_TYPES,
  LLM_FORBIDDEN_FIELDS,
  llmDisplaySchemas,
  LLM_ELEMENT_META,
  type LlmDisplayType,
} from "../registry/llm-catalog.js";
import { LLM_MAX_WIDGETS } from "./validate.js";

export interface ElementListing {
  name: LlmDisplayType;
  summary: string;
}

/** One-line catalog of every available element. */
export function listElements(): ElementListing[] {
  return LLM_DISPLAY_TYPES.map((name) => ({
    name,
    summary: LLM_ELEMENT_META[name].summary,
  }));
}

export interface FieldDoc {
  name: string;
  required: boolean;
  /** Human-readable type, e.g. `string`, `integer (1..12)`, `enum: a | b`. */
  type: string;
  /** Constraints not captured by `type`, e.g. minItems. */
  notes?: string;
}

export interface ElementDoc {
  name: LlmDisplayType;
  summary: string;
  fields: FieldDoc[];
  /** A ready-to-paste YAML widget (the first worked example + a `size`). */
  example_yaml: string;
  /** All worked examples as objects. */
  examples: Record<string, unknown>[];
  /** The full restricted JSON Schema, for clients that prefer it. */
  schema: object;
}

/** Detailed spec for one element, derived from its restricted schema. */
export function describeElement(name: string): ElementDoc | null {
  if (!LLM_DISPLAY_TYPES.includes(name as LlmDisplayType)) return null;
  const type = name as LlmDisplayType;
  const schema = llmDisplaySchemas[type] as {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  const required = new Set(schema.required ?? []);
  const props = schema.properties ?? {};

  const fields: FieldDoc[] = Object.entries(props)
    // `name`/`type`/`position`/`size` are layout boilerplate documented in the rules.
    .filter(([k]) => !["position"].includes(k))
    .map(([k, v]) => {
      const { type: t, notes } = describeType(v);
      const field: FieldDoc = { name: k, required: required.has(k), type: t };
      if (notes) field.notes = notes;
      return field;
    });

  const meta = LLM_ELEMENT_META[type];
  const example = { ...meta.examples[0], size: { width: 6, height: "auto" } };

  return {
    name: type,
    summary: meta.summary,
    fields,
    example_yaml: stringify({ widgets: [example] }),
    examples: meta.examples,
    schema,
  };
}

export interface UiRules {
  envelope: string;
  layout: string[];
  sizing: string[];
  constraints: string[];
  forbidden_fields: string[];
  available_elements: string[];
  max_widgets: number;
  envelope_example: string;
}

/** The YAML envelope shape, layout/sizing rules, and display-only constraints. */
export function listRules(): UiRules {
  return {
    envelope:
      "A document has two top-level keys: `page` (required) and `widgets` (a list). Every visible thing is a widget.",
    layout: [
      'page.layout_type is required: "grid" (12-column, packed top-down) or "flex" (stacked in order).',
      "In grid, position.horizontal (left|center|right) and position.vertical (high|middle|low) bias placement.",
      "In flex, position is ignored and widgets stack in document order.",
    ],
    sizing: [
      "Every widget needs a `size: { width, height }`.",
      "size.width is grid columns 1..12 (in flex it becomes a % of the row: 6 → 50%).",
      'size.height is a number of pixels or the string "auto".',
    ],
    constraints: [
      "Display only: no interactions, data fetching, or backend wiring.",
      "No theme — generated UI inherits the host agent's color/mode.",
      "Widget names must be unique within the document.",
      `At most ${LLM_MAX_WIDGETS} widgets per document.`,
    ],
    forbidden_fields: [...LLM_FORBIDDEN_FIELDS],
    available_elements: [...LLM_DISPLAY_TYPES],
    max_widgets: LLM_MAX_WIDGETS,
    envelope_example: stringify({
      page: { layout_type: "grid" },
      widgets: [
        { name: "title", type: "page-header", size: { width: 12, height: "auto" }, title: "Result" },
        {
          name: "chart",
          type: "chart",
          size: { width: 12, height: 260 },
          chart_type: "bar",
          x_key: "label",
          series: [{ key: "value" }],
          data: [{ label: "A", value: 3 }, { label: "B", value: 7 }],
        },
      ],
    }),
  };
}

// ── schema → human type description ─────────────────────────────────────────

interface JsonSchema {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  oneOf?: JsonSchema[];
  pattern?: string;
}

function describeType(v: JsonSchema): { type: string; notes?: string } {
  if (v.const !== undefined) return { type: `const: ${JSON.stringify(v.const)}` };
  if (Array.isArray(v.enum)) {
    return { type: `enum: ${v.enum.map((e) => JSON.stringify(e)).join(" | ")}` };
  }
  if (v.oneOf) {
    return { type: v.oneOf.map((s) => describeType(s).type).join(" | ") };
  }
  if (v.type === "array") {
    const inner = v.items ? describeType(v.items).type : "any";
    const notes = v.minItems ? `at least ${v.minItems} item(s)` : undefined;
    const out: { type: string; notes?: string } = { type: `${inner}[]` };
    if (notes) out.notes = notes;
    return out;
  }
  if (v.type === "object") {
    if (v.properties) {
      const keys = Object.keys(v.properties);
      return { type: `object { ${keys.join(", ")} }` };
    }
    return { type: "object" };
  }
  if (v.type === "integer" || v.type === "number") {
    const bits: string[] = [];
    if (v.minimum !== undefined) bits.push(`min ${v.minimum}`);
    if (v.maximum !== undefined) bits.push(`max ${v.maximum}`);
    const t = bits.length ? `${v.type} (${bits.join(", ")})` : String(v.type);
    return { type: t };
  }
  if (v.type === "string") {
    const bits: string[] = [];
    if (v.minLength) bits.push(`min length ${v.minLength}`);
    if (v.pattern) bits.push(`pattern ${v.pattern}`);
    const out: { type: string; notes?: string } = { type: "string" };
    if (bits.length) out.notes = bits.join(", ");
    return out;
  }
  return { type: typeof v.type === "string" ? v.type : "any" };
}
