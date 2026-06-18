import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { parseYaml } from "../compile/parse.js";
import { PageSchema } from "../schema/page.js";
import {
  llmDisplaySchemas,
  LLM_DISPLAY_TYPES,
  LLM_FORBIDDEN_FIELDS,
  type LlmDisplayType,
} from "../registry/llm-catalog.js";
import { ajvErrorsToDiagnostics } from "../diagnostics/ajv.js";
import type { Diagnostic } from "../diagnostics/types.js";

/** Hard cap on elements in one agent-authored document. */
export const LLM_MAX_WIDGETS = 24;

export interface LlmValidationSummary {
  widget_count: number;
  layout: "grid" | "flex";
  types: string[];
}

export interface LlmValidationResult {
  ok: boolean;
  /** Blocking problems. When non-empty, `ok` is false. */
  errors: Diagnostic[];
  /** Non-blocking advice (stripped fields, ignored theme, etc.). */
  warnings: Diagnostic[];
  /** Present only when `ok`. */
  summary?: LlmValidationSummary;
}

// A *strict* Ajv: unlike the renderer's instance, it does not strip unknown
// properties or fill defaults, so the agent gets precise "unexpected property"
// errors instead of a silent drop.
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let pageValidator: ValidateFunction | null = null;
const widgetValidators = new Map<LlmDisplayType, ValidateFunction>();

function getPageValidator(): ValidateFunction {
  if (!pageValidator) pageValidator = ajv.compile(PageSchema);
  return pageValidator;
}
function getWidgetValidator(type: LlmDisplayType): ValidateFunction {
  let v = widgetValidators.get(type);
  if (!v) {
    v = ajv.compile(llmDisplaySchemas[type]);
    widgetValidators.set(type, v);
  }
  return v;
}

const KNOWN_TYPES = new Set<string>(LLM_DISPLAY_TYPES);
const FORBIDDEN = new Set<string>(LLM_FORBIDDEN_FIELDS);

/**
 * Validate an agent-authored UI document (YAML text or an already-parsed
 * object) against the display-only catalog. Designed so a clean `ok:true`
 * guarantees the `llm-ui-response` widget will render it.
 */
