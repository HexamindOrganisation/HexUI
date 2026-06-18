/**
 * Pure tool handlers. They wrap the `agent-ui/llm` catalog + validator and
 * return plain JSON-serializable results. Kept separate from the MCP transport
 * wiring in `server.ts` so they can be unit-tested directly.
 */
import {
  listElements,
  describeElement,
  listRules,
  validateLlmUi,
  formatDiagnostics,
  LLM_DISPLAY_TYPES,
} from "agent-ui/llm";

export function handleListElements() {
  return {
    elements: listElements(),
    next: "Call describe_element(element_name) for full field specs before authoring.",
  };
}

export function handleDescribeElement(elementName: string) {
  const doc = describeElement(elementName);
  if (!doc) {
    return {
      error: `Unknown element "${elementName}".`,
      available_elements: [...LLM_DISPLAY_TYPES],
      hint: "Use list_elements to see what is available.",
    };
  }
  return doc;
}

export function handleListRules() {
  return listRules();
}

export function handleValidateUi(yamlText: string) {
  const result = validateLlmUi(yamlText);
  if (result.ok) {
    return {
      ok: true,
      summary: result.summary,
      warnings: result.warnings,
      message:
        result.warnings.length > 0
          ? "Valid (with warnings). You may submit this UI; review the warnings first."
          : "Valid. You can submit this UI to the front app.",
    };
  }
  return {
    ok: false,
    errors: result.errors,
    warnings: result.warnings,
    formatted: formatDiagnostics([...result.errors, ...result.warnings]),
    message:
      "Invalid UI. Fix the errors below and call validate_ui again. Each error has a code, a path into your YAML, and a line number.",
  };
}
