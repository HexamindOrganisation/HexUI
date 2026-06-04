import { del, getJson, putJson } from "./client";

/** A widget currently toggled into a conversation's context. */
export interface ContextKey {
  key: string;
  label: string;
}

export function listConversationContext(convId: string): Promise<ContextKey[]> {
  return getJson<ContextKey[]>(`/api/conversations/${convId}/context`);
}

export function setConversationContext(
  convId: string,
  key: string,
  item: { label: string; mime: string; content: string },
): Promise<void> {
  return putJson<void>(
    `/api/conversations/${convId}/context/${encodeURIComponent(key)}`,
    item,
  );
}

export function removeConversationContext(
  convId: string,
  key: string,
): Promise<void> {
  return del(`/api/conversations/${convId}/context/${encodeURIComponent(key)}`);
}
