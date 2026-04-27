import type { ZodError, ZodIssue } from "zod";
import type { Diagnostic } from "./types.js";

/**
 * Map a ZodError to an array of Diagnostics. If a source-location resolver
 * is provided, each diagnostic gets `sourceLine`/`sourceCol` based on the
 * JSON path into the original YAML document.
 */
export function zodErrorToDiagnostics(
  error: ZodError,
  locate?: (path: (string | number)[]) => { line?: number; col?: number } | undefined,
): Diagnostic[] {
  return error.issues.map((issue) => issueToDiagnostic(issue, locate));
}

function issueToDiagnostic(
  issue: ZodIssue,
  locate?: (path: (string | number)[]) => { line?: number; col?: number } | undefined,
): Diagnostic {
  const loc = locate?.(issue.path);
  return {
    severity: "error",
    code: `zod.${issue.code}`,
    message: issue.message,
    path: [...issue.path],
    ...(loc?.line !== undefined && { sourceLine: loc.line }),
    ...(loc?.col !== undefined && { sourceCol: loc.col }),
  };
}
