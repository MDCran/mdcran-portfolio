export class AdminRequestError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "AdminRequestError"; }
}

/** A resolved fetch is not a successful save. All editor mutations use this boundary. */
export async function adminRequest<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  init?.signal?.throwIfAborted();
  const response = await fetch(url, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  init?.signal?.throwIfAborted();
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    // Cancellation during body consumption must remain cancellation, not a bad-response error.
    init?.signal?.throwIfAborted();
    if (error instanceof Error && error.name === "AbortError") throw error;
  }
  init?.signal?.throwIfAborted();
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    const message = detail || (response.status === 409 ? "This record changed in another window. Reload it before saving." : `Request failed (${response.status}). Your edits are still here.`);
    throw new AdminRequestError(typeof message === "string" ? message : JSON.stringify(message), response.status);
  }
  // Every caller expects an object or collection; none uses a bodyless success contract.
  // A mutation may already have committed, so ask for a refresh instead of a blind retry.
  if (!payload || typeof payload !== "object") {
    throw new AdminRequestError("The server returned an invalid response. Refresh to confirm the latest data before trying again. Your edits are still here.", response.status);
  }
  return payload as T;
}

export function recordVersion(record: unknown): number {
  const version = record && typeof record === "object" ? (record as { _version?: unknown })._version : 0;
  return typeof version === "number" ? version : 0;
}

/** Batch writes return only submitted rows; retain the other rows already in the editor. */
export function mergeSavedRecords<T extends { id: string }>(current: T[], saved: T[]): T[] {
  const replacements = new Map(saved.map(record => [record.id, record]));
  const existingIds = new Set(current.map(record => record.id));
  return [
    ...saved.filter(record => !existingIds.has(record.id)),
    ...current.map(record => replacements.get(record.id) ?? record),
  ];
}

export function recordId(collection: string, record: Record<string, unknown>): string {
  return String(collection === "skills" ? record.name : collection === "resumeProfile" ? "profile" : collection === "siteContent" ? "site-content" : record.id ?? "");
}

export function removedRecords(collection: string, before: Record<string, unknown>[], after: Record<string, unknown>[]) {
  const remaining = new Set(after.map(record => recordId(collection, record)));
  return before.filter(record => !remaining.has(recordId(collection, record))).map(record => ({ id: recordId(collection, record), expectedVersion: recordVersion(record) }));
}

/** Compare editable content, independent of database metadata and object key order. */
export function contentSignature(value: unknown): string {
  const normalize=(item:unknown):unknown=>Array.isArray(item)?item.map(normalize):item&&typeof item==="object"?Object.fromEntries(Object.entries(item).filter(([key])=>!["_id","_version","_position"].includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,child])=>[key,normalize(child)])):item;
  return JSON.stringify(normalize(value));
}
