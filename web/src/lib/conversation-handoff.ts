export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}
let pending: ConversationTurn[] = [];
/** Ephemeral cross-mode transfer. Nothing is written to browser storage. */
export function offerConversation(turns: ConversationTurn[]) {
  pending = turns
    .filter(
      (t) =>
        t.content.trim() &&
        !/^__(WELCOME|INACTIVITY|DISCONNECT|RECONNECT)/.test(t.content),
    )
    .slice(-12);
}
export function takeConversation(): ConversationTurn[] {
  const turns = pending;
  pending = [];
  return turns;
}
export function clearConversationHandoff() {
  pending = [];
}
