import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";

const PROMPTS = [
  { key: "win",       label: "🏆 Biggest win this week?",                placeholder: "Something you're proud of..." },
  { key: "miss",      label: "⚠️ What did you miss or avoid?",           placeholder: "Be honest with yourself..." },
  { key: "energy",    label: "⚡ What drained or energized you most?",   placeholder: "People, tasks, habits..." },
  { key: "next",      label: "🎯 One thing to focus on next week?",      placeholder: "Make it specific and actionable..." },
];

export default function GuidedCheckIn({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const current = PROMPTS[step];

  const handleNext = () => {
    if (step < PROMPTS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(answers);
    }
  };

  const isLast = step === PROMPTS.length - 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Guided Check-In</h3>
        <span className="text-xs text-muted-foreground font-mono">{step + 1} / {PROMPTS.length}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-secondary"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <p className="text-base font-bold text-foreground">{current.label}</p>
          <Textarea
            placeholder={current.placeholder}
            value={answers[current.key] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [current.key]: e.target.value }))}
            rows={3}
            className="bg-secondary/50 border-border resize-none"
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <button
          onClick={() => onComplete(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
        >
          Skip check-in
        </button>
        <Button onClick={handleNext} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          {isLast ? (
            <><Sparkles className="h-4 w-4" /> Generate Review</>
          ) : (
            <>Next <ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}