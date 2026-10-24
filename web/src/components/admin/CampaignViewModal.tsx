"use client";
import LabeledField from "./LabeledField";
import { useState } from "react";























import { Contact, Campaign, fmtDateTime, campaignDeliveredCount, campaignRemainingCount, inputCls, btnGhost, Label, Field, Modal } from './AdminShared';

export default function CampaignViewModal({
  campaign,
  contacts,
  onSendBatch,
  onClose,
}: {
  campaign: Campaign;
  contacts: Contact[];
  onSendBatch: (campaign: Campaign, count: number) => Promise<void>;
  onClose: () => void;
}) {
  const [batchCount, setBatchCount] = useState(() =>
    String(Math.min(10, Math.max(campaignRemainingCount(campaign), 1), 100))
  );
  const [sendError, setSendError] = useState("");
  const [sendingBatch, setSendingBatch] = useState(false);
  const deliveredContacts = (campaign.deliveryLog ?? [])
    .map((entry) => ({
      entry,
      contact: contacts.find((contact) => contact.id === entry.contactId),
    }))
    .filter((item) => item.contact);

  async function handleSendBatch() {
    const count = Math.max(1, Math.min(100, Math.floor(Number(batchCount) || 0)));
    if (!count) {
      setSendError("Choose a batch size between 1 and 100.");
      return;
    }

    setSendError("");
    setSendingBatch(true);
    try {
      await onSendBatch(campaign, count);
      onClose();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send batch.");
    } finally {
      setSendingBatch(false);
    }
  }

  return (
    <Modal title="Message Details" onClose={onClose} wide>
      <div className="space-y-4 p-6 text-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label>Type</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.type.toUpperCase()}
            </div>
          </Field>
          <Field>
            <Label>Status</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.status}
            </div>
          </Field>
        </div>

        {campaign.subject && (
          <Field>
            <Label>Subject</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.subject}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label>Created</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.createdAt)}
            </div>
          </Field>
          <Field>
            <Label>Recipients</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.recipients}
            </div>
          </Field>
        </div>

        <Field>
          <Label>Body Type</Label>
          <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
            {campaign.type === "sms"
              ? "SMS Text"
              : campaign.bodySource === "html"
                ? "HTML Template via Resend"
                : "Typed Email Body via Resend"}
          </div>
        </Field>

        {campaign.type === "email" && campaign.recipients > 0 && (
          <Field>
            <Label>Delivery Progress</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaignDeliveredCount(campaign)} sent, {campaignRemainingCount(campaign)} remaining
            </div>
          </Field>
        )}

        {campaign.type === "email" && campaignRemainingCount(campaign) > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr] md:items-end">
            <LabeledField label="Send Next">
              <input
                type="number"
                min={1}
                max={Math.min(100, campaignRemainingCount(campaign))}
                className={inputCls}
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
              />
            </LabeledField>
            <button
              className="inline-flex h-10 w-[140px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
              onClick={() => void handleSendBatch()}
              disabled={sendingBatch}
            >
              {sendingBatch ? "Sending..." : "Send Batch"}
            </button>
          </div>
        )}

        {campaign.scheduledFor && (
          <Field>
            <Label>Scheduled For</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.scheduledFor)}
            </div>
          </Field>
        )}

        {campaign.sentAt && (
          <Field>
            <Label>Sent At</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.sentAt)}
            </div>
          </Field>
        )}

        {campaign.htmlFileName && (
          <Field>
            <Label>HTML Template</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.htmlFileName}
            </div>
          </Field>
        )}

        {campaign.type === "email" && campaign.bodySource === "html" && campaign.htmlBody && (
          <Field>
            <Label>HTML Preview</Label>
            <div className="overflow-hidden rounded-sm border border-white/8 bg-white/4">
              <iframe
                title="Stored email HTML preview"
                srcDoc={campaign.htmlBody}
                className="h-64 w-full bg-white"
              />
            </div>
          </Field>
        )}

        <Field>
          <Label>{campaign.type === "email" && campaign.bodySource === "html" ? "Text Fallback / Summary" : "Message"}</Label>
          <div className="whitespace-pre-wrap rounded-sm border border-white/8 bg-white/4 px-3 py-3 text-white/70">
            {campaign.message}
          </div>
        </Field>

        {deliveredContacts.length > 0 && (
          <Field>
            <Label>Delivery Log</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-sm border border-white/8 bg-white/4 p-3">
              {deliveredContacts.map(({ entry, contact }) => (
                <div
                  key={`${entry.contactId}-${entry.deliveredAt}`}
                  className="flex flex-col gap-1 border-b border-white/6 pb-2 text-[11px] text-white/65 last:border-0 last:pb-0"
                >
                  <span>{contact?.name || entry.contactId}</span>
                  <span className="text-white/35">
                    {contact?.email || contact?.phone || entry.contactId}
                  </span>
                  <span className="text-white/25">{fmtDateTime(entry.deliveredAt)}</span>
                </div>
              ))}
            </div>
          </Field>
        )}

        {campaign.lastError && (
          <p className="text-[11px] text-[#ef4242]">Last error: {campaign.lastError}</p>
        )}
        {sendError && (
          <p className="text-[11px] text-[#ef4242]">{sendError}</p>
        )}
      </div>
      <div className="flex justify-end border-t border-white/8 px-6 py-4">
        <button className={`${btnGhost} w-[120px]`} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
