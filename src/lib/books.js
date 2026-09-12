import { normalizeDateKey } from "./localDate.js";

export const BOOK_STATUSES = ["want", "reading", "finished"];

export function newBookId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeBook(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "").trim();
  if (!title) return null;
  const status = BOOK_STATUSES.includes(raw.status) ? raw.status : "want";
  const progressRaw = raw.progress_pct;
  const progress = progressRaw === "" || progressRaw == null ? null : Number(progressRaw);
  const progress_pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  return {
    id: raw.id || newBookId(),
    title,
    author: String(raw.author || "").trim(),
    status,
    progress_pct: status === "finished" ? (progress_pct == null ? 100 : progress_pct) : progress_pct,
    started_date: normalizeDateKey(raw.started_date) || "",
    finished_date: normalizeDateKey(raw.finished_date) || "",
    updated_at: raw.updated_at || "",
  };
}

export function normalizeBooks(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const book = normalizeBook(raw);
    if (!book || seen.has(book.id)) continue;
    seen.add(book.id);
    out.push(book);
  }
  return out;
}

export function upsertBook(list, patch) {
  const books = normalizeBooks(list);
  const next = normalizeBook({
    ...patch,
    updated_at: patch.updated_at || new Date().toISOString(),
  });
  if (!next) return books;
  const idx = books.findIndex(b => b.id === next.id);
  if (idx >= 0) {
    const copy = [...books];
    copy[idx] = { ...books[idx], ...next, id: books[idx].id };
    return copy;
  }
  return [...books, next];
}

export function removeBook(list, id) {
  return normalizeBooks(list).filter(b => b.id !== id);
}

export function booksForMind(list, weekStart, weekEnd) {
  const books = normalizeBooks(list);
  const start = normalizeDateKey(weekStart);
  const end = normalizeDateKey(weekEnd);
  return {
    reading: books.filter(b => b.status === "reading"),
    want: books.filter(b => b.status === "want"),
    finished: books.filter(b => b.status === "finished"),
    finishedThisWeek: books.filter(b => {
      if (b.status !== "finished") return false;
      const key = normalizeDateKey(b.finished_date);
      return Boolean(key && start && end && key >= start && key <= end);
    }),
  };
}

export function readingBookLabel(list) {
  const reading = normalizeBooks(list).filter(b => b.status === "reading");
  if (!reading.length) return "";
  return reading[0].title;
}
