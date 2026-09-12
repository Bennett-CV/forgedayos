import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const PROMPTS = [
  { key: "win", label: "What went well?", placeholder: "One thing you’re glad you did." },
  { key: "change", label: "What would you change?", placeholder: "One friction or miss." },
  { key: "next", label: "Focus next week?", placeholder: "One clear aim." },
];

export default function GuidedCheckIn({ onComplete, initial = {}, saving = false }) {
  const [answers, setAnswers] = useState({
    win: initial.win || "",
    change: initial.change || "",
    next: initial.next || "",
  });

  return (
    <div className="editorial-card p-5 space-y-4">
      <div>
        <p className="micro-label">Three notes</p>
        <p className="mt-1 text-[13px] text-caption leading-relaxed">
          The week above is already summarized. Add only what the numbers can’t see.
        </p>
      </div>

      {PROMPTS.map(prompt => (
        <div key={prompt.key}>
          <label className="text-[14px] font-semibold text-ink block mb-1.5">{prompt.label}</label>
          <Textarea
            placeholder={prompt.placeholder}
            value={answers[prompt.key]}
            onChange={e => setAnswers(prev => ({ ...prev, [prompt.key]: e.target.value }))}
            rows={2}
            className="bg-secondary/50 border-border resize-none"
          />
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => onComplete({})}
          disabled={saving}
          className="text-[12px] font-semibold text-caption min-h-[44px] px-1"
        >
          Save without notes
        </button>
        <Button
          onClick={() => onComplete(answers)}
          disabled={saving}
          className="bg-clay text-clay-fg hover:bg-clay-hover"
        >
          {saving ? "Saving…" : "Save review"}
        </Button>
      </div>
    </div>
  );
}
