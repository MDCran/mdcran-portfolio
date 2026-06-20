/* ─────────────────────────────────────────────────────────────────────────────
   AI Conversation Log — unified persistence for text + voice chat.

   Both the text chat (ChatPanel) and the voice concierge (VoiceMode) POST to
   /api/chat, so logging at that single chokepoint captures every turn. Messages
   carry the device `serial`; when that serial later joins an identity (QR bridge,
   suggestion, admin merge) the admin feed retroactively pulls every past message
   for ALL of the identity's serials — no rewrite needed.
   ──────────────────────────────────────────────────────────────────────────── */

import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import { findIdentityBySerial } from "./identity";
import type { AiConversation, AiMessage, AiChannel } from "./types";

const CONV = "aiConversations";
const MSG = "aiMessages";

function nowIso() { return new Date().toISOString(); }

let indexesEnsured = false;
async function ensureIndexes(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await db.collection(CONV).createIndex({ sessionId: 1, channel: 1 });
    await db.collection(CONV).createIndex({ identityId: 1 });
    await db.collection(CONV).createIndex({ serial: 1 });
    await db.collection(MSG).createIndex({ conversationId: 1, createdAt: 1 });
    await db.collection(MSG).createIndex({ identityId: 1 });
    await db.collection(MSG).createIndex({ serial: 1 });
    await db.collection(MSG).createIndex({ createdAt: 1 });
  } catch {
    indexesEnsured = false;
  }
}

function mkMsg(
  conversationId: string,
  sessionId: string,
  serial: string | null,
  identityId: string | null,
  channel: AiChannel,
  role: "user" | "assistant",
  content: string,
  currentPage: string | null,
  createdAt: string,
): AiMessage {
  return {
    id: randomUUID(),
    conversationId,
    sessionId,
    serial,
    identityId,
    channel,
    role,
    content: content.slice(0, 8000),
    currentPage,
    createdAt,
  };
}

export interface LogAiTurnInput {
  sessionId: string;
  serial: string | null;
  channel: AiChannel;
  currentPage?: string | null;
  userText: string;
  assistantText: string;
  identityId?: string | null;
  ip?: string | null;
  country?: string | null;
}

/** Persist one user+assistant exchange. Fire-and-forget — never throws. */
export async function logAiTurn(input: LogAiTurnInput): Promise<void> {
  try {
    const sessionId = (input.sessionId || "").slice(0, 80);
    if (!sessionId) return;
    const userText = (input.userText || "").trim();
    const assistantText = (input.assistantText || "").trim();
    if (!userText && !assistantText) return;

    const serial = input.serial ? input.serial.slice(0, 64) : null;
    const db = await getDb();
    await ensureIndexes(db);
    const t = nowIso();
    const currentPage = input.currentPage ?? null;

    // Resolve identity by serial if the caller did not supply one.
    let identityId = input.identityId ?? null;
    if (!identityId && serial) {
      const idn = await findIdentityBySerial(serial).catch(() => null);
      identityId = idn?.id ?? null;
    }

    const turns = (userText ? 1 : 0) + (assistantText ? 1 : 0);

    // One conversation per (sessionId, channel).
    const existing = await db.collection(CONV).findOne({ sessionId, channel: input.channel });
    let conversationId: string;
    if (existing) {
      conversationId = existing.id as string;
      await db.collection(CONV).updateOne(
        { id: conversationId },
        {
          $set: {
            lastAt: t,
            currentPage,
            ...(identityId ? { identityId } : {}),
            ...(serial ? { serial } : {}),
          },
          $inc: { messageCount: turns },
        },
      );
    } else {
      conversationId = randomUUID();
      const header: AiConversation = {
        id: conversationId,
        sessionId,
        serial,
        identityId,
        channel: input.channel,
        currentPage,
        messageCount: turns,
        startedAt: t,
        lastAt: t,
        ip: input.ip ?? null,
        country: input.country ?? null,
      };
      await db.collection(CONV).insertOne(header as unknown as Record<string, unknown>);
    }

    const docs: AiMessage[] = [];
    if (userText) docs.push(mkMsg(conversationId, sessionId, serial, identityId, input.channel, "user", userText, currentPage, t));
    // +1ms so the assistant reliably sorts after the user turn at the same instant.
    if (assistantText) {
      const at = new Date(Date.parse(t) + 1).toISOString();
      docs.push(mkMsg(conversationId, sessionId, serial, identityId, input.channel, "assistant", assistantText, currentPage, at));
    }
    if (docs.length) await db.collection(MSG).insertMany(docs as unknown as Record<string, unknown>[]);

    // Backfill identityId onto this device's earlier orphan messages once known.
    if (identityId && serial) {
      void db.collection(MSG).updateMany({ serial, identityId: null }, { $set: { identityId } }).catch(() => {});
      void db.collection(CONV).updateMany({ serial, identityId: null }, { $set: { identityId } }).catch(() => {});
    }
  } catch (err) {
    console.error("[ai-conversations] logAiTurn", err);
  }
}

/** All conversations + messages for an identity — joined across every serial it
 *  owns plus anything already tagged with the identityId. Chronological. */
export async function getConversationsForIdentity(
  identityId: string,
  serials: string[],
): Promise<{ conversations: AiConversation[]; messages: AiMessage[] }> {
  const db = await getDb();
  const or: Record<string, unknown>[] = [{ identityId }];
  const cleanSerials = serials.filter(Boolean);
  if (cleanSerials.length) or.push({ serial: { $in: cleanSerials } });

  const [conversations, messages] = await Promise.all([
    db.collection(CONV).find({ $or: or }, { projection: { _id: 0 } }).sort({ lastAt: -1 }).limit(200).toArray(),
    db.collection(MSG).find({ $or: or }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(3000).toArray(),
  ]);

  return {
    conversations: conversations as unknown as AiConversation[],
    messages: messages as unknown as AiMessage[],
  };
}

/** Drop conversation logs older than the retention window (cron housekeeping). */
export async function pruneAiConversations(maxAgeDays = 90): Promise<{ conversations: number; messages: number }> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const [m, c] = await Promise.all([
    db.collection(MSG).deleteMany({ createdAt: { $lt: cutoff } }),
    db.collection(CONV).deleteMany({ lastAt: { $lt: cutoff } }),
  ]);
  return { messages: m.deletedCount ?? 0, conversations: c.deletedCount ?? 0 };
}
