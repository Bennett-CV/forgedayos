import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Flame, Zap, Target } from "lucide-react";
import { calculateMomentumScore, calculateVelocity, getQTDScore, getStreak } from "../../lib/momentum";

export default function CompoundingScore({ activities }) {
  const weekScore = calculateMomentumScore(activities, 7);
  const monthScore = calculateMomentumScore(activities, 30);
  const velocity = calculateVelocity(activities);
  const qtdScore = getQTDScore(activities);
  const streak = getStreak(activities);

  const VelocityIcon = velocity > 0 ? TrendingUp : velocity < 0 ? TrendingDown : Minus;
  const velocityColor = velocity > 0 ? "text-success" : velocity < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header with main score */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Compounding Score</h2>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">{streak}d streak</span>
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-black tracking-tighter text-foreground font-mono">{weekScore}</span>
          <span className="text-sm text-muted-foreground font-medium">pts / 7d</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <VelocityIcon className={`h-4 w-4 ${velocityColor}`} />
          <span className={`text-sm font-semibold ${velocityColor}`}>
            {velocity > 0 ? "+" : ""}{velocity}% vs last week
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-border">
        <div className="p-4 text-center border-r border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">7-Day</p>
          <p className="text-lg font-bold font-mono text-foreground">{weekScore}</p>
        </div>
        <div className="p-4 text-center border-r border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">30-Day</p>
          <p className="text-lg font-bold font-mono text-foreground">{monthScore}</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">QTD</p>
          <p className="text-lg font-bold font-mono text-foreground">{qtdScore}</p>
        </div>
      </div>
    </motion.div>
  );
}