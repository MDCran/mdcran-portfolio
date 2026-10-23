"use client";
import { useState } from "react";















import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";







import { Contact, uid, inputCls, textareaCls, btnRed, btnGhost, Label, Field, Modal } from './AdminShared';

export default function ContactEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Contact | null;
  onClose: () => void;
  onSave: (contact: Contact) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [subscribed, setSubscribed] = useState(initial?.subscribed ?? true);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [error, setError] = useState("");

  function handleSave() {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setError("Email or phone is required.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setError("Enter a valid phone number.");
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      email: trimmedEmail ? trimmedEmail.toLowerCase() : undefined,
      phone: trimmedPhone || undefined,
      subject: subject.trim() || "Admin Contact",
      message: message.trim() || "Added from the admin center.",
      source: "admin-center",
      subscribed,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      messageRead: initial?.messageRead ?? true,
      messageReadAt: initial?.messageReadAt ?? now,
    });
  }

  return (
    <Modal title={initial ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label required>Name</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" />
          </Field>
          <Field>
            <Label>Email</Label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field>
            <Label>Phone</Label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </Field>
          <Field>
            <Label>Subscribed</Label>
            <button
              type="button"
              className={`h-9 rounded-sm border text-xs transition-colors ${
                subscribed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/4 text-white/45 hover:text-white"
              }`}
              onClick={() => setSubscribed((prev) => !prev)}
            >
              {subscribed ? "Subscribed" : "Not Subscribed"}
            </button>
          </Field>
        </div>
        <Field>
          <Label>Subject</Label>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Admin Contact" />
        </Field>
        <Field>
          <Label>Notes</Label>
          <textarea className={textareaCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Added from the admin center." />
        </Field>
        {error && <p className="text-[11px] text-[#ef4242]">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={`${btnGhost} cursor-pointer`} onClick={onClose}>Cancel</button>
        <button className={`${btnRed} cursor-pointer`} onClick={handleSave}>Save Contact</button>
      </div>
    </Modal>
  );
}
