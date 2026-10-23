import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { getCampaignRecipientSnapshot, sendCampaign } from "@/lib/campaign-delivery";
import type { Campaign, ContactSubmission } from "@/lib/types";

type Deliver = (campaign: Campaign, contact: ContactSubmission) => Promise<void>;
const deliverRecipient: Deliver = async (campaign, contact) => {
  await sendCampaign({ ...campaign, contactIds: [contact.id], recipientMode: "specific", deliveredContactIds: [], deliveryLog: [] }, [contact], 1);
};

/** Provider delivery is injectable so integration tests can never accidentally send messages. */
export async function processCampaignJobs(options: { campaignId?: string; batchSize?: number; deliver?: Deliver } = {}) {
  const db = await getDb();
  await db.collection("campaignDeliveries").createIndex({ campaignId: 1, contactId: 1 }, { unique: true });
  await db.collection("campaignJobs").createIndex({ campaignId: 1 }, { unique: true });
  const now = new Date();
  const candidates = await db.collection("campaigns").find<Campaign>(options.campaignId ? { id: options.campaignId } : { status: "scheduled", scheduledFor: { $lte: now.toISOString() } }).limit(10).toArray();
  const results: Array<{ campaignId: string; sent: number; remaining: number; review: number; busy?: boolean }> = [];
  for (const campaign of candidates) {
    await db.collection("campaignJobs").updateOne({ campaignId: campaign.id }, { $setOnInsert: { leaseUntil: new Date(0) } }, { upsert: true });
    const owner = randomUUID();
    const job = await db.collection("campaignJobs").findOneAndUpdate({ campaignId: campaign.id, leaseUntil: { $lte: now } }, { $set: { owner, leaseUntil: new Date(Date.now() + 300_000), startedAt: new Date() } }, { returnDocument: "after" });
    if (!job) { results.push({ campaignId: campaign.id, sent: 0, remaining: 0, review: 0, busy: true }); continue; }
    let sent = 0;
    try {
      const contacts = await db.collection("contacts").find<ContactSubmission>({ subscribed: true }).toArray();
      const recipients = getCampaignRecipientSnapshot(campaign, contacts);
      // Snapshot before the first send: later subscribers are not silently added to an existing campaign.
      if (!campaign.contactIds?.length && campaign.recipientMode !== "specific") {
        await db.collection("campaigns").updateOne({ id: campaign.id }, { $set: { contactIds: recipients.map((contact) => contact.id), recipientMode: "specific" } });
      }
      for (const contact of recipients) {
        const delivered = (campaign.deliveredContactIds ?? []).includes(contact.id);
        await db.collection("campaignDeliveries").updateOne({ campaignId: campaign.id, contactId: contact.id }, { $setOnInsert: { status: delivered ? "sent" : "pending", createdAt: new Date() } }, { upsert: true });
      }
      // A previous worker may have stopped after provider acceptance. Never blindly resend these rows.
      await db.collection("campaignDeliveries").updateMany({ campaignId: campaign.id, status: "sending" }, { $set: { status: "uncertain", reason: "Previous delivery did not finish checkpointing; verify with provider before resolving." } });
      const limit = Math.min(100, Math.max(1, Number.isFinite(options.batchSize) ? Math.floor(options.batchSize!) : 25));
      for (const contact of recipients) {
        if (sent >= limit || Date.now() - now.getTime() > 30_000) break;
        // Recheck consent immediately before delivery.
        const currentContact = await db.collection("contacts").findOne<ContactSubmission>({ id: contact.id, subscribed: true });
        if (!currentContact) continue;
        const claimed = await db.collection("campaignDeliveries").findOneAndUpdate({ campaignId: campaign.id, contactId: contact.id, status: "pending" }, { $set: { status: "sending", owner, attemptedAt: new Date() } }, { returnDocument: "after" });
        if (!claimed) continue;
        try {
          await (options.deliver ?? deliverRecipient)(campaign, currentContact);
          const deliveredAt = new Date().toISOString();
          await db.collection("campaignDeliveries").updateOne({ _id: claimed._id, owner }, { $set: { status: "sent", deliveredAt } });
          await db.collection<Campaign>("campaigns").updateOne({ id: campaign.id }, { $addToSet: { deliveredContactIds: contact.id }, $push: { deliveryLog: { contactId: contact.id, deliveredAt } }, $set: { updatedAt: deliveredAt } });
          sent += 1;
        } catch {
          await db.collection("campaignDeliveries").updateOne({ _id: claimed._id, owner }, { $set: { status: "uncertain", reason: "Delivery outcome needs provider confirmation. Automatic resend is disabled." } });
        }
      }
      const eligibleIds = recipients.map((contact) => contact.id);
      const remaining = await db.collection("campaignDeliveries").countDocuments({ campaignId: campaign.id, contactId: { $in: eligibleIds }, status: "pending" });
      const review = await db.collection("campaignDeliveries").countDocuments({ campaignId: campaign.id, status: "uncertain" });
      const complete = remaining === 0 && review === 0;
      await db.collection("campaigns").updateOne({ id: campaign.id }, { $set: { status: complete ? "sent" : review ? "draft" : "scheduled", scheduledFor: new Date().toISOString(), recipients: recipients.length, ...(complete ? { sentAt: new Date().toISOString() } : {}), lastError: review ? `${review} recipient deliveries need provider confirmation.` : "" } });
      results.push({ campaignId: campaign.id, sent, remaining, review });
    } finally {
      await db.collection("campaignJobs").updateOne({ campaignId: campaign.id, owner }, { $set: { leaseUntil: new Date(0), finishedAt: new Date() } });
    }
  }
  return { campaigns: results };
}
