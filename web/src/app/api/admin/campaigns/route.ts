import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCampaignRecipientSnapshot, sendCampaign } from "@/lib/campaign-delivery";
import type { Campaign, ContactSubmission } from "@/lib/types";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

async function processDueCampaigns(db: Awaited<ReturnType<typeof getDb>>) {
  const now = new Date().toISOString();
  const dueCampaigns = await db
    .collection("campaigns")
    .find<Campaign>({
      status: "scheduled",
      scheduledFor: { $lte: now },
    })
    .toArray();

  if (dueCampaigns.length === 0) {
    return;
  }

  const contacts = await db.collection("contacts").find<ContactSubmission>({}).toArray();

  for (const campaign of dueCampaigns) {
    try {
      const result = await sendCampaign(campaign, contacts);
      const fullyDelivered = result.remainingCount === 0;
      await db.collection("campaigns").updateOne(
        { id: campaign.id },
        {
          $set: stripUndefined({
            status: fullyDelivered ? "sent" : "draft",
            sentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            recipients: result.totalCount,
            deliveredContactIds: result.deliveredIds,
            deliveryLog: result.deliveryLog,
            scheduledFor: undefined,
            lastError: undefined,
          }),
        }
      );
    } catch (error) {
      await db.collection("campaigns").updateOne(
        { id: campaign.id },
        {
          $set: stripUndefined({
            status: "draft",
            updatedAt: new Date().toISOString(),
            lastError: error instanceof Error ? error.message : "Failed to send scheduled campaign.",
          }),
        }
      );
    }
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  await processDueCampaigns(db);
  const data = await db
    .collection("campaigns")
    .find<Campaign>({})
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = (await req.json()) as Campaign[];
  const db = await getDb();
  await db.collection("campaigns").deleteMany({});
  if (data.length) {
    await db.collection("campaigns").insertMany(data as unknown as Record<string, unknown>[]);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const db = await getDb();

    if (body.action === "process-due") {
      await processDueCampaigns(db);
      const data = await db
        .collection("campaigns")
        .find<Campaign>({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(data);
    }

    const campaign = body.campaign as Campaign | undefined;
    const action = body.action as "draft" | "schedule" | "send" | undefined;
    const batchSize =
      typeof body.batchSize === "number" && Number.isFinite(body.batchSize)
        ? Math.max(1, Math.floor(body.batchSize))
        : undefined;

    if (!campaign || !action) {
      return NextResponse.json({ error: "Campaign and action are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const contacts = await db.collection("contacts").find<ContactSubmission>({}).toArray();
    const contactIds =
      campaign.contactIds && campaign.contactIds.length > 0
        ? campaign.contactIds
        : getCampaignRecipientSnapshot(campaign, contacts).map((contact) => contact.id);

    const normalizedCampaign: Campaign = {
      ...campaign,
      contactIds,
      recipients: contactIds.length,
      updatedAt: now,
      status:
        action === "send"
          ? "sent"
          : action === "schedule"
            ? "scheduled"
            : "draft",
    };

    if (action === "send") {
      try {
        const result = await sendCampaign(normalizedCampaign, contacts, batchSize);
        normalizedCampaign.recipients = result.totalCount;
        normalizedCampaign.deliveredContactIds = result.deliveredIds;
        normalizedCampaign.deliveryLog = result.deliveryLog;
        normalizedCampaign.sentAt = now;
        normalizedCampaign.scheduledFor = undefined;
        normalizedCampaign.status = result.remainingCount === 0 ? "sent" : "draft";
        normalizedCampaign.lastError = undefined;
      } catch (error) {
        normalizedCampaign.status = "draft";
        normalizedCampaign.lastError =
          error instanceof Error ? error.message : "Failed to send campaign.";
        await db.collection("campaigns").updateOne(
          { id: normalizedCampaign.id },
          { $set: stripUndefined(normalizedCampaign as Record<string, unknown>) },
          { upsert: true }
        );
        return NextResponse.json(
          { error: normalizedCampaign.lastError, campaign: normalizedCampaign },
          { status: 400 }
        );
      }
    }

    if (action === "schedule" && !normalizedCampaign.scheduledFor) {
      return NextResponse.json({ error: "Scheduled time is required." }, { status: 400 });
    }

    const { createdAt, ...campaignUpdate } = normalizedCampaign;
    const cleanCampaignUpdate = stripUndefined(campaignUpdate as Record<string, unknown>);
    await db.collection("campaigns").updateOne(
      { id: normalizedCampaign.id },
      {
        $setOnInsert: {
          createdAt: createdAt || now,
        },
        $set: cleanCampaignUpdate,
      },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      campaign: {
        ...cleanCampaignUpdate,
        createdAt: createdAt || now,
      },
    });
  } catch (error) {
    console.error("Admin campaign save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save campaign.",
      },
      { status: 500 }
    );
  }
}
