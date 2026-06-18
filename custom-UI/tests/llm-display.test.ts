import { describe, it, expect } from "vitest";
import {
  compilePlan,
  llmDisplayRegistry,
  llmDisplaySchemas,
  LLM_DISPLAY_TYPES,
  LLM_ELEMENT_META,
} from "../src/index.js";

const registry = () => llmDisplayRegistry();

describe("llm display registry", () => {
  it("registers exactly the display element types", () => {
    expect(registry().types().sort()).toEqual([...LLM_DISPLAY_TYPES].sort());
  });

  it("has catalog metadata + a restricted schema for every type", () => {
    for (const t of LLM_DISPLAY_TYPES) {
      expect(LLM_ELEMENT_META[t]).toBeTruthy();
      expect(LLM_ELEMENT_META[t].examples.length).toBeGreaterThan(0);
      expect(llmDisplaySchemas[t]).toBeTruthy();
    }
  });

  it("strips interaction fields from restricted schemas", () => {
    for (const t of LLM_DISPLAY_TYPES) {
      const props = (llmDisplaySchemas[t] as { properties: object }).properties;
      expect(props).not.toHaveProperty("data_source");
      expect(props).not.toHaveProperty("action");
      expect(props).not.toHaveProperty("submit_action");
    }
  });

  it("compiles a valid display-only document (chart + container + table)", () => {
    const config = {
      page: { layout_type: "grid" },
      widgets: [
        { name: "h", type: "page-header", size: { width: 12, height: "auto" }, title: "Report" },
        {
          name: "c",
          type: "chart",
          size: { width: 6, height: 240 },
          chart_type: "bar",
          x_key: "region",
          series: [{ key: "revenue" }],
          data: [{ region: "EMEA", revenue: 10 }],
        },
        { name: "box", type: "container", size: { width: 6, height: 240 }, title: "Note", body: "hi" },
        {
          name: "t",
          type: "table",
          size: { width: 12, height: "auto" },
          content: "a,b\n1,2",
        },
      ],
    };
    const plan = compilePlan(config, { registry: registry() });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.widgets.length).toBe(4);
  });

  it("strips a smuggled data_source (display-only guard, never reaches the renderer)", () => {
    const config = {
      page: { layout_type: "grid" },
      widgets: [
        {
          name: "c",
          type: "chart",
          size: { width: 6, height: 240 },
          chart_type: "bar",
          x_key: "region",
          series: [{ key: "revenue" }],
          data: [{ region: "EMEA", revenue: 10 }],
          data_source: { action: "fetch_rows" },
        },
      ],
    };
    const plan = compilePlan(config, { registry: registry() });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // Ajv (removeAdditional) drops the forbidden field before render.
    expect(plan.value.widgets[0]!.props).not.toHaveProperty("data_source");
  });

  it("does not register interactive widget types (form/button-group/ai-*)", () => {
    const r = llmDisplayRegistry();
    expect(r.has("form")).toBe(false);
    expect(r.has("button-group")).toBe(false);
    expect(r.has("ai-chat-input")).toBe(false);
    expect(r.has("tool-calls")).toBe(false);
  });
});
