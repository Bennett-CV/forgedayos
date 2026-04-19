import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

const MOODS = ["great", "good", "neutral", "low", "rough"];
const MOOD_EMOJI = { great: "🤩", good: "😊", neutral: "😐", low: "😔", rough: "😣" };

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

const PROMPTS = {
  morning: ["What am I grateful for today?", "What's my #1 focus today?", "What would make today great?"],
  evening: ["What went well today?", "What could I have done better?", "What am I grateful for?"],
  meditation: ["How did the session feel?", "Any insights or observations?"],
  reading: ["What are you reading?", "Key takeaways?"],
};

function EntryForm({ type, entry, onSave }) {
  const [content, setContent] = useState(entry?.content || "");
  const [duration, setDuration] = useState(entry?.duration_minutes ? String(entry.duration_minutes) : "");
  const [pages, setPages] = useState(entry?.pages_read ? String(entry.pages_read) : "");
  const [mood, setMood] = useState(entry?.mood || "");

  const prompts = PROMPTS[type] || [];
  const isMeditation = type === "meditation";
  const isReading = type === "reading";

  const handleSubmit = () => {
    const data = { type, content, mood: mood || undefined };
    if (isMeditation && duration) data.duration_minutes = parseFloat(duration);
    if (isReading && pages) data.pages_read = parseFloat(pages);
    onSave(data);
  };

  return (
    <div className="space-y-4 p-1">
      {isMeditation && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Duration (minutes)</label>
          <Input
            type="number"
            placeholder="e.g. 10"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="bg-secondary/50 border-border w-32 font-mono"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          />
        </div>
      )}

      {isReading && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Pages Read</label>
          <Input
            type="number"
            placeholder="e.g. 20"
            value={pages}
            onChange={e => setPages(e.target.value)}
            className="bg-secondary/50 border-border w-32 font-mono"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          />
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
          {isReading ? "Notes (optional)" : isMeditation ? "Notes" : "Entry"}
        </label>
        {prompts.length > 0 && !content && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {prompts.map(p => (
              <button
                key={p}
                onClick={() => setContent(prev => prev ? `${prev}\n\n${p}\n` : `${p}\n`)}
                className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
              >
                + {p}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isMeditation ? "How was the session?" : "Write freely..."}
          rows={6}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Mood</label>
        <div className="flex gap-2">
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? "" : m)}
              className={`flex-1 py-2 rounded-lg text-base transition-all border ${
                mood === m ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
              }`}
            >
              {MOOD_EMOJI[m]}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 min-h-[44px]"
      >
        <Check className="h-4 w-4" />
        Save Entry
      </Button>
    </div>
  );
}

export default function MindfulnessEntryModal({ open, type, entry, onClose, onSave }) {
  const isMobile = useIsMobile();
  const title = type === "morning" ? "Morning Journal" : type === "evening" ? "Evening Journal" : type === "reading" ? "Reading Log" : "Meditation";
  const formProps = { type, entry, onSave };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-black">{title}</DrawerTitle>
          </DrawerHeader>
          <EntryForm {...formProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">{title}</DialogTitle>
        </DialogHeader>
        <EntryForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}