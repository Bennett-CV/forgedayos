import { format, parseISO } from "date-fns";

export default function MindfulnessLog({ entries, type, onAdd, onEdit }) {
  if (entries.length === 0) {
    return (
      <div className="editorial-card border-dashed px-4 py-8 text-center">
        <p className="text-sm text-caption mb-3">No {type} entries yet.</p>
        <button onClick={onAdd} className="text-[13px] font-semibold text-clay min-h-0">
          Add first entry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <button
          key={entry.id}
          onClick={() => onEdit(entry)}
          className="editorial-card p-4 text-left w-full min-h-0"
        >
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[11px] text-caption">
              {format(parseISO(entry.date), "MMM d")}
            </span>
            {entry.duration_minutes && (
              <span className="font-mono text-[11px] text-caption">{entry.duration_minutes} min</span>
            )}
            {entry.pages_read && (
              <span className="font-mono text-[11px] text-caption">{entry.pages_read} pages</span>
            )}
          </div>
          {entry.content ? (
            <p className="text-[14px] text-ink leading-relaxed line-clamp-4">{entry.content}</p>
          ) : (
            <p className="text-[13px] text-caption">No notes</p>
          )}
        </button>
      ))}
    </div>
  );
}
