import type { WidgetProps } from "../registry/types.js";
import type { PageFooterWidget } from "../schema/widgets/page-footer.js";

export function PageFooterWidgetComponent({
  props,
}: WidgetProps<PageFooterWidget>): JSX.Element {
  return (
    <footer className="flex items-center justify-center border-t border-border bg-background px-4 py-2 text-xs text-muted-foreground">
      {props.text ?? ""}
    </footer>
  );
}
