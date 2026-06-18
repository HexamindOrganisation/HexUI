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
export {
  ChartWidgetSchema,
  type ChartWidget,
  ChartKindSchema,
  type ChartKind,
  ChartSeriesSchema,
  type ChartSeries,
} from "./chart.js";
export {
  ContainerWidgetSchema,
  type ContainerWidget,
  ContainerToneSchema,
  type ContainerTone,
} from "./container.js";
export {
  LlmUiResponseWidgetSchema,
  type LlmUiResponseWidget,
} from "./llm-ui-response.js";

import { ButtonGroupWidgetSchema } from "./button-group.js";
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
import { ChartWidgetSchema } from "./chart.js";
import { ContainerWidgetSchema } from "./container.js";
import { LlmUiResponseWidgetSchema } from "./llm-ui-response.js";
import type {
  ButtonGroupWidget,
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
  ChartWidget,
  ContainerWidget,
  LlmUiResponseWidget,
} from "./index.js";

export const BuiltinWidgetSchemas = {
  "button-group": ButtonGroupWidgetSchema,
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
  chart: ChartWidgetSchema,
  container: ContainerWidgetSchema,
  "llm-ui-response": LlmUiResponseWidgetSchema,
} as const;

export type BuiltinWidgetType = keyof typeof BuiltinWidgetSchemas;

/** JSON Schema `oneOf` over every built-in widget. */
export const BuiltinWidgetUnion = {
  oneOf: [
    ButtonGroupWidgetSchema,
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
    ChartWidgetSchema,
    ContainerWidgetSchema,
    LlmUiResponseWidgetSchema,
  ],
} as const;

export type BuiltinWidget =
  | ButtonGroupWidget
  | PageHeaderWidget
  | PageFooterWidget
  | AiChatInputWidget
  | AiResponseWidget
  | SpacerWidget
  | MarkdownWidget
  | FormWidget
  | MetricsWidget
  | TableWidget
  | ToolCallsWidget
  | ChartWidget
  | ContainerWidget
  | LlmUiResponseWidget;
