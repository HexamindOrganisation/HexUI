import type { Diagnostic, Result } from "../diagnostics/types.js";
import { ok, err, hasErrors } from "../diagnostics/types.js";
import type { ResolvedWidget } from "./resolve.js";
import { resolve, type ResolveOptions } from "./resolve.js";
import { normalize } from "./normalize.js";
import { resolveTheme, type ResolvedTheme, type ThemeTokens } from "./theme.js";
import type { LayoutPlan } from "./layout/types.js";
import { compileGrid } from "./layout/grid.js";
import { compileFlex } from "./layout/flex.js";
import { compileSidebar } from "./layout/sidebar.js";
import { compileTabs } from "./layout/tabs.js";
import type { WidgetRegistry } from "../registry/register.js";
import type { ActionDispatcher } from "../runtime/dispatcher.js";
import type { SourceMap } from "./parse.js";
import type { ComponentType } from "react";
import type { WidgetProps } from "../registry/types.js";

export interface RenderPlan {
  theme: ResolvedTheme;
  layout: LayoutPlan;
  widgets: RenderPlanWidget[];
  diagnostics: Diagnostic[];
}

export interface RenderPlanWidget {
  id: string;
  name: string;
  type: string;
  props: unknown;
  height: number | "auto";
  component: ComponentType<WidgetProps<unknown>>;
  chromeless?: boolean;
}

export interface CompileOptions {
  registry: WidgetRegistry;
  dispatcher?: ActionDispatcher;
  locate?: SourceMap;
  themeOverride?: Partial<ThemeTokens>;
}

/**
 * Stage 5: compile a ResolvedConfig into a RenderPlan.
 * Takes diagnostics from earlier stages and appends layout diagnostics.
 */
export function compilePlan(
  raw: unknown,
  opts: CompileOptions,
): Result<RenderPlan, Diagnostic[]> {
  const resolveOpts: ResolveOptions = {
    registry: opts.registry,
    ...(opts.dispatcher && { dispatcher: opts.dispatcher }),
    ...(opts.locate && { locate: opts.locate }),
  };
  const r = resolve(raw, resolveOpts);
  if (!r.ok) return r;

  const diagnostics: Diagnostic[] = [...r.value.diagnostics];
  const resolved = normalize(r.value);
  const theme = resolveTheme(resolved.page, opts.themeOverride ?? {});

  let layout: LayoutPlan;
  const lt = resolved.page.layout_type;
  if (lt === "grid") {
    const g = compileGrid(resolved.widgets, diagnostics);
    layout = { kind: "grid", template: g.template, cells: g.cells };
  } else if (lt === "flex") {
    layout = compileFlex(resolved.widgets, "column");
  } else if (lt === "sidebar") {
    layout = compileSidebar(resolved.page, resolved.widgets, diagnostics);
  } else {
    layout = compileTabs(resolved.widgets, diagnostics);
  }

  const plan: RenderPlan = {
    theme,
    layout,
    widgets: resolved.widgets.map(toPlanWidget),
    diagnostics,
  };

  if (hasErrors(diagnostics)) return err(diagnostics);
  return ok(plan);
}

function toPlanWidget(w: ResolvedWidget): RenderPlanWidget {
  return {
    id: w.id,
    name: w.name,
    type: w.type,
    props: w.props,
    height: w.size.height,
    component: w.component,
    ...(w.chromeless && { chromeless: true }),
  };
}
