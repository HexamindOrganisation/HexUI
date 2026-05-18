import type { AgentCapabilities } from "../runtime/types.js";

/**
 * Small chip row showing which platform capabilities the agent advertises.
 * Renders only the *true* capabilities to keep cards compact; the absence
 * of a chip means "not supported by this agent".
 */
export function CapabilityBadges({
  capabilities,
}: {
  capabilities: AgentCapabilities;
}): JSX.Element {
  const items: { key: keyof AgentCapabilities; label: string }[] = [
    { key: "streaming", label: "stream" },
    { key: "tools", label: "tools" },
    { key: "state", label: "state" },
    { key: "approvals", label: "approvals" },
    { key: "multi_turn", label: "multi-turn" },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items
        .filter((item) => capabilities[item.key])
        .map((item) => (
          <span
            key={item.key}
            className="rounded-full border border-border bg-secondary/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            {item.label}
          </span>
        ))}
    </div>
  );
}
