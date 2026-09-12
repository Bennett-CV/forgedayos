import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBook,
  normalizeBooks,
  upsertBook,
  removeBook,
  booksForMind,
  readingBookLabel,
} from "./books.js";

test("drops untitled rows and clamps progress", () => {
  assert.equal(normalizeBook({ title: "  " }), null);
  const book = normalizeBook({ title: " Deep Work ", status: "reading", progress_pct: 140 });
  assert.equal(book.title, "Deep Work");
  assert.equal(book.status, "reading");
  assert.equal(book.progress_pct, 100);
});

test("upsert and remove keep a structured list", () => {
  let list = upsertBook([], { title: "Atomic Habits", status: "want" });
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "want");
  list = upsertBook(list, { id: list[0].id, title: "Atomic Habits", status: "reading", progress_pct: 20 });
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "reading");
  assert.equal(list[0].progress_pct, 20);
  list = removeBook(list, list[0].id);
  assert.deepEqual(list, []);
});

test("weekly mind view splits reading vs finished this week", () => {
  const list = normalizeBooks([
    { id: "a", title: "Now", status: "reading", progress_pct: 40 },
    { id: "b", title: "Done", status: "finished", finished_date: "2026-09-10" },
    { id: "c", title: "Old", status: "finished", finished_date: "2026-08-01" },
    { id: "d", title: "Later", status: "want" },
  ]);
  const mind = booksForMind(list, "2026-09-08", "2026-09-14");
  assert.deepEqual(mind.reading.map(b => b.title), ["Now"]);
  assert.deepEqual(mind.finishedThisWeek.map(b => b.title), ["Done"]);
  assert.equal(readingBookLabel(list), "Now");
});
