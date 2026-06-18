import type { ActionDispatcher } from "agent-ui";

import { invokeAgentAction } from "../api/agents";
import { invokeConversationAction } from "../api/conversations";

/**
 * Resolves widget `data_source` / action calls against the proxy.
 *
 * Once a chat is underway, actions are conversation-scoped (POST to
 * `/conversations/{id}/actions/{name}`). On the greeting — before the lazy
 * conversation exists — they fall back to the agent-scoped path
 * (`/agents/{id}/actions/{name}`), so dashboards (e.g. the DevOps service-state
 * table) load from the start. Only when neither id is known do actions resolve
 * to `undefined` (widgets degrade to their empty state).
 */
export function makeDispatcher(
  getConversationId: () => string | null,
  getAgentId: () => string | null,
): ActionDispatcher {
  return {
    async invoke(action: string, args?: unknown): Promise<unknown> {
      const conversationId = getConversationId();
      if (conversationId) {
        const { result } = await invokeConversationAction(
          conversationId,
          action,
          args ?? {},
        );
        return result;
      }
      const agentId = getAgentId();
      if (agentId) {
        const { result } = await invokeAgentAction(agentId, action, args ?? {});
        return result;
      }
      return undefined;
    },
    has() {
      // Assume any named action is dispatchable; the backend 404s unknown ones.
      return true;
    },
  };
}
