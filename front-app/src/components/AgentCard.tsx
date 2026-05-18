import { Link } from "react-router-dom";
import type { AgentMetadata } from "../runtime/types.js";
import { CapabilityBadges } from "./CapabilityBadges.js";
import { HealthPill } from "./HealthPill.js";

/**
 * One card per agent on AgentsHome. Clicking the whole card OR the
 * "Chat" CTA navigates to `/agents/:id`.
 */
export function AgentCard({ agent }: { agent: AgentMetadata }): JSX.Element {
  return (
    <Link
      to={`/agents/${encodeURIComponent(agent.agent_id)}`}
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold leading-tight">{agent.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <code>{agent.agent_id}</code> · {agent.framework} v{agent.version}
          </div>
        </div>
        <HealthPill agentId={agent.agent_id} />
      </div>

      {agent.description && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {agent.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <CapabilityBadges capabilities={agent.capabilities} />
        <span className="text-xs text-muted-foreground group-hover:text-primary">
          Chat →
        </span>
      </div>
    </Link>
  );
}
