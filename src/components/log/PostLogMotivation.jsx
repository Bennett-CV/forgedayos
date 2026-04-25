import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap } from "lucide-react";

export default function PostLogMotivation({ activity, weekScore, streak, onClose }) {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activity) return;

    base44.integrations.Core.InvokeLLM({
      prompt: `You are a sharp, high-energy personal performance coach. A user just logged this activity:

Activity: "${activity.title}" (${activity.pillar} pillar, +${activity.points} pts)
Current 7-day score: ${weekScore} pts
Current streak: ${streak} days

Write ONE punchy, personalized 1-sentence encouragement (max 20 words). 
Reference their specific activity and streak if > 2 days. Be energizing, not generic. No emojis.`,
    }).then(msg => {
      setMessage(msg);
      setLoading(false);
    }).catch(() => {
      setMessage("Keep stacking. Every rep counts.");
      setLoading(false);
    });
  }, [activity]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
      >
        <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coach Says</span>
              </div>
              {loading ? (
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1 min-h-[24px] min-w-[24px] flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Points badge */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{activity.title}</span>
            <span className="font-black font-mono text-primary">+{activity.points} pts</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}