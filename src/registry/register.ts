import type { ZodTypeAny, z } from "zod";
import type {
  AnyWidgetDefinition,
  WidgetDefinition,
  WidgetProps,
} from "./types.js";
import type { ComponentType } from "react";

export function defineWidget<TSchema extends ZodTypeAny>(spec: {
  type: string;
  schema: TSchema;
  component: ComponentType<WidgetProps<z.infer<TSchema>>>;
  defaults?: Partial<z.infer<TSchema>>;
  chromeless?: boolean;
}): WidgetDefinition<TSchema> {
  return { ...spec };
}

export class WidgetRegistry {
  private readonly defs: Map<string, AnyWidgetDefinition> = new Map();

  constructor(initial: readonly AnyWidgetDefinition[] = []) {
    for (const def of initial) this.register(def);
  }

  register(def: AnyWidgetDefinition): void {
    this.defs.set(def.type, def);
  }

  registerMany(defs: readonly AnyWidgetDefinition[]): void {
    for (const d of defs) this.register(d);
  }

  get(type: string): AnyWidgetDefinition | undefined {
    return this.defs.get(type);
  }

  has(type: string): boolean {
    return this.defs.has(type);
  }

  types(): string[] {
    return Array.from(this.defs.keys());
  }

  all(): AnyWidgetDefinition[] {
    return Array.from(this.defs.values());
  }

  /** Build a dynamic Zod schema covering every registered widget. */
  unionSchema(): ZodTypeAny[] {
    return this.all().map((d) => d.schema);
  }

  extend(extras: readonly AnyWidgetDefinition[]): WidgetRegistry {
    const clone = new WidgetRegistry(this.all());
    clone.registerMany(extras);
    return clone;
  }
}
