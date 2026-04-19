import { format, parseISO } from "date-fns";
import { Plus, Pencil, Sun, Moon, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOOD_EMOJI = { great: "🤩", good: "😊", neutral: "😐", low: "😔", rough: "😣" };
const TYPE_ICON = { morning: Sun, evening: Moon, meditation: Brain };

export default function MindfulnessLog({ entries, type, onAdd, onEdit }) {
  const Icon = TYPE_ICON[type] || Brain;

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No {type} entries yet.</p>
        <Button variant="outline" onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add First Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {format(parseISO(entry.date), "EEEE, MMM d")}
              </span>
              {entry.mood && (
                <span className="text-sm">{MOOD_EMOJI[entry.mood]}</span>
              )}
              {entry.duration_minutes && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {entry.duration_minutes} min
                </span>
              )}
            </div>
            <button
              onClick={() => onEdit(entry)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          {entry.content && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed line-clamp-4">
              {entry.content}
            </p>
          )}
          {!entry.content && (
            <p className="text-xs text-muted-foreground italic">No notes</p>
          )}
        </div>
      ))}
    </div>
  );
}