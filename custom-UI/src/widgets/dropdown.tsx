import { useState } from "react";
import type { WidgetProps } from "../registry/types.js";
import type { DropdownWidget } from "../schema/widgets/dropdown.js";
import { useAgentUIContext } from "../runtime/context.js";

/**
 * A single-select dropdown. Choosing an option invokes that option's `action`
 * and re-pulls the widgets in its `refresh` list — the same `action` + `refresh`
 * mechanism the button-group uses, surfaced as a `<select>`. The selected value
 * is local UI state; the backend remains the source of truth (the action sets
 * server-side state, the refreshed widget re-pulls it), so `default` should
 * mirror the backend's initial selection.
 */
export function DropdownWidgetComponent({
  props,
  dispatcher,
}: WidgetProps<DropdownWidget>): JSX.Element {
  const { requestRefresh } = useAgentUIContext();
  const initial = props.default ?? props.options[0]?.value ?? "";
  const [value, setValue] = useState<string>(initial);

  const onChange = (next: string) => {
    const opt = props.options.find((o) => o.value === next);
    if (!opt) return;
    setValue(next);
    dispatcher
      .invoke(opt.action, opt.args)
      .then(() => {
        if (opt.refresh?.length) requestRefresh(opt.refresh);
      })
      .catch(() => {
        /* action errors surface via the backend / diagnostics */
      });
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      {props.label && (
        <span className="text-muted-foreground">{props.label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {props.placeholder && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
