"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Zap,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import type {
  AiRoutingCondition,
  ConditionField,
  ConditionOperator,
  UtmLink,
} from "@/lib/types";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const TRIGGER_FIELDS: { value: ConditionField; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "referrer_domain", label: "Referrer Domain" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "utm_medium", label: "UTM Medium" },
];

/** Plain-English explanation of each trigger field, shown in the (?) tooltip. */
const FIELD_HELP: Record<ConditionField, string> = {
  source:
    "The normalized channel we resolved for the visitor (e.g. LinkedIn). This is our cleaned-up label, not the raw query param.",
  utm_source:
    "The raw value of the ?utm_source= parameter on the link the visitor clicked (e.g. linkedin, newsletter).",
  referrer_domain:
    "The website the visitor came from (the referring domain), e.g. linkedin.com or google.com.",
  utm_campaign:
    "The raw value of the ?utm_campaign= parameter (e.g. spring-outreach).",
  utm_medium:
    "The raw value of the ?utm_medium= parameter (e.g. social, email, cpc).",
};

const OPERATORS: { value: ConditionOperator; label: string }[][] = [
  [
    { value: "equals", label: "equals" },
    { value: "includes", label: "includes" },
    { value: "starts_with", label: "starts with" },
    { value: "not_equals", label: "not equals" },
    { value: "is_any_of", label: "is any of" },
  ],
];

const ALL_OPERATORS = OPERATORS[0];

/** Which trigger fields can pull suggestions from saved UTM links. */
const UTM_FIELD_KEY: Partial<Record<ConditionField, "source" | "campaign" | "medium">> = {
  utm_source: "source",
  utm_campaign: "campaign",
  utm_medium: "medium",
};

const GUARDRAIL_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "not_equals", label: "not equals" },
  { value: "equals", label: "equals" },
];

/* ─── Blank form ─────────────────────────────────────────────────────────── */

type FormState = {
  name: string;
  triggerField: ConditionField;
  triggerOperator: ConditionOperator;
  triggerValue: string;
  triggerValues: string[];
  guardrailEnabled: boolean;
  guardrailOperator: ConditionOperator;
  guardrailValue: string;
  suggestionText: string;
  active: boolean;
};

const BLANK: FormState = {
  name: "",
  triggerField: "source",
  triggerOperator: "equals",
  triggerValue: "",
  triggerValues: [],
  guardrailEnabled: false,
  guardrailOperator: "not_equals",
  guardrailValue: "",
  suggestionText: "",
  active: true,
};

