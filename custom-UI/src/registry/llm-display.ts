import type { ComponentType } from "react";
import { defineWidget, WidgetRegistry } from "./register.js";
import type { AnyWidgetDefinition, WidgetProps } from "./types.js";
import {
  LLM_DISPLAY_TYPES,
  llmDisplaySchemas,
  type LlmDisplayType,
} from "./llm-catalog.js";
import { PageHeaderWidgetComponent } from "../widgets/page-header.js";
import { PageFooterWidgetComponent } from "../widgets/page-footer.js";
import { ContainerWidgetComponent } from "../widgets/container.js";
import { MarkdownWidgetComponent } from "../widgets/markdown.js";
import { TableWidgetComponent } from "../widgets/table.js";
import { MetricsWidgetComponent } from "../widgets/metrics.js";
import { ChartWidgetComponent } from "../widgets/chart.js";
import { SpacerWidgetComponent } from "../widgets/spacer.js";

// Re-export the pure catalog surface so callers have a single import site.
export {
  LLM_DISPLAY_TYPES,
  LLM_FORBIDDEN_FIELDS,
  llmDisplaySchemas,
  restrictSchema,
  LLM_ELEMENT_META,
  type LlmDisplayType,
  type LlmElementMeta,
} from "./llm-catalog.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cmp = ComponentType<WidgetProps<any>>;

interface Binding {
  component: Cmp;
  chromeless?: boolean;
  slot?: "main" | "footer";
}

// Canonical component + host options per allowed type. Schemas come from the
// pure catalog (restricted), so the catalog can never describe a field the
// validator rejects, or vice-versa.
const BINDINGS: Record<LlmDisplayType, Binding> = {
  "page-header": { component: PageHeaderWidgetComponent, chromeless: true },
  "page-footer": { component: PageFooterWidgetComponent, chromeless: true, slot: "footer" },
  container: { component: ContainerWidgetComponent, chromeless: true },
  markdown: { component: MarkdownWidgetComponent },
  table: { component: TableWidgetComponent },
  metrics: { component: MetricsWidgetComponent },
  chart: { component: ChartWidgetComponent },
  spacer: { component: SpacerWidgetComponent, chromeless: true },
};

/**
 * The display-only widget definitions an agent may author: the canonical
 * components bound to the restricted catalog schemas.
 */
export const llmDisplayWidgets: AnyWidgetDefinition[] = LLM_DISPLAY_TYPES.map(
  (t) => {
    const b = BINDINGS[t];
    return defineWidget({
      type: t,
      schema: llmDisplaySchemas[t],
      component: b.component,
      ...(b.chromeless !== undefined && { chromeless: b.chromeless }),
      ...(b.slot && { slot: b.slot }),
    });
  },
);

/** A fresh registry containing only the display-only elements. */
export function llmDisplayRegistry(): WidgetRegistry {
  return new WidgetRegistry(llmDisplayWidgets);
}
