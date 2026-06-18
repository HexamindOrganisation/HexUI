/**
 * Pure (component-free) catalog of the display-only elements an agent may
 * author inside an `llm-ui-response` document. This module imports only JSON
 * Schema objects — no React, no widget components — so it can be loaded in a
 * plain Node process (e.g. the UI-generator MCP server) without pulling in the
 * rendering stack.
 *
 * The widget *registry* (schemas bound to components) lives in
 * `llm-display.ts`, which builds on this.
 */
import {
  PageHeaderWidgetSchema,
  PageFooterWidgetSchema,
  ContainerWidgetSchema,
  MarkdownWidgetSchema,
  TableWidgetSchema,
  MetricsWidgetSchema,
  ChartWidgetSchema,
  SpacerWidgetSchema,
} from "../schema/widgets/index.js";

/**
 * Fields stripped from a widget's schema before an agent is allowed to author
 * it. The agent-generated UI is **display only** (spec §1): no interactions, no
 * data fetching, no backend wiring.
 */
export const LLM_FORBIDDEN_FIELDS = [
  "data_source",
  "action",
  "submit_action",
  "refresh",
] as const;

/**
 * Element types an agent may use inside an `llm-ui-response` document. Chat /
 * interactive / shell widgets (`ai-response`, `ai-chat-input`, `tool-calls`,
 * `form`, `button-group`) are intentionally excluded.
 */
export const LLM_DISPLAY_TYPES = [
  "page-header",
  "page-footer",
  "container",
  "markdown",
  "table",
  "metrics",
  "chart",
  "spacer",
] as const;

export type LlmDisplayType = (typeof LLM_DISPLAY_TYPES)[number];

/** Clone a JSON Schema with the given top-level properties removed. */
export function restrictSchema(
  schema: object,
  forbidden: readonly string[],
): object {
  const s = structuredClone(schema) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  if (s.properties) {
    for (const key of forbidden) delete s.properties[key];
  }
  if (Array.isArray(s.required)) {
    s.required = s.required.filter((r) => !forbidden.includes(r));
  }
  return s;
}

/** Canonical schema object per allowed type, before restriction. */
const CANONICAL_SCHEMAS: Record<LlmDisplayType, object> = {
  "page-header": PageHeaderWidgetSchema,
  "page-footer": PageFooterWidgetSchema,
  container: ContainerWidgetSchema,
  markdown: MarkdownWidgetSchema,
  table: TableWidgetSchema,
  metrics: MetricsWidgetSchema,
  chart: ChartWidgetSchema,
  spacer: SpacerWidgetSchema,
};

/** The restricted JSON Schema for one element type (what the MCP introspects). */
export const llmDisplaySchemas: Record<LlmDisplayType, object> =
  Object.fromEntries(
    LLM_DISPLAY_TYPES.map((t) => [
      t,
      restrictSchema(CANONICAL_SCHEMAS[t], LLM_FORBIDDEN_FIELDS),
    ]),
  ) as Record<LlmDisplayType, object>;

/**
 * Human-facing catalog metadata. Element *fields* are read from the (restricted)
 * JSON Schema — this only adds a one-line summary and worked examples, the part
 * a schema can't express. Keyed by element type.
 */
export interface LlmElementMeta {
  summary: string;
  /** Worked examples — each is a complete widget object (sans layout `size`). */
  examples: Record<string, unknown>[];
}

export const LLM_ELEMENT_META: Record<LlmDisplayType, LlmElementMeta> = {
  "page-header": {
    summary: "A bold title with an optional subtitle — caption a section.",
    examples: [
      { type: "page-header", name: "hdr", title: "Q3 Results", subtitle: "Revenue by region" },
    ],
  },
  "page-footer": {
    summary: "A muted footnote line pinned below the generated content.",
    examples: [{ type: "page-footer", name: "ftr", text: "Source: internal data" }],
  },
  container: {
    summary:
      "A decorative titled panel with a short body — group or annotate a region. Esthetic only; it does not nest other elements.",
    examples: [
      { type: "container", name: "note", title: "Takeaway", body: "Sales grew 12% QoQ.", tone: "accent" },
    ],
  },
  markdown: {
    summary: "Rendered markdown: prose, lists, code, tables, math.",
    examples: [
      { type: "markdown", name: "summary", content: "## Summary\n\n- Point one\n- Point two" },
    ],
  },
  table: {
    summary: "A data table from inline CSV content.",
    examples: [
      {
        type: "table",
        name: "rows",
        content: "Region,Revenue\nEMEA,1200\nAMER,1800\nAPAC,900",
      },
    ],
  },
  metrics: {
    summary:
      "A row of KPI stat cards. Note: metrics normally read values from a data_source, which is disabled here — prefer `container` for inline numbers.",
    examples: [
      {
        type: "metrics",
        name: "kpis",
        metrics: [
          { id: "rev", label: "Revenue", format: "currency", prefix: "$" },
          { id: "users", label: "Active users", format: "number" },
        ],
      },
    ],
  },
  chart: {
    summary: "A bar / line / area / scatter / pie chart from inline data rows.",
    examples: [
      {
        type: "chart",
        name: "rev_chart",
        chart_type: "bar",
        title: "Revenue by region",
        x_key: "region",
        series: [{ key: "revenue", label: "Revenue" }],
        data: [
          { region: "EMEA", revenue: 1200 },
          { region: "AMER", revenue: 1800 },
          { region: "APAC", revenue: 900 },
        ],
      },
    ],
  },
  spacer: {
    summary: "An empty cell — reserve space between elements.",
    examples: [{ type: "spacer", name: "gap" }],
  },
};
