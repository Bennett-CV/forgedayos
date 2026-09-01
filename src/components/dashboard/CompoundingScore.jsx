import { motion } from "framer-motion";
import { calculateMomentumScore, getStreak } from "../../lib/momentum";
import { subDays } from "date-fns";

function ScoreRing({ value }) {
  const size = 86;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 100)) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(var(--track))" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="oklch(var(--clay))"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="oklch(var(--ink))"
        style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 26, fontWeight: 600 }}
      >
        {value}
      </text>
    </svg>
  );
}

export default function CompoundingScore({ activities }) {
  const weekScore = calculateMomentumScore(activities, 7);
  const lastWeekStart = subDays(new Date(), 14);
  const lastWeekEnd = subDays(new Date(), 7);
  const lastWeekScore = activities
    .filter(a => {
      const d = new Date(a.date);
      return d >= lastWeekStart && d < lastWeekEnd;
    })
    .reduce((s, a) => s + (a.points || 0), 0);
  const delta = weekScore - lastWeekScore;
  const streak = getStreak(activities);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="editorial-card p-5 flex items-center gap-4"
    >
      <ScoreRing value={weekScore} />
      <div className="min-w-0">
        <p className="micro-label">Compounding Score</p>
        <p className="mt-1.5 text-[13px] font-semibold text-clay">
          {delta > 0 ? "+" : ""}{delta} vs last week
        </p>
        <p className="mt-1 text-[12px] text-caption">
          This week, across 5 pillars{streak > 1 ? ` · ${streak}-day streak` : ""}.
        </p>
      </div>
    </motion.div>
  );
}
