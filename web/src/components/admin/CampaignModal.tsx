"use client";
import LabeledField from "./LabeledField";
import { useState } from "react";










import DatePicker from "@/components/shared/DatePicker";





import type { CampaignType } from "@/lib/types";






import { Contact, Campaign, uid, inputCls, textareaCls, Label, Field, Modal, stripHtmlPreview, toLocalDateTimeInputValue } from './AdminShared';

export default function CampaignModal({
  initial,
  contacts,
  onClose,
  onSave,
}: {
  initial?: Campaign;
  contacts: Contact[];
  onClose: () => void;
  onSave: (campaign: Campaign, action: "draft" | "schedule" | "send") => Promise<void>;
}) {
  const [type, setType] = useState<CampaignType>(initial?.type ?? "email");
  const [recipientMode, setRecipientMode] = useState<"all" | "specific">(initial?.recipientMode ?? "all");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(initial?.contactIds ?? []);
  const [contactSearch, setContactSearch] = useState("");
  const [bodySource, setBodySource] = useState<"text" | "html">(initial?.bodySource ?? "text");
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? "");
  const [htmlFileName, setHtmlFileName] = useState(initial?.htmlFileName ?? "");
  const [scheduledFor, setScheduledFor] = useState(
    initial?.scheduledFor ? toLocalDateTimeInputValue(initial.scheduledFor) : ""
  );
  const [savingAction, setSavingAction] = useState<"draft" | "schedule" | "send" | null>(null);
  const [error, setError] = useState("");

  const eligibleContacts = contacts.filter((contact) =>
    type === "email" ? Boolean(contact.email) : Boolean(contact.phone)
  );
  const filteredEligibleContacts = eligibleContacts.filter((contact) => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.email ?? "").toLowerCase().includes(q) ||
      (contact.phone ?? "").toLowerCase().includes(q)
    );
  });

  const recipients =
    recipientMode === "all"
      ? eligibleContacts.length
      : selectedContactIds.filter((id) => eligibleContacts.some((contact) => contact.id === id)).length;

  function toggleContact(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  async function handleSave(action: "draft" | "schedule" | "send") {
    const resolvedBodySource = type === "email" ? bodySource : "text";

    if (type === "email" && !subject.trim()) {
      setError("Email campaigns need a subject.");
      return;
    }
    if (resolvedBodySource === "text" && !message.trim()) {
      setError("Message body is required.");
      return;
    }
    if (type === "email" && resolvedBodySource === "html" && !htmlBody.trim()) {
      setError("Upload an HTML file for the email body.");
      return;
    }
    if (recipientMode === "specific" && recipients === 0) {
      setError("Pick at least one recipient.");
      return;
    }
    if (action === "schedule" && !scheduledFor) {
      setError("Choose a date and time to schedule this.");
      return;
    }

    const scheduledDate =
      action === "schedule" ? new Date(scheduledFor) : null;
    if (action === "schedule" && (!scheduledDate || Number.isNaN(scheduledDate.getTime()))) {
      setError("Choose a valid date and time to schedule this.");
      return;
    }

    setError("");
    setSavingAction(action);

    try {
      const now = new Date().toISOString();
      await onSave(
        {
          id: initial?.id ?? uid(),
          type,
          subject: type === "email" ? subject.trim() : undefined,
          message: resolvedBodySource === "text" ? message.trim() : stripHtmlPreview(htmlBody),
          status:
            action === "send"
              ? "sent"
              : action === "schedule"
                ? "scheduled"
                : "draft",
          recipients,
          recipientMode,
          contactIds:
            recipientMode === "specific"
              ? selectedContactIds
              : eligibleContacts.map((contact) => contact.id),
          bodySource: resolvedBodySource,
          htmlBody: type === "email" && resolvedBodySource === "html" ? htmlBody : undefined,
          htmlFileName: type === "email" && resolvedBodySource === "html" ? htmlFileName || undefined : undefined,
          scheduledFor: action === "schedule" ? scheduledDate!.toISOString() : undefined,
          createdAt: initial?.createdAt ?? now,
          updatedAt: now,
          sentAt: action === "send" ? now : initial?.sentAt,
          lastError: undefined,
        },
        action
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save campaign.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <Modal title={initial ? "Edit Compose" : "Compose"} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <LabeledField label="Type">
            <select
              className={inputCls}
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as CampaignType;
                setType(nextType);
                if (nextType === "sms") {
                  setBodySource("text");
                }
              }}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </LabeledField>
          {type === "email" && (
            <LabeledField label="Body Source">
              <select
                className={inputCls}
                value={bodySource}
                onChange={(e) => setBodySource(e.target.value as "text" | "html")}
              >
                <option value="text">Typed Body</option>
                <option value="html">HTML File</option>
              </select>
            </LabeledField>
          )}
        </div>

        {type === "email" && (
          <LabeledField label="Subject" required>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Campaign subject line" />
          </LabeledField>
        )}

        {type === "email" && (
          <p className="text-[11px] text-white/35">
            Email campaigns send through Resend. Use a typed body for simple emails or upload an HTML file for fully formatted layouts.
          </p>
        )}

        {(type === "sms" || bodySource === "text") && (
          <LabeledField label="Message" required>
            <textarea
              className={textareaCls}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === "email" ? "Email body" : "Text message body"}
            />
          </LabeledField>
        )}

        {type === "email" && bodySource === "html" && (
          <Field>
            <Label required>HTML Email Template</Label>
            <input
              type="file"
              accept=".html,text/html"
              className="block w-full text-xs text-white/55 file:mr-3 file:h-9 file:px-3 file:border-0 file:rounded-sm file:bg-white/8 file:text-white file:text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setHtmlBody("");
                  setHtmlFileName("");
                  return;
                }
                setHtmlBody(await file.text());
                setHtmlFileName(file.name);
              }}
            />
            {htmlFileName && (
              <p className="mt-2 text-[11px] text-white/35">Loaded template: {htmlFileName}</p>
            )}
            {htmlBody && (
              <div className="mt-3 overflow-hidden rounded-sm border border-white/8 bg-white/4">
                <div className="border-b border-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                  Template Preview
                </div>
                <iframe
                  title="Email template preview"
                  srcDoc={htmlBody}
                  className="h-56 w-full bg-white"
                />
              </div>
            )}
          </Field>
        )}

        <Field>
          <Label>Recipients</Label>
          <select className={inputCls} value={recipientMode} onChange={(e) => setRecipientMode(e.target.value as "all" | "specific")}>
            <option value="all">All eligible contacts</option>
            <option value="specific">Specific contacts</option>
          </select>
          <p className="text-[11px] text-white/35 mt-2">
            {type === "email" ? "Only contacts with an email address can receive this." : "Only contacts with a phone number can receive this."}
          </p>
        </Field>

        {recipientMode === "specific" && (
          <div className="border border-white/8 rounded-sm p-4 space-y-3 max-h-56 overflow-y-auto">
            <input
              className={inputCls}
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={type === "email" ? "Search name or email" : "Search name or phone"}
            />
            {filteredEligibleContacts.map((contact) => (
              <label key={contact.id} className="flex items-center gap-3 text-xs text-white/70">
                <input
                  type="checkbox"
                  className="accent-[#ef4242]"
                  checked={selectedContactIds.includes(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <span>{contact.name}</span>
                <span className="text-white/35">{type === "email" ? contact.email : contact.phone}</span>
              </label>
            ))}
            {eligibleContacts.length === 0 && (
              <p className="text-xs text-white/25">No eligible contacts yet.</p>
            )}
            {eligibleContacts.length > 0 && filteredEligibleContacts.length === 0 && (
              <p className="text-xs text-white/25">No contacts match that search.</p>
            )}
          </div>
        )}

        <Field>
          <Label>Schedule</Label>
          <DatePicker withTime value={scheduledFor} onChange={setScheduledFor} placeholder="Pick date & time" />
          <p className="mt-2 text-[11px] text-white/35">
            Uses your local browser time. Draft and Send ignore this.
          </p>
        </Field>

        <div className="text-xs text-white/40">
          Recipient count: {recipients}
        </div>
        {initial?.lastError && (
          <p className="text-[11px] text-[#ef4242]">Last error: {initial.lastError}</p>
        )}
        {error && (
          <p className="text-[11px] text-[#ef4242]">{error}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={() => void handleSave("draft")}
          disabled={savingAction !== null}
        >
          {savingAction === "draft" ? "Saving..." : "Draft"}
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={() => void handleSave("schedule")}
          disabled={savingAction !== null}
        >
          {savingAction === "schedule" ? "Scheduling..." : "Schedule"}
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm bg-[#ef4242] text-xs text-white transition-colors hover:bg-[#d93838]"
          onClick={() => void handleSave("send")}
          disabled={savingAction !== null}
        >
          {savingAction === "send" ? "Sending..." : "Send"}
        </button>
      </div>
    </Modal>
  );
}
