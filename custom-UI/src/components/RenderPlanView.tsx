import type { RenderPlan } from "../compile/plan.js";
import type { ActionDispatcher } from "../runtime/dispatcher.js";
import { GridRoot } from "./layout/GridRoot.js";
import { FlexRoot } from "./layout/FlexRoot.js";
import { WidgetHost } from "./WidgetHost.js";

/**
 * Renders an already-compiled {@link RenderPlan}'s layout (grid or flex) plus
 * any footer-slot widgets — but **without** the `<AgentUIProvider>` or the
 * themed `au-root` wrapper that {@link AgentUI} mounts.
 *
 * This is the building block for embedding a *nested* plan inside a widget
 * (e.g. the `llm-ui-response` widget rendering agent-authored UI). Because it
 * adds no new root, the nested plan inherits the host page's theme CSS
 * variables, and its widgets run inside the host's existing provider — so
 * widget hooks keep working. The caller is responsible for sizing the
 * container.
 */
export function RenderPlanView({
  plan,
  dispatcher,
}: {
  plan: RenderPlan;
  dispatcher: ActionDispatcher;
}): JSX.Element {
  return (
    <>
      {plan.layout.kind === "grid" ? (
        <GridRoot plan={plan} dispatcher={dispatcher} />
      ) : (
        <FlexRoot plan={plan} dispatcher={dispatcher} />
      )}
      {plan.footer.length > 0 && (
        <div className="au-embedded-footer mt-3 flex flex-col gap-2">
          {plan.footer.map((w) => (
            <WidgetHost key={w.id} widget={w} dispatcher={dispatcher} />
          ))}
        </div>
      )}
    </>
  );
}
