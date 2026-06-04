import type { WidgetProps } from "../registry/types.js";
import type { MarkdownWidget } from "../schema/widgets/markdown.js";
import { useWidgetData } from "../runtime/context.js";
import { renderMarkdown } from "../lib/markdown.js";
import { ContextCard } from "../lib/context-card.js";

export function MarkdownWidgetComponent({
  props,
  name,
}: WidgetProps<MarkdownWidget>): JSX.Element {
  const { data, loading, error } = useWidgetData<string>(props.data_source);

  const source = props.data_source
    ? typeof data === "string"
      ? data
      : ""
    : props.content ?? "";

  let body: JSX.Element;
  if (props.data_source && loading && !data) {
    body = (
      <div className="text-sm italic text-muted-foreground">
        {props.empty_text ?? "Loading…"}
      </div>
    );
  } else if (error) {
    body = (
      <div className="text-sm italic text-destructive">
        Failed to load markdown: {error.message}
      </div>
    );
  } else if (!source) {
    body = (
      <div className="text-sm italic text-muted-foreground">
        {props.empty_text ?? ""}
      </div>
    );
  } else {
    body = (
      <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground">
        {renderMarkdown(source)}
      </div>
    );
  }

  return (
    <ContextCard
      widgetKey={name}
      caption={props.caption ?? name}
      mime="text/markdown"
      text={source}
    >
      {body}
    </ContextCard>
  );
}
