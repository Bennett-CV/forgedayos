import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeMindChecks,
  normalizeMindNote,
  normalizePhotoUrl,
  checksForDay,
  mindLogPayload,
  MIND_NOTE_MAX,
} from "./mindChecks.js";

const WEEK = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];

test("a full week reads Journaled 12/14, meditated 5/7", () => {
  const mindLogs = WEEK.map((date, index) => ({
    date,
    am_journal: index < 6,
    pm_journal: index < 6,
    meditated: index < 5,
  }));
  const summary = summarizeMindChecks({
    mindLogs,
    start: "2026-09-08",
    end: "2026-09-14",
  });
  assert.equal(summary.journaled, 12);
  assert.equal(summary.journalSlots, 14);
  assert.equal(summary.meditated, 5);
  assert.equal(summary.days, 7);
  assert.equal(summary.line, "Journaled 12/14, meditated 5/7");
});

test("a journal entry and a check on the same slot count once", () => {
  const summary = summarizeMindChecks({
    start: "2026-09-08",
    end: "2026-09-08",
    mindLogs: [{ date: "2026-09-08", am_journal: true, meditated: false }],
    journalEntries: [
      { date: "2026-09-08", type: "morning" },
      { date: "2026-09-08", type: "meditation" },
    ],
  });
  assert.equal(summary.journaled, 1);
  assert.equal(summary.meditated, 1);
  assert.equal(summary.line, "Journaled 1/2, meditated 1/1");
  assert.deepEqual(
    checksForDay({ date: "2026-09-08", am_journal: true }, [{ date: "2026-09-08", type: "morning" }], "2026-09-08"),
    { am_journal: true, pm_journal: false, meditated: false }
  );
});

test("checks outside the window are ignored", () => {
  const summary = summarizeMindChecks({
    start: "2026-09-08",
    end: "2026-09-14",
    mindLogs: [{ date: "2026-09-01", am_journal: true, pm_journal: true, meditated: true }],
  });
  assert.equal(summary.hasPractice, false);
  assert.equal(summary.line, "Journaled 0/14, meditated 0/7");
});

test("note is one line and photo urls stay http(s)", () => {
  assert.equal(normalizeMindNote("  sat\nstill  today  "), "sat still today");
  assert.equal(normalizeMindNote("x".repeat(200)).length, MIND_NOTE_MAX);
  assert.equal(normalizePhotoUrl("https://files.example/photo.jpg"), "https://files.example/photo.jpg");
  assert.equal(normalizePhotoUrl("javascript:alert(1)"), "");
  assert.equal(normalizePhotoUrl("data:image/png;base64,aaaa"), "");
  const payload = mindLogPayload({
    am_journal: true,
    note: "done\ntoday",
    photo_url: "http://cdn.example/a.jpg",
  }, "2026-09-14");
  assert.equal(payload.note, "done today");
  assert.equal(payload.photo_url, "http://cdn.example/a.jpg");
  assert.equal(payload.am_journal, true);
  assert.equal(payload.pm_journal, false);
});
