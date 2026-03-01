import type { Campaign, ContactSubmission } from "@/lib/types";

const EMAIL_BATCH_LIMIT = 100;

let twilioClient: {
  messages: { create: (opts: { body: string; from: string; to: string }) => Promise<void> };
} | null = null;

async function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (twilioClient) {
    return twilioClient;
  }

  const { default: twilio } = await import("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  ) as unknown as NonNullable<typeof twilioClient>;
  return twilioClient;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTargetRecipients(
  campaign: Campaign,
  contacts: ContactSubmission[]
): ContactSubmission[] {
  const eligibleContacts = contacts.filter((contact) => {
    if (!contact.subscribed) {
      return false;
    }
    return campaign.type === "email" ? Boolean(contact.email) : Boolean(contact.phone);
  });

  const targetIds = new Set(campaign.contactIds ?? []);
  if (targetIds.size > 0) {
    return eligibleContacts.filter((contact) => targetIds.has(contact.id));
  }

  if (campaign.recipientMode === "specific") {
    return [];
  }

  return eligibleContacts;
}

export function getCampaignRecipientSnapshot(
  campaign: Campaign,
  contacts: ContactSubmission[]
): ContactSubmission[] {
  return getTargetRecipients(campaign, contacts);
}

export function getCampaignRemainingRecipients(
  campaign: Campaign,
  contacts: ContactSubmission[]
): ContactSubmission[] {
  const deliveredIds = new Set(campaign.deliveredContactIds ?? []);
  return getTargetRecipients(campaign, contacts).filter((contact) => !deliveredIds.has(contact.id));
}

async function sendWithResend(campaign: Campaign, recipients: ContactSubmission[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const subject = campaign.subject?.trim();
  if (!subject) {
    throw new Error("Email campaigns require a subject.");
  }

  const from = process.env.RESEND_FROM ?? "updates@mdcran.com";
  const useHtmlTemplate = campaign.bodySource === "html" && campaign.htmlBody?.trim();
  const html = useHtmlTemplate
    ? String(campaign.htmlBody)
    : campaign.message
        .split("\n")
        .map((line) => line || "&nbsp;")
        .join("<br />");
  const text = useHtmlTemplate ? stripHtml(String(campaign.htmlBody)) : campaign.message;

  await Promise.all(
    recipients.map(async (recipient) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [String(recipient.email)],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : `Resend request failed with ${response.status}.`
        );
      }
    })
  );
}

export async function sendCampaign(
  campaign: Campaign,
  contacts: ContactSubmission[],
  requestedBatchSize?: number
): Promise<{
  batchCount: number;
  deliveredIds: string[];
  deliveryLog: Array<{ contactId: string; deliveredAt: string }>;
  remainingCount: number;
  totalCount: number;
}> {
  const remainingRecipients = getCampaignRemainingRecipients(campaign, contacts);
  const totalCount = getTargetRecipients(campaign, contacts).length;

  if (remainingRecipients.length === 0) {
    return {
      batchCount: 0,
      deliveredIds: campaign.deliveredContactIds ?? [],
      deliveryLog: campaign.deliveryLog ?? [],
      remainingCount: 0,
      totalCount,
    };
  }

  const normalizedRequestedBatchSize =
    typeof requestedBatchSize === "number" && Number.isFinite(requestedBatchSize)
      ? Math.max(1, Math.floor(requestedBatchSize))
      : undefined;

  const shuffledRecipients = [...remainingRecipients].sort(() => Math.random() - 0.5);

  if (campaign.type === "sms") {
    const twilio = await getTwilio();
    if (!twilio) {
      throw new Error("Twilio is not configured.");
    }

    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
      throw new Error("TWILIO_PHONE_NUMBER is not configured.");
    }

    const smsBatchRecipients = normalizedRequestedBatchSize
      ? shuffledRecipients.slice(0, normalizedRequestedBatchSize)
      : shuffledRecipients;

    await Promise.all(
      smsBatchRecipients.map((recipient) =>
        twilio.messages.create({
          body: campaign.message,
          from,
          to: String(recipient.phone),
        })
      )
    );

    const deliveredAt = new Date().toISOString();

    return {
      batchCount: smsBatchRecipients.length,
      deliveredIds: [
        ...(campaign.deliveredContactIds ?? []),
        ...smsBatchRecipients.map((recipient) => recipient.id),
      ],
      deliveryLog: [
        ...(campaign.deliveryLog ?? []),
        ...smsBatchRecipients.map((recipient) => ({
          contactId: recipient.id,
          deliveredAt,
        })),
      ],
      remainingCount: 0,
      totalCount,
    };
  }

  const batchSize = Math.min(
    normalizedRequestedBatchSize ?? EMAIL_BATCH_LIMIT,
    EMAIL_BATCH_LIMIT
  );
  const batchRecipients = shuffledRecipients.slice(0, batchSize);
  await sendWithResend(campaign, batchRecipients);
  const deliveredAt = new Date().toISOString();

  return {
    batchCount: batchRecipients.length,
    deliveredIds: [
      ...(campaign.deliveredContactIds ?? []),
      ...batchRecipients.map((recipient) => recipient.id),
    ],
    deliveryLog: [
      ...(campaign.deliveryLog ?? []),
      ...batchRecipients.map((recipient) => ({
        contactId: recipient.id,
        deliveredAt,
      })),
    ],
    remainingCount: remainingRecipients.length - batchRecipients.length,
    totalCount,
  };
}
