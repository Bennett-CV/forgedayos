import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MOODS = ["great", "good", "neutral", "low", "rough"];

const PROMPTS = {
  morning: ["What am I grateful for today?", "What's my #1 focus today?", "What would make today great?"],
  evening: ["What went well today?", "What could I have done better?", "What am I grateful for?"],
  meditation: ["How did the session feel?", "Any insights or observations?"],
  reading: ["What are you reading?", "Key takeaways?"],
};

export default function MindfulnessComposer({ type, entry, onSave, onCancel }) {
  const [content, setContent] = useState(entry?.content || "");
  const [duration, setDuration] = useState(entry?.duration_minutes ? String(entry.duration_minutes) : "");
  const [pages, setPages] = useState(entry?.pages_read ? String(entry.pages_read) : "");
  const [mood, setMood] = useState(entry?.mood || "");

  useEffect(() => {
    setContent(entry?.content || "");
    setDuration(entry?.duration_minutes ? String(entry.duration_minutes) : "");
    setPages(entry?.pages_read ? String(entry.pages_read) : "");
    setMood(entry?.mood || "");
  }, [entry, type]);

  const prompts = PROMPTS[type] || [];
  const isMeditation = type === "meditation";
  const isReading = type === "reading";
  const label = type === "morning" ? "Morning" : type === "evening" ? "Evening" : type === "reading" ? "Reading" : "Meditation";

  const handleSubmit = () => {
    const data = { type, content, mood: mood || undefined };
    if (isMeditation && duration) data.duration_minutes = parseFloat(duration);
    if (isReading && pages) data.pages_read = parseFloat(pages);
    onSave(data);
  };

  return (
    <div className="editorial-card p-4 space-y-4">
      <p className="micro-label">{entry ? `Edit ${label}` : `Log ${label}`}</p>

      {isMeditation && (
        <div>
          <label className="micro-label mb-1.5 block">Duration (minutes)</label>
          <Input
            type="number"
            placeholder="e.g. 10"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-32"
          />
        </div>
      )}

      {isReading && (
        <div>
          <label className="micro-label mb-1.5 block">Pages Read</label>
          <Input
            type="number"
            placeholder="e.g. 20"
            value={pages}
            onChange={e => setPages(e.target.value)}
            className="w-32"
          />
        </div>
      )}

      <div>
        <label className="micro-label mb-1.5 block">
          {isReading ? "Notes" : isMeditation ? "Notes" : "Entry"}
        </label>
        {prompts.length > 0 && !content && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {prompts.map(p => (
              <button
                key={p}
                onClick={() => setContent(prev => prev ? `${prev}\n\n${p}\n` : `${p}\n`)}
                className="text-[11px] px-2 py-1 rounded-[4px] bg-secondary text-caption border border-border min-h-0 min-w-0"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isMeditation ? "How was the session?" : "Write freely…"}
          rows={5}
          className="w-full bg-secondary border border-border rounded-[4px] px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-clay resize-none"
        />
      </div>

      <div>
        <label className="micro-label mb-1.5 block">Mood</label>
        <div className="flex gap-1.5">
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? "" : m)}
              className={`flex-1 py-2 rounded-[4px] text-[11px] font-semibold capitalize border min-h-[40px] ${
                mood === m ? "border-clay bg-card text-ink" : "border-border bg-secondary text-caption"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel} className="min-h-[44px]">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="min-h-[44px] bg-clay text-clay-fg hover:bg-clay-hover font-semibold">
          Save {label}
        </Button>
      </div>
    </div>
  );
}
