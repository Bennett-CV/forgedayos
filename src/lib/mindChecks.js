import { normalizeDateKey, shiftLocalDateKey } from "./localDate.js";

export const MIND_NOTE_MAX = 140;

export const MIND_CHECKS = [
  { key: "am_journal", label: "AM journal", journalType: "morning" },
  { key: "pm_journal", label: "PM journal", journalType: "evening" },
  { key: "meditated", label: "Meditated", journalType: "meditation" },
];

function eachDateKey(start, end) {
  const days = [];
  let cursor = normalizeDateKey(start);
  const last = normalizeDateKey(end);
  if (!cursor || !last || last < cursor) return days;
  while (cursor <= last && days.length < 400) {
    days.push(cursor);
    cursor = shiftLocalDateKey(cursor, 1);
  }
  return days;
}

export function normalizeMindNote(value) {
  if (value == null) return "";
  return String(value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MIND_NOTE_MAX);
}

export function normalizePhotoUrl(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  return text.slice(0, 2000);
}

export function mindLogOnDate(logs, date) {
  const key = normalizeDateKey(date);
  if (!key) return null;
  return (logs || []).find((log) => normalizeDateKey(log.date) === key) || null;
}

/** A slot is done when the day-level check is on, or an existing journal entry of that type exists. Counted once. */
export function checksForDay(log, journalEntries, date) {
  const key = normalizeDateKey(date);
  const entries = (journalEntries || []).filter((entry) => normalizeDateKey(entry.date) === key);
  const flags = {};
  for (const check of MIND_CHECKS) {
    flags[check.key] = Boolean(log?.[check.key]) || entries.some((entry) => entry.type === check.journalType);
  }
  return flags;
}

export function dayHasMindCheck(log) {
  if (!log) return false;
  return Boolean(log.am_journal || log.pm_journal || log.meditated);
}

/**
 * Journal slots are AM + PM (2 per day). Meditation is once per day.
 * A full week reads like "Journaled 12/14, meditated 5/7".
 */
export function summarizeMindChecks({
  mindLogs = [],
  journalEntries = [],
  start,
  end,
} = {}) {
  const days = eachDateKey(start, end);
  let am = 0;
  let pm = 0;
  let meditated = 0;
  for (const day of days) {
    const flags = checksForDay(mindLogOnDate(mindLogs, day), journalEntries, day);
    if (flags.am_journal) am += 1;
    if (flags.pm_journal) pm += 1;
    if (flags.meditated) meditated += 1;
  }
  const journaled = am + pm;
  const journalSlots = days.length * 2;
  const dayCount = days.length;
  const hasPractice = journaled > 0 || meditated > 0;
  const line = dayCount
    ? `Journaled ${journaled}/${journalSlots}, meditated ${meditated}/${dayCount}`
    : "";
  return { journaled, journalSlots, meditated, days: dayCount, am, pm, hasPractice, line };
}

export function mindLogPayload(log, date) {
  return {
    date: normalizeDateKey(date),
    am_journal: Boolean(log?.am_journal),
    pm_journal: Boolean(log?.pm_journal),
    meditated: Boolean(log?.meditated),
    note: normalizeMindNote(log?.note),
    photo_url: normalizePhotoUrl(log?.photo_url),
  };
}
