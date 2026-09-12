import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";

export const REVIEW_PROMPTS = [
  { key: "win", label: "What went well?", placeholder: "One thing worth keeping." },
  { key: "change", label: "What would you change?", placeholder: "Be specific. One adjustment is enough." },
  { key: "next", label: "Focus next week?", placeholder: "A single aim for the next seven days." },
];

export default function GuidedCheckIn({ onComplete, saving = false, initial = {} }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    win: initial.win || "",
    change: initial.change || "",
    next: initial.next || "",
  });
  const current = REVIEW_PROMPTS[step];
  const isLast = step === REVIEW_PROMPTS.length - 1;

  const handleNext = () => {
    if (step < REVIEW_PROMPTS.length - 1) {
      setStep(s => s + 1);
      return;
    }
    onComplete(answers);
  };

  return (
    <div className="editorial-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="micro-label">Close the week</p>
        <span className="text-[11px] font-mono text-caption">{step + 1} / {REVIEW_PROMPTS.length}</span>
      </div>

      <div className="flex gap-1.5">
        {REVIEW_PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-clay" : "bg-track"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.16 }}
          className="space-y-3"
        >
          <p className="font-serif text-[18px] font-semibold tracking-tight text-ink">{current.label}</p>
          <Textarea
            placeholder={current.placeholder}
            value={answers[current.key] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [current.key]: e.target.value }))}
            rows={3}
            className="bg-secondary border-border resize-none"
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onComplete(answers)}
          className="text-[12px] font-semibold text-caption min-h-[44px] px-1"
        >
          Save without notes
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-[4px] bg-clay text-clay-fg text-[14px] font-semibold hover:bg-clay-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : isLast ? "Save review" : "Next"}
        </button>
      </div>
    </div>
  );
}
