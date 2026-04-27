import type { ComponentType } from "react";
import type { ZodTypeAny, z } from "zod";
import type { ActionDispatcher } from "../runtime/dispatcher.js";

/**
 * Props passed to every widget component. `props` is the validated,
 * widget-specific subtree from the YAML.
 */
export interface WidgetProps<TProps = unknown> {
  id: string;
  name: string;
  props: TProps;
  dispatcher: ActionDispatcher;
}

/**
 * Where a widget renders inside the AgentUI shell.
 * - "main"   (default): the widget is part of the layout (grid/flex/sidebar/tabs).
 *                        Honors `position`, `size.width`, `tab`.
 * - "footer": rendered outside the layout, pinned to the bottom of the page.
 *             Spans the full width. `position` is ignored.
 */
export type WidgetSlot = "main" | "footer";

export interface WidgetDefinition<TSchema extends ZodTypeAny = ZodTypeAny> {
  type: string;
  schema: TSchema;
  component: ComponentType<WidgetProps<z.infer<TSchema>>>;
  defaults?: Partial<z.infer<TSchema>>;
  /** When true, WidgetHost skips the default border/padding chrome. */
  chromeless?: boolean;
  /** Default "main". "footer" widgets render outside the layout, pinned to the page bottom. */
  slot?: WidgetSlot;
}

/**
 * Erased form stored in the registry. Component is widened to `any` so that
 * definitions for different schemas can share a homogeneous container without
 * TypeScript's invariant component-position tripping us up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWidgetDefinition = {
  type: string;
  schema: ZodTypeAny;
  component: ComponentType<WidgetProps<any>>;
  defaults?: Record<string, unknown>;
  chromeless?: boolean;
  slot?: WidgetSlot;
};
