import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, startOfQuarter, subWeeks, subMonths, addMonths } from "date-fns";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Calendar day key (YYYY-MM-DD) in the user's local timezone.
 * Never use `date.toISOString().slice(0, 10)` for this — that is UTC and
 * shifts the day after local evening in US timezones (the Sep 11 vs Sep 12 bug).
 */
export function localDateKey(date = new Date()) {
  const d = date instanceof Date ? date : parseLocalDate(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function localToday() {
  return localDateKey(new Date());
}

export function localMonthKey(date = new Date()) {
  const key = localDateKey(date);
  return key ? key.slice(0, 7) : "";
}

/**
 * Parse a stored date as a local calendar day (noon local, so display never shifts).
 * - YYYY-MM-DD is treated as that civil day, not UTC midnight.
 * - ISO datetimes are converted to the local calendar day of that instant.
 */
export function parseLocalDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0);
  }
  if (value == null || value === "") return new Date(NaN);

  const raw = String(value).trim();
  const dateOnly = raw.match(DATE_ONLY);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0);
  }

  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return instant;
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate(), 12, 0, 0);
}

/** Normalize any stored date / datetime to a local YYYY-MM-DD key. */
export function normalizeDateKey(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (DATE_ONLY.test(raw)) return raw;
  return localDateKey(parseLocalDate(raw));
}

export function isSameLocalDay(a, b) {
  const left = normalizeDateKey(a);
  const right = normalizeDateKey(b);
  return Boolean(left) && left === right;
}

export function formatLocalDate(value, pattern = "EEE, MMM d") {
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern);
}

export function shiftLocalDateKey(value, days) {
  const d = value instanceof Date ? new Date(value.getTime()) : parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(days || 0));
  return localDateKey(d);
}

export function localDaysAgoKey(days, from = new Date()) {
  return localDateKey(subDays(from instanceof Date ? from : parseLocalDate(from), days));
}

export function localWeekStartKey(from = new Date(), weekStartsOn = 1) {
  return localDateKey(startOfWeek(from instanceof Date ? from : parseLocalDate(from), { weekStartsOn }));
}

export function localWeekEndKey(from = new Date(), weekStartsOn = 1) {
  return localDateKey(endOfWeek(from instanceof Date ? from : parseLocalDate(from), { weekStartsOn }));
}

export function localWeekStartDate(from = new Date(), weekStartsOn = 1) {
  return startOfWeek(from instanceof Date ? from : parseLocalDate(from), { weekStartsOn });
}

export function localWeekEndDate(from = new Date(), weekStartsOn = 1) {
  return endOfWeek(from instanceof Date ? from : parseLocalDate(from), { weekStartsOn });
}

export function addLocalWeeks(from = new Date(), weeks = 0) {
  return addDays(from instanceof Date ? from : parseLocalDate(from), weeks * 7);
}

export { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, startOfQuarter, subWeeks, subMonths, addMonths, format };
