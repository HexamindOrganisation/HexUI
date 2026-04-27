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

export interface WidgetDefinition<TSchema extends ZodTypeAny = ZodTypeAny> {
  type: string;
  schema: TSchema;
  component: ComponentType<WidgetProps<z.infer<TSchema>>>;
  defaults?: Partial<z.infer<TSchema>>;
  /** When true, WidgetHost skips the default border/padding chrome. */
  chromeless?: boolean;
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
};