function conditionToForm(c: AiRoutingCondition): FormState {
  return {
    name: c.name,
    triggerField: c.triggerField,
    triggerOperator: c.triggerOperator,
    triggerValue: c.triggerValue,
    triggerValues:
      c.triggerValues && c.triggerValues.length
        ? c.triggerValues
        : c.triggerOperator === "is_any_of" && c.triggerValue
          ? c.triggerValue.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
    guardrailEnabled: !!(c.guardrailField && c.guardrailValue),
    guardrailOperator: c.guardrailOperator ?? "not_equals",
    guardrailValue: c.guardrailValue ?? "",
    suggestionText: c.suggestionText,
    active: c.active,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fieldLabel(v: ConditionField) {
  return TRIGGER_FIELDS.find((f) => f.value === v)?.label ?? v;
}

function opLabel(v: ConditionOperator) {
  return ALL_OPERATORS.find((o) => o.value === v)?.label ?? v;
}

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ─── Small reusable field wrapper ──────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-white/55 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────────────────────────── */

function Sel<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 w-full rounded-sm border border-white/10 bg-white/5 px-2 text-xs text-white outline-none focus:border-white/30 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Text input ─────────────────────────────────────────────────────────── */

function TextInput({
  value,
  onChange,
  placeholder,
  className,
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  list?: string;
}) {
  return (
    <input
      value={value}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-8 w-full rounded-sm border border-white/10 bg-white/5 px-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/30 ${className ?? ""}`}
    />
  );
}

/* ─── Info tooltip (hover ?) ─────────────────────────────────────────────── */

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <HelpCircle
        size={11}
        className="text-white/30 hover:text-white/60 cursor-help transition-colors"
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-52 -translate-x-1/2 rounded border border-white/12 bg-[#1a1a2e] px-2.5 py-1.5 text-[10px] leading-relaxed text-white/80 shadow-xl group-hover:block normal-case tracking-normal font-normal">
        {text}
      </span>
    </span>
  );
}

/* ─── Tag / chip input (multi-value, for is_any_of) ──────────────────────── */

function TagInput({
  values,
  onChange,
  placeholder,
  listId,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  listId?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setDraft("");
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 px-1.5 py-1 focus-within:border-white/30">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded bg-[var(--cranberry)]/20 border border-[var(--cranberry)]/30 px-1.5 py-0.5 text-[10px] text-[var(--cranberry)]"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            className="text-[var(--cranberry)]/70 hover:text-white"
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={listId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            remove(values[values.length - 1]);
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[60px] flex-1 bg-transparent px-1 py-0.5 text-xs text-white placeholder:text-white/25 outline-none"
      />
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

function Modal({
  title,
  onClose,
  onSave,
  busy,
  form,
  setForm,
  utmLinks,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  utmLinks: UtmLink[];
}) {
  const [guardrailOpen, setGuardrailOpen] = useState(form.guardrailEnabled);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleGuardrail = () => {
    const next = !guardrailOpen;
    setGuardrailOpen(next);
    set("guardrailEnabled", next);
  };

  const isMulti = form.triggerOperator === "is_any_of";

  // Distinct values pulled from saved UTM links for the current field.
  const utmKey = UTM_FIELD_KEY[form.triggerField];
  const datalistId = utmKey ? `utm-${utmKey}-options` : undefined;
  const utmOptions = utmKey
    ? Array.from(
        new Set(
          utmLinks
            .map((l) => l[utmKey])
            .filter((v): v is string => !!v && v.trim().length > 0),
        ),
      ).sort()
    : [];

  const canSave =
    form.name.trim() &&
    (isMulti ? form.triggerValues.length > 0 : form.triggerValue.trim()) &&
    form.suggestionText.trim() &&
    (!form.guardrailEnabled || form.guardrailValue.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded border border-white/12 bg-[#101018] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <Field label="Name">
            <TextInput
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder='e.g. "LinkedIn recruiter"'
            />
          </Field>

          {/* Trigger */}
          <div className="rounded-sm border border-white/8 bg-white/[0.025] p-3 space-y-3">
            <p className="text-[11px] font-medium text-white/55 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={11} className="text-[var(--cranberry)]" /> Trigger
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-medium text-white/55 uppercase tracking-wider">
                  Field <InfoTip text={FIELD_HELP[form.triggerField]} />
                </label>
                <Sel<ConditionField>
                  value={form.triggerField}
                  onChange={(v) => set("triggerField", v)}
                  options={TRIGGER_FIELDS}
                />
              </div>
              <Field label="Operator">
                <Sel<ConditionOperator>
                  value={form.triggerOperator}
                  onChange={(v) => set("triggerOperator", v)}
                  options={ALL_OPERATORS}
                />
              </Field>
              <Field label={isMulti ? "Values" : "Value"}>
                {isMulti ? (
                  <TagInput
                    values={form.triggerValues}
                    onChange={(v) => set("triggerValues", v)}
                    placeholder="Add value, Enter"
                    listId={datalistId}
                  />
                ) : (
                  <TextInput
                    value={form.triggerValue}
                    onChange={(v) => set("triggerValue", v)}
                    placeholder='e.g. "linkedin"'
                    list={datalistId}
                  />
                )}
              </Field>
            </div>
            {datalistId && (
              <datalist id={datalistId}>
                {utmOptions.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            )}
            {isMulti && (
              <p className="text-[10px] text-white/30">
                Matches when {fieldLabel(form.triggerField)} equals ANY of these
                values. Press Enter or comma to add.
              </p>
            )}
          </div>

          {/* Guardrail (collapsible) */}
          <div className="rounded-sm border border-white/8 bg-white/[0.025]">
            <button
              type="button"
              onClick={toggleGuardrail}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              {guardrailOpen ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
              <ShieldAlert size={11} className="text-amber-400/70" />
              <span className="uppercase tracking-wider">
                {guardrailOpen ? "Safety Guardrail" : "Add Safety Guardrail"}
              </span>
            </button>

            {guardrailOpen && (
              <div className="border-t border-white/8 px-3 pb-3 pt-3 space-y-3">
                <p className="text-[11px] text-white/35">
                  Only fire this suggestion when the visitor's current page
                  satisfies the condition below.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Field">
                    <div className="h-8 rounded-sm border border-white/8 bg-white/[0.03] px-2 text-xs text-white/50 flex items-center">
                      Current Page
                    </div>
                  </Field>
                  <Field label="Operator">
                    <Sel<ConditionOperator>
                      value={form.guardrailOperator}
                      onChange={(v) => set("guardrailOperator", v)}
                      options={GUARDRAIL_OPERATORS}
                    />
                  </Field>
                  <Field label="Value">
                    <TextInput
                      value={form.guardrailValue}
                      onChange={(v) => set("guardrailValue", v)}
                      placeholder='e.g. "/resume"'
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion Text */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[11px] font-medium text-white/55 uppercase tracking-wider">
              Suggestion Text{" "}
              <InfoTip text="Write a plain instruction, e.g. 'Tell them you see they came from LinkedIn and offer to show the resume.' The AI will rephrase it naturally in the conversation." />
            </label>
            <textarea
              value={form.suggestionText}
              onChange={(e) => set("suggestionText", e.target.value)}
              rows={3}
              placeholder="Suggest showing them my resume, or ask if they're a recruiter looking for full-stack engineers."
              className="w-full rounded-sm border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/30 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-white/30 mt-1">
              The AI will rephrase this naturally in context.
            </p>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set("active", !form.active)}
              className={`relative h-4.5 w-8 rounded-full transition-colors ${form.active ? "bg-[var(--cranberry)]" : "bg-white/15"}`}
              style={{ width: 32, height: 18 }}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-3.5" : ""}`}
                style={{ width: 14, height: 14 }}
              />
            </div>
            <span className="text-xs text-white/60">
              {form.active ? "Active" : "Inactive"}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-sm border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/25 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy || !canSave}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-sm bg-[var(--cranberry)] text-xs text-white font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function AiRoutingConditions() {
  const [conditions, setConditions] = useState<AiRoutingCondition[] | null>(null);
  const [utmLinks, setUtmLinks] = useState<UtmLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const load = () =>
    fetch("/api/admin/ai-routing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.conditions) setConditions(d.conditions);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    fetch("/api/admin/utm-links")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.links)) setUtmLinks(d.links);
      })
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(BLANK);
    setModalOpen(true);
  };

  const openEdit = (c: AiRoutingCondition) => {
    setEditingId(c.id);
    setForm(conditionToForm(c));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const save = async () => {
    setBusy(true);
    const isMulti = form.triggerOperator === "is_any_of";
    const cleanedValues = form.triggerValues
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      triggerField: form.triggerField,
      triggerOperator: form.triggerOperator,
      // Back-compat: triggerValue always set (joined string when multi).
      triggerValue: isMulti ? cleanedValues.join(", ") : form.triggerValue.trim(),
      triggerValues: isMulti ? cleanedValues : undefined,
      ...(form.guardrailEnabled && form.guardrailValue.trim()
        ? {
            guardrailField: "current_page" as const,
            guardrailOperator: form.guardrailOperator,
            guardrailValue: form.guardrailValue.trim(),
          }
        : {
            guardrailField: undefined,
            guardrailOperator: undefined,
            guardrailValue: undefined,
          }),
      suggestionText: form.suggestionText.trim(),
      active: form.active,
    };
    await fetch("/api/admin/ai-routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal();
    await load();
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this routing condition?")) return;
    setBusy(true);
    await fetch("/api/admin/ai-routing", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setBusy(false);
  };

  const activeCount = conditions?.filter((c) => c.active).length ?? 0;

  if (!conditions) {
    return (
      <p className="text-xs text-white/30 flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin" /> Loading routing conditions…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-nord text-base text-white flex items-center gap-2">
            <Zap size={16} className="text-[var(--cranberry)]" />
            AI Routing Conditions
            {activeCount > 0 && (
              <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[var(--cranberry)]/20 border border-[var(--cranberry)]/30 text-[10px] text-[var(--cranberry)] font-medium tabular-nums">
                {activeCount} active
              </span>
            )}
          </p>
          <p className="text-xs text-white/35 mt-0.5">
            Define when the AI should proactively suggest something based on
            visitor origin.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[var(--cranberry)] text-xs text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> Add Condition
        </button>
      </div>

      {/* Empty state */}
      {conditions.length === 0 && (
        <div className="rounded-sm border border-white/8 bg-white/[0.02] p-8 text-center">
          <Zap size={24} className="mx-auto mb-2 text-white/15" />
          <p className="text-sm text-white/30">No routing conditions yet.</p>
          <p className="text-xs text-white/20 mt-1">
            Add one to let the AI proactively guide visitors based on their
            origin.
          </p>
        </div>
      )}

      {/* Table */}
      {conditions.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.025]">
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Name
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Trigger
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Guardrail
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Suggestion Preview
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Status
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {conditions.map((c) => (
                <tr
                  key={c.id}
                  className="bg-white/[0.01] hover:bg-white/[0.04] transition-colors"
                >
                  {/* Name */}
                  <td className="px-3 py-3 text-white font-medium whitespace-nowrap max-w-[140px] truncate">
                    {c.name}
                  </td>

                  {/* Trigger */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-white/70">
                      {fieldLabel(c.triggerField)}
                    </span>{" "}
                    <span className="text-white/35">{opLabel(c.triggerOperator)}</span>{" "}
                    <code className="rounded bg-white/8 px-1 py-0.5 text-[10px] text-[var(--cranberry)]/90">
                      {c.triggerValue}
                    </code>
                  </td>

                  {/* Guardrail */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {c.guardrailField ? (
                      <span className="text-white/50">
                        page {opLabel(c.guardrailOperator!)}{" "}
                        <code className="rounded bg-white/8 px-1 py-0.5 text-[10px] text-amber-400/80">
                          {c.guardrailValue}
                        </code>
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>

                  {/* Suggestion preview */}
                  <td className="px-3 py-3 max-w-[220px]">
                    <span
                      className="text-white/50 italic leading-snug line-clamp-2"
                      title={c.suggestionText}
                    >
                      {truncate(c.suggestionText, 80)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {c.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400/80">
                        <Check size={11} /> Active
                      </span>
                    ) : (
                      <span className="text-white/25">Inactive</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        title="Edit"
                        className="text-white/35 hover:text-white transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => del(c.id)}
                        title="Delete"
                        className="text-white/35 hover:text-[#ef4242] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 size={12} className="animate-spin" /> Working…
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editingId ? "Edit Routing Condition" : "New Routing Condition"}
          onClose={closeModal}
          onSave={save}
          busy={busy}
          form={form}
          setForm={setForm}
          utmLinks={utmLinks}
        />
      )}
    </div>
  );
}
