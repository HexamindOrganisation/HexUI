import type { WidgetProps } from "../registry/types.js";
import type { PageHeaderWidget } from "../schema/widgets/page-header.js";

export function PageHeaderWidgetComponent({
  props,
}: WidgetProps<PageHeaderWidget>): JSX.Element {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
      {props.icon && (
        <img src={props.icon} alt="" className="h-6 w-6 shrink-0" />
      )}
      <div className="flex flex-col">
        <h1 className="m-0 text-base font-semibold leading-tight text-foreground">
          {props.title}
        </h1>
        {props.subtitle && (
          <p className="m-0 text-xs text-muted-foreground">
            {props.subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
