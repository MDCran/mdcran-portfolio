import test from "node:test";
import assert from "node:assert/strict";
import { fmtDate, fmtDateTime } from "../src/lib/admin-date";

test("admin dates format real calendar days without timezone shifts or rollover", () => {
  assert.equal(fmtDate("2024-02-29"), "Feb 29, 2024");
  assert.equal(fmtDate("2026-10-23T00:00:00.000Z"), "Oct 23, 2026");
  assert.equal(fmtDate("2026-01-01T23:30:00-05:00"), "Jan 1, 2026");
  assert.equal(fmtDate("2025-02-29"), "2025-02-29");
  assert.equal(fmtDate("2026-13-01"), "2026-13-01");
  assert.equal(fmtDate("2026-00-00"), "2026-00-00");
});

test("editorial years, month dates, human ranges and unknown labels retain their precision", () => {
  for (const label of ["2024", "2023–2025", "2022 - Present", "May 2025", "2025-03", "In progress", "unknown"]) {
    assert.equal(fmtDate(label), label);
    assert.equal(fmtDateTime(label), label);
  }
  assert.equal(fmtDate(" 2024 "), "2024");
});

test("missing values and invalid date sentinels never render Invalid Date", () => {
  for (const value of [undefined, "", " ", "Invalid Date", "invalid date"]) {
    assert.equal(fmtDate(value), "—");
    assert.equal(fmtDateTime(value), "—");
  }
  assert.equal(fmtDateTime("2026-10-23Tnot-a-time"), "2026-10-23Tnot-a-time");
  assert.equal(fmtDate("2026-10-23Tnot-a-time"), "2026-10-23Tnot-a-time");
});

test("date-time formatter adds a time only to a valid recorded timestamp", () => {
  const value = "2026-10-23T17:42:00.000Z";
  assert.equal(fmtDateTime(value), new Date(value).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
  assert.equal(fmtDateTime("2026-10-23"), "Oct 23, 2026");
  assert.equal(fmtDateTime("2026-02-30T17:42:00.000Z"), "2026-02-30T17:42:00.000Z");
});
