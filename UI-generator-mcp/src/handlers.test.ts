import { describe, it, expect } from "vitest";
import {
  handleListElements,
  handleDescribeElement,
  handleListRules,
  handleValidateUi,
} from "./handlers.js";

describe("MCP handlers", () => {
  it("list_elements returns a non-empty catalog", () => {
    const out = handleListElements();
    expect(out.elements.length).toBeGreaterThan(0);
    expect(out.elements[0]).toHaveProperty("summary");
  });

  it("describe_element returns a spec for a known element", () => {
    const out = handleDescribeElement("table") as { fields: unknown[] };
    expect(Array.isArray(out.fields)).toBe(true);
  });

  it("describe_element returns an error for an unknown element", () => {
    const out = handleDescribeElement("nope") as { error?: string };
    expect(out.error).toBeTruthy();
  });

  it("validate_ui accepts a valid document", () => {
    const out = handleValidateUi(
      "page: { layout_type: grid }\nwidgets:\n  - name: h\n    type: page-header\n    size: { width: 12, height: auto }\n    title: Hi",
    );
    expect(out.ok).toBe(true);
  });

  it("validate_ui rejects an invalid document with a formatted block", () => {
    const out = handleValidateUi(
      "page: { layout_type: grid }\nwidgets:\n  - name: h\n    type: nope\n    size: { width: 12, height: auto }",
    ) as { ok: boolean; formatted?: string };
    expect(out.ok).toBe(false);
    expect(out.formatted).toContain("ui.unknown-type");
  });

  it("list_rules exposes the element list and cap", () => {
    const out = handleListRules();
    expect(out.available_elements.length).toBeGreaterThan(0);
    expect(out.max_widgets).toBeGreaterThan(0);
  });
});
