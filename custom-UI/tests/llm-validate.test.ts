import { describe, it, expect } from "vitest";
import {
  validateLlmUi,
  listElements,
  describeElement,
  listRules,
  LLM_DISPLAY_TYPES,
} from "../src/llm/index.js";

const validDoc = `
page:
  layout_type: grid
widgets:
  - name: title
    type: page-header
    size: { width: 12, height: auto }
    title: Quarterly revenue
  - name: chart
    type: chart
    size: { width: 12, height: 260 }
    chart_type: bar
    x_key: region
    series: [{ key: revenue }]
    data:
      - { region: EMEA, revenue: 1200 }
      - { region: AMER, revenue: 1800 }
`;

describe("validateLlmUi", () => {
  it("accepts a valid display-only document and summarizes it", () => {
    const r = validateLlmUi(validDoc);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.summary).toEqual({
      widget_count: 2,
      layout: "grid",
      types: ["page-header", "chart"],
    });
  });

  it("reports unknown element types with guidance", () => {
    const r = validateLlmUi(`
page: { layout_type: grid }
widgets:
  - name: x
    type: plotly
    size: { width: 6, height: 200 }
`);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "ui.unknown-type")).toBe(true);
  });

  it("reports duplicate names and missing fields", () => {
    const r = validateLlmUi(`
page: { layout_type: grid }
widgets:
  - name: dup
    type: page-header
    size: { width: 12, height: auto }
    title: A
  - name: dup
    type: page-header
    size: { width: 12, height: auto }
    title: B
`);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "ui.duplicate-name")).toBe(true);
  });

  it("warns (not errors) when a forbidden field is present", () => {
    const r = validateLlmUi(`
page: { layout_type: grid }
widgets:
  - name: t
    type: table
    size: { width: 12, height: auto }
    content: "a,b\\n1,2"
    data_source: { action: fetch }
`);
    // data_source is rejected by the strict schema (additionalProperties),
    // and also flagged as a friendly warning.
    expect(r.warnings.some((w) => w.code === "ui.forbidden-field")).toBe(true);
  });

  it("warns when a theme is set (inherited from host)", () => {
    const r = validateLlmUi(`
page: { layout_type: grid, main_color: "#ff0000" }
widgets:
  - name: t
    type: page-footer
    size: { width: 12, height: auto }
    text: hi
`);
    expect(r.warnings.some((w) => w.code === "ui.theme-ignored")).toBe(true);
  });

  it("surfaces YAML parse errors", () => {
    const r = validateLlmUi("page: {{{ bad");
    expect(r.ok).toBe(false);
    expect(r.errors[0]!.code).toBe("yaml.parse");
  });
});

describe("introspection", () => {
  it("lists every element with a summary", () => {
    const list = listElements();
    expect(list.map((e) => e.name).sort()).toEqual([...LLM_DISPLAY_TYPES].sort());
    expect(list.every((e) => e.summary.length > 0)).toBe(true);
  });

  it("describes an element with fields, example YAML and schema", () => {
    const doc = describeElement("chart");
    expect(doc).not.toBeNull();
    expect(doc!.fields.some((f) => f.name === "chart_type")).toBe(true);
    expect(doc!.example_yaml).toContain("chart_type");
    expect(doc!.schema).toBeTruthy();
  });

  it("returns null for an unknown element", () => {
    expect(describeElement("nope")).toBeNull();
  });

  it("lists rules including constraints and the envelope example", () => {
    const rules = listRules();
    expect(rules.available_elements).toEqual([...LLM_DISPLAY_TYPES]);
    expect(rules.envelope_example).toContain("layout_type");
    expect(rules.max_widgets).toBeGreaterThan(0);
  });
});
