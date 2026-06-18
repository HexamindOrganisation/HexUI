export {
  ButtonGroupWidgetSchema,
  type ButtonGroupWidget,
  ButtonGroupItemSchema,
  type ButtonGroupItem,
  ButtonVariantSchema,
  type ButtonVariant,
  ButtonSizeSchema,
  type ButtonSize,
} from "./button-group.js";
export {
  DropdownWidgetSchema,
  type DropdownWidget,
  DropdownOptionSchema,
  type DropdownOption,
} from "./dropdown.js";
export {
  PageHeaderWidgetSchema,
  type PageHeaderWidget,
} from "./page-header.js";
export {
  PageFooterWidgetSchema,
  type PageFooterWidget,
} from "./page-footer.js";
export {
  AiChatInputWidgetSchema,
  type AiChatInputWidget,
} from "./ai-chat-input.js";
export {
  AiResponseWidgetSchema,
  type AiResponseWidget,
} from "./ai-response.js";
export { SpacerWidgetSchema, type SpacerWidget } from "./spacer.js";
export { MarkdownWidgetSchema, type MarkdownWidget } from "./markdown.js";
export {
  FormWidgetSchema,
  type FormWidget,
  FormFieldSchema,
  type FormField,
} from "./form.js";
export {
  MetricsWidgetSchema,
  type MetricsWidget,
  MetricSpecSchema,
  type MetricSpec,
  MetricFormatSchema,
  type MetricFormat,
} from "./metrics.js";
export {
  TableWidgetSchema,
  type TableWidget,
  TableModeSchema,
  type TableMode,
} from "./table.js";
export {
  ToolCallsWidgetSchema,
  type ToolCallsWidget,
  type ToolCallPayload,
  type ToolCallStartPayload,
  type ToolCallEndPayload,
} from "./tool-calls.js";

import { ButtonGroupWidgetSchema } from "./button-group.js";
import { DropdownWidgetSchema } from "./dropdown.js";
import { PageHeaderWidgetSchema } from "./page-header.js";
import { PageFooterWidgetSchema } from "./page-footer.js";
import { AiChatInputWidgetSchema } from "./ai-chat-input.js";
import { AiResponseWidgetSchema } from "./ai-response.js";
import { SpacerWidgetSchema } from "./spacer.js";
import { MarkdownWidgetSchema } from "./markdown.js";
import { FormWidgetSchema } from "./form.js";
import { MetricsWidgetSchema } from "./metrics.js";
import { TableWidgetSchema } from "./table.js";
import { ToolCallsWidgetSchema } from "./tool-calls.js";
import type {
  ButtonGroupWidget,
  DropdownWidget,
  PageHeaderWidget,
  PageFooterWidget,
  AiChatInputWidget,
  AiResponseWidget,
  SpacerWidget,
  MarkdownWidget,
  FormWidget,
  MetricsWidget,
  TableWidget,
  ToolCallsWidget,
} from "./index.js";

export const BuiltinWidgetSchemas = {
  "button-group": ButtonGroupWidgetSchema,
  dropdown: DropdownWidgetSchema,
  "page-header": PageHeaderWidgetSchema,
  "page-footer": PageFooterWidgetSchema,
  "ai-chat-input": AiChatInputWidgetSchema,
  "ai-response": AiResponseWidgetSchema,
  spacer: SpacerWidgetSchema,
  markdown: MarkdownWidgetSchema,
  form: FormWidgetSchema,
  metrics: MetricsWidgetSchema,
  table: TableWidgetSchema,
  "tool-calls": ToolCallsWidgetSchema,
} as const;

export type BuiltinWidgetType = keyof typeof BuiltinWidgetSchemas;

/** JSON Schema `oneOf` over every built-in widget. */
export const BuiltinWidgetUnion = {
  oneOf: [
    ButtonGroupWidgetSchema,
    DropdownWidgetSchema,
    PageHeaderWidgetSchema,
    PageFooterWidgetSchema,
    AiChatInputWidgetSchema,
    AiResponseWidgetSchema,
    SpacerWidgetSchema,
    MarkdownWidgetSchema,
    FormWidgetSchema,
    MetricsWidgetSchema,
    TableWidgetSchema,
    ToolCallsWidgetSchema,
  ],
} as const;

export type BuiltinWidget =
  | ButtonGroupWidget
  | DropdownWidget
  | PageHeaderWidget
  | PageFooterWidget
  | AiChatInputWidget
  | AiResponseWidget
  | SpacerWidget
  | MarkdownWidget
  | FormWidget
  | MetricsWidget
  | TableWidget
  | ToolCallsWidget;
