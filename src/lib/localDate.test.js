import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localDateKey,
  localToday,
  localMonthKey,
  parseLocalDate,
  normalizeDateKey,
  isSameLocalDay,
  formatLocalDate,
  shiftLocalDateKey,
  localDaysAgoKey,
} from "./localDate.js";

test("localDateKey uses the civil day, not toISOString UTC", () => {
  const evening = new Date(2026, 8, 11, 22, 30, 0); // Fri Sep 11, 10:30pm local
  assert.equal(localDateKey(evening), "2026-09-11");

  const utcKey = evening.toISOString().slice(0, 10);
  // West of UTC (typical US): UTC is already Saturday Sep 12 — the reported bug.
  if (evening.getTimezoneOffset() > 0) {
    assert.equal(utcKey, "2026-09-12");
    assert.notEqual(localDateKey(evening), utcKey);
  }
});

test("date-only strings display on the same calendar day they were stored", () => {
  const d = parseLocalDate("2026-09-11");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 11);
  assert.equal(formatLocalDate("2026-09-11", "EEEE, MMM d"), "Friday, Sep 11");
  assert.equal(formatLocalDate("2026-09-12", "EEEE, MMM d"), "Saturday, Sep 12");
});

test("normalizeDateKey keeps YYYY-MM-DD and maps ISO instants to the local day", () => {
  assert.equal(normalizeDateKey("2026-09-11"), "2026-09-11");
  const localNoon = new Date(2026, 8, 11, 12, 0, 0);
  assert.equal(normalizeDateKey(localNoon.toISOString()), "2026-09-11");
});

test("weight / meal day match uses the stored civil day", () => {
  const today = "2026-09-11";
  assert.equal(isSameLocalDay("2026-09-11", today), true);
  assert.equal(isSameLocalDay("2026-09-10", today), false);
});

test("shift and month helpers stay on the local calendar", () => {
  assert.equal(shiftLocalDateKey("2026-09-11", -1), "2026-09-10");
  assert.equal(shiftLocalDateKey(new Date(2026, 8, 11, 22, 0, 0), 0), "2026-09-11");
  assert.equal(localMonthKey(new Date(2026, 8, 11, 22, 0, 0)), "2026-09");
  assert.equal(localDaysAgoKey(7, new Date(2026, 8, 11, 22, 0, 0)), "2026-09-04");
});

test("localToday matches localDateKey(now)", () => {
  assert.equal(localToday(), localDateKey(new Date()));
});
