import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Trophy, Zap } from "lucide-react";

const MILESTONES = [
  { days: 365, label: "Legend", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { days: 90,  label: "Elite",  icon: Star,   color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  { days: 30,  label: "Streak", icon: Zap,    color: "text-primary",    bg: "bg-primary/10 border-primary/30" },
  { days: 7,   label: "Hot",    icon: Flame,  color: "text-accent",     bg: "bg-accent/10 border-accent/30" },
  { days: 1,   label: "Active", icon: Flame,  color: "text-accent",     bg: "bg-accent/10 border-accent/30" },
];

export default function StreakBadge({ streak }) {
  if (!streak || streak === 0) return null;

  const milestone = MILESTONES.find(m => streak >= m.days) || MILESTONES[MILESTONES.length - 1];
  const Icon = milestone.icon;

  // Check if we just hit a milestone (streak === one of the milestone values)
  const justHit = MILESTONES.some(m => streak === m.days);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${milestone.bg}`}
      >
        <Icon className={`h-3.5 w-3.5 ${milestone.color}`} />
        <span className={`text-xs font-black ${milestone.color}`}>{streak}d</span>
        {justHit && (
          <motion.span
            initial={{ opacity: 0, scale: 0, y: -10 }}
            animate={{ opacity: [1, 1, 0], scale: [0.5, 1.2, 1], y: [-10, -24, -28] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-accent whitespace-nowrap"
          >
            🎉 Milestone!
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}