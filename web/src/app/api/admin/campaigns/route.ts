import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCampaignRecipientSnapshot } from "@/lib/campaign-delivery";
import { processCampaignJobs } from "@/lib/campaign-jobs";
import { recordOperation } from "@/lib/operations";
import { adminError, mutateContent, saveContentBatch } from "@/lib/admin-content";
import { AdminDataError } from "@/lib/content-validation";
import { paginateCollection } from "@/lib/admin-pagination";
import type { Campaign, ContactSubmission } from "@/lib/types";

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (req.nextUrl.searchParams.has("limit")) return NextResponse.json(await paginateCollection("campaigns", req.nextUrl.searchParams, ["subject", "message"]));
  // Reading the dashboard never sends messages.
  return NextResponse.json(await (await getDb()).collection("campaigns").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray());
}
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await saveContentBatch("campaigns", await req.json());
    return NextResponse.json({ ok: true, records: await (await getDb()).collection("campaigns").find({}, { projection: { _id: 0 } }).toArray() });
  } catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const db = await getDb();
    if (body.action === "process-due") {
      await recordOperation("campaigns", () => processCampaignJobs());
      return NextResponse.json(await db.collection("campaigns").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray());
    }
    if (!["draft", "schedule", "send"].includes(body.action) || !body.campaign) throw new AdminDataError("Campaign and action are required");
    const campaign = body.campaign as Campaign & { _version?: number };
    if (!["email", "sms"].includes(campaign.type) || (!campaign.message?.trim() && !campaign.htmlBody?.trim())) throw new AdminDataError("A valid channel and message are required");
    if (campaign.type === "email" && !campaign.subject?.trim()) throw new AdminDataError("Email campaigns require a subject");
    if (body.action === "schedule" && (!campaign.scheduledFor || !Number.isFinite(Date.parse(campaign.scheduledFor)))) throw new AdminDataError("A valid scheduled time is required");
    const current = await db.collection("campaigns").findOne<Campaign>({ id: campaign.id });
    const busy = await db.collection("campaignJobs").findOne({ campaignId: campaign.id, leaseUntil: { $gt: new Date() } });
    if (busy) throw new AdminDataError("This campaign is delivering. Try again after the job finishes.", 409);
    if (current?.deliveredContactIds?.length && (current.message !== campaign.message || current.htmlBody !== campaign.htmlBody || current.subject !== campaign.subject || current.type !== campaign.type)) throw new AdminDataError("Duplicate this campaign to change content after delivery has started.", 409);
    const contacts = await db.collection("contacts").find<ContactSubmission>({ subscribed: true }).toArray();
    const contactIds = campaign.contactIds?.length ? campaign.contactIds : getCampaignRecipientSnapshot(campaign, contacts).map((contact) => contact.id);
    const record = { ...campaign, contactIds, recipientMode: "specific", recipients: contactIds.length, deliveredContactIds: current?.deliveredContactIds ?? [], deliveryLog: current?.deliveryLog ?? [], createdAt: current?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), status: body.action === "draft" ? "draft" : "scheduled", scheduledFor: body.action === "send" ? new Date().toISOString() : campaign.scheduledFor };
    await mutateContent({ collection: "campaigns", id: campaign.id, expectedVersion: campaign._version ?? 0, action: "save", record });
    if (body.action === "send") await recordOperation("campaigns", () => processCampaignJobs({ campaignId: campaign.id, batchSize: body.batchSize }));
    return NextResponse.json({ ok: true, campaign: await db.collection("campaigns").findOne({ id: campaign.id }, { projection: { _id: 0 } }) });
  } catch (error) { return adminError(error); }
}
