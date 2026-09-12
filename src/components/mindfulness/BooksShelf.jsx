import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BOOK_STATUSES, upsertBook, removeBook } from "@/lib/books";

const STATUS_LABEL = {
  want: "Want",
  reading: "Reading",
  finished: "Finished",
};

function BookRow({ book, onChange, onRemove }) {
  return (
    <div className="py-3 border-b border-border last:border-0 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{book.title}</p>
          {book.author ? (
            <p className="text-[12px] text-caption mt-0.5">{book.author}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRemove(book.id)}
          className="text-[11px] font-semibold text-caption min-h-[36px] shrink-0"
        >
          Remove
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BOOK_STATUSES.map(status => {
          const active = book.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange({ ...book, status, finished_date: status === "finished" ? book.finished_date : "" })}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold min-h-[36px] ${
                active ? "border-clay text-ink bg-card" : "border-border text-caption bg-card"
              }`}
            >
              {STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>
      {book.status === "reading" ? (
        <div>
          <label className="micro-label mb-1.5 block">Progress (optional)</label>
          <Input
            type="number"
            min="0"
            max="100"
            inputMode="numeric"
            placeholder="%"
            value={book.progress_pct ?? ""}
            onChange={e => onChange({ ...book, progress_pct: e.target.value })}
            className="w-28 h-11"
            aria-label={`${book.title} progress`}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function BooksShelf({ books, onSave, saving }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("reading");

  const add = () => {
    const next = upsertBook(books, { title, author, status });
    if (next.length === books.length) return;
    setTitle("");
    setAuthor("");
    setStatus("reading");
    onSave(next);
  };

  return (
    <div className="editorial-card px-5 py-5 space-y-4">
      <div>
        <p className="micro-label">Books</p>
        <p className="mt-1 text-[13px] text-caption leading-relaxed">
          Title and status. Progress is optional.
        </p>
      </div>

      {books.length === 0 ? (
        <p className="text-[13px] text-caption">No books yet. Add one you’re reading, finished, or want.</p>
      ) : (
        <div>
          {books.map(book => (
            <BookRow
              key={book.id}
              book={book}
              onChange={next => onSave(upsertBook(books, next))}
              onRemove={id => onSave(removeBook(books, id))}
            />
          ))}
        </div>
      )}

      <div className="space-y-2 pt-1">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="h-11"
          aria-label="Book title"
        />
        <Input
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Author (optional)"
          className="h-11"
          aria-label="Book author"
        />
        <div className="flex flex-wrap gap-1.5">
          {BOOK_STATUSES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold min-h-[36px] ${
                status === s ? "border-clay text-ink bg-card" : "border-border text-caption bg-card"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          disabled={saving || !title.trim()}
          className="flex items-center justify-center w-full min-h-[44px] rounded-[4px] bg-clay text-clay-fg text-[14px] font-semibold hover:bg-clay-hover disabled:opacity-40"
        >
          {saving ? "Saving…" : "Add book"}
        </button>
      </div>
    </div>
  );
}