export function validateLlmUi(input: string | object): LlmValidationResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  let raw: unknown;
  let locate: ((p: (string | number)[]) => { line?: number; col?: number } | undefined) | undefined;
  if (typeof input === "string") {
    const parsed = parseYaml(input);
    if (!parsed.ok) return { ok: false, errors: parsed.errors, warnings };
    raw = parsed.value.data;
    locate = parsed.value.locate;
  } else {
    raw = input;
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push({
      severity: "error",
      code: "ui.not-object",
      message:
        "The document must be a mapping with a `page:` key and a `widgets:` list.",
      path: [],
    });
    return { ok: false, errors, warnings };
  }

  const root = raw as { page?: unknown; widgets?: unknown };

  // ── page ────────────────────────────────────────────────────────────────
  if (root.page == null) {
    errors.push({
      severity: "error",
      code: "ui.missing-page",
      message: 'Missing `page`. Add `page: { layout_type: "grid" }`.',
      path: ["page"],
    });
  } else {
    const page = root.page as Record<string, unknown>;
    if ("theme" in page || "main_color" in page) {
      warnings.push({
        severity: "warning",
        code: "ui.theme-ignored",
        message:
          "`page.theme` / `page.main_color` are ignored — generated UI inherits the host agent's theme.",
        path: ["page"],
      });
    }
    const vp = getPageValidator();
    const pageClone = structuredClone(page);
    if (!vp(pageClone)) {
      errors.push(...ajvErrorsToDiagnostics(vp.errors, ["page"], locate));
    }
  }

  // ── widgets ───────────────────────────────────────────────────────────────
  const widgets = Array.isArray(root.widgets) ? root.widgets : [];
  if (!Array.isArray(root.widgets)) {
    if (root.widgets != null) {
      errors.push({
        severity: "error",
        code: "ui.widgets-not-array",
        message: "`widgets` must be a list.",
        path: ["widgets"],
      });
    }
  }
  if (widgets.length === 0 && errors.length === 0) {
    warnings.push({
      severity: "warning",
      code: "ui.no-widgets",
      message: "The document has no widgets — nothing will render.",
      path: ["widgets"],
    });
  }
  if (widgets.length > LLM_MAX_WIDGETS) {
    errors.push({
      severity: "error",
      code: "ui.too-many-widgets",
      message: `Too many elements: ${widgets.length} (max ${LLM_MAX_WIDGETS}). Keep generated UI focused.`,
      path: ["widgets"],
    });
  }

  const seen = new Set<string>();
  const types: string[] = [];

  widgets.forEach((item, idx) => {
    const at = ["widgets", idx];
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push({
        severity: "error",
        code: "ui.widget-not-object",
        message: `widgets[${idx}] must be an object.`,
        path: at,
        ...loc(locate, at),
      });
      return;
    }
    const w = item as Record<string, unknown>;
    const name = typeof w.name === "string" ? w.name : "";
    const type = typeof w.type === "string" ? w.type : "";

    if (!name) {
      errors.push({
        severity: "error",
        code: "ui.missing-name",
        message: `widgets[${idx}] is missing a unique \`name\`.`,
        path: at,
        ...loc(locate, at),
      });
    } else if (seen.has(name)) {
      errors.push({
        severity: "error",
        code: "ui.duplicate-name",
        message: `Duplicate widget name "${name}" — names must be unique.`,
        path: [...at, "name"],
        ...loc(locate, [...at, "name"]),
      });
    } else {
      seen.add(name);
    }

    if (!type) {
      errors.push({
        severity: "error",
        code: "ui.missing-type",
        message: `widget "${name || idx}" is missing \`type\`.`,
        path: [...at, "type"],
        ...loc(locate, [...at, "type"]),
      });
      return;
    }
    if (!KNOWN_TYPES.has(type)) {
      errors.push({
        severity: "error",
        code: "ui.unknown-type",
        message: `"${type}" is not an available element. Available: ${LLM_DISPLAY_TYPES.join(", ")}. Use list_elements for details.`,
        path: [...at, "type"],
        ...loc(locate, [...at, "type"]),
      });
      return;
    }
    types.push(type);

    // Friendly heads-up for interaction fields the agent should not use.
    for (const key of Object.keys(w)) {
      if (FORBIDDEN.has(key)) {
        warnings.push({
          severity: "warning",
          code: "ui.forbidden-field",
          message: `"${key}" is not allowed on generated (display-only) elements and will be removed.`,
          path: [...at, key],
          ...loc(locate, [...at, key]),
        });
      }
    }

    const v = getWidgetValidator(type as LlmDisplayType);
    const clone = structuredClone(w);
    if (!v(clone)) {
      errors.push(...ajvErrorsToDiagnostics(v.errors, at, locate));
    }

    // Grid overflow: width must be 1..12 (SizeSchema already bounds it, but
    // surface a clearer message at the document level).
    const size = w.size as { width?: unknown } | undefined;
    if (size && typeof size.width === "number" && size.width > 12) {
      errors.push({
        severity: "error",
        code: "ui.grid-overflow",
        message: `widget "${name}" has size.width ${size.width}; the grid is 12 columns wide.`,
        path: [...at, "size", "width"],
        ...loc(locate, [...at, "size", "width"]),
      });
    }
  });

  const layout: "grid" | "flex" =
    (root.page as { layout_type?: string } | undefined)?.layout_type === "flex"
      ? "flex"
      : "grid";

  if (errors.length > 0) return { ok: false, errors, warnings };
  return {
    ok: true,
    errors,
    warnings,
    summary: { widget_count: widgets.length, layout, types },
  };
}

function loc(
  locate: ((p: (string | number)[]) => { line?: number; col?: number } | undefined) | undefined,
  path: (string | number)[],
): { sourceLine?: number; sourceCol?: number } {
  const l = locate?.(path);
  if (!l) return {};
  return {
    ...(l.line !== undefined && { sourceLine: l.line }),
    ...(l.col !== undefined && { sourceCol: l.col }),
  };
}

/** Render diagnostics as a compact, LLM-readable block. */
export function formatDiagnostics(diags: Diagnostic[]): string {
  return diags
    .map((d) => {
      const where = d.path.length ? ` at ${d.path.join(".")}` : "";
      const at = d.sourceLine !== undefined ? ` (line ${d.sourceLine})` : "";
      return `- [${d.code}]${where}${at}: ${d.message}`;
    })
    .join("\n");
}
