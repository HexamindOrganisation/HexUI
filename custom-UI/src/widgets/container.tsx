import type { WidgetProps } from "../registry/types.js";
import type { ContainerWidget } from "../schema/widgets/container.js";
import { cn } from "../lib/utils.js";

const TONE_CLASS: Record<string, string> = {
  default: "bg-transparent",
  muted: "bg-muted",
  card: "bg-card border border-border",
  accent: "bg-primary/10 border border-primary/20",
  outline: "bg-transparent border border-border",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

/**
 * Decorative panel: a titled, optionally tinted/bordered box with a short body.
 * Purely esthetic — used to group or caption a region of a generated layout.
 */
export function ContainerWidgetComponent({
  props,
}: WidgetProps<ContainerWidget>): JSX.Element {
  const tone = props.tone ?? "card";
  const align = props.align ?? "left";
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center gap-1.5 rounded-[var(--radius)] px-4 py-3",
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
      )}
    >
      {props.title && (
        <div className="text-sm font-semibold text-foreground">
          {props.title}
        </div>
      )}
      {props.body && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {props.body}
        </div>
      )}
    </div>
  );
}
