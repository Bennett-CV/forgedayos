import { motion } from "framer-motion";
import { getDailyPoints } from "../../lib/momentum";

export default function MomentumChart({ activities }) {
  const data = getDailyPoints(activities, 7);
  const max = Math.max(1, ...data.map(d => d.points));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      <p className="micro-label mb-3">Momentum · Last 7 Days</p>
      <div className="flex items-end justify-between gap-1.5 h-[72px]">
        {data.map((d) => {
          const h = Math.max(6, Math.round((d.points / max) * 64));
          const initial = d.label.slice(-2).trim() ? new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" }) : "";
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                className="w-full max-w-[28px] rounded-[2px] bg-clay"
                style={{ height: h, opacity: d.points === 0 ? 0.28 : 1 }}
              />
              <span className="text-[10px] font-semibold text-faint">{initial}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
