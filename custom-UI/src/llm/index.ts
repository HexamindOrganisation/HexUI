/**
 * `agent-ui/llm` — the pure, component-free surface used by the UI-generator
 * MCP server. Importing this entry does NOT pull in React or the rendering
 * stack, so it is safe to load in a plain Node process.
 *
 * It exposes everything the MCP needs:
 *  - the display-only element catalog (schemas + metadata),
 *  - introspection (`listElements`, `describeElement`, `listRules`),
 *  - validation (`validateLlmUi`) that mirrors what the widget will render.
 */
export {
  LLM_DISPLAY_TYPES,
  LLM_FORBIDDEN_FIELDS,
  llmDisplaySchemas,
  restrictSchema,
  LLM_ELEMENT_META,
  type LlmDisplayType,
  type LlmElementMeta,
} from "../registry/llm-catalog.js";

export {
  validateLlmUi,
  formatDiagnostics,
  LLM_MAX_WIDGETS,
  type LlmValidationResult,
  type LlmValidationSummary,
} from "./validate.js";

export {
  listElements,
  describeElement,
  listRules,
  type ElementListing,
  type ElementDoc,
  type FieldDoc,
  type UiRules,
} from "./introspect.js";

export type { Diagnostic } from "../diagnostics/types.js";
