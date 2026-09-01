import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PILLARS } from "../../lib/constants";
import { subDays, startOfMonth, format } from "date-fns";

function getPeriodPoints(activities, target) {
  const now = new Date();
  let start;
  if (target.period === "daily") start = new Date(format(now, "yyyy-MM-dd"));
  else if (target.period === "weekly") start = subDays(now, 7);
  else if (target.period === "monthly") start = startOfMonth(now);
  else start = subDays(now, 90);

  return activities
    .filter(a => a.pillar === target.pillar && new Date(a.date) >= start)
    .reduce((sum, a) => sum + (a.value || 0), 0);
}

export default function GoalProgress({ activities }) {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.PillarTarget.filter({ created_by: user.email }, "pillar", 20)
      .then(setTargets);
  }, [user]);

  if (targets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="editorial-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="micro-label">Goal Progress</p>
        <Link to="/settings" className="text-[12px] font-semibold text-clay min-h-0 min-w-0">
          Manage
        </Link>
      </div>

      <div className="p-4 pt-2 space-y-3">
        {targets.slice(0, 5).map(target => {
          const config = PILLARS[target.pillar] || PILLARS.career;
          const current = getPeriodPoints(activities, target);
          const pct = Math.min(100, Math.round((current / target.target_value) * 100));
          const done = pct >= 100;

          return (
            <div key={target.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block h-[7px] w-[7px] rounded-full shrink-0" style={{ background: config.color }} />
                  <span className="font-medium text-ink truncate">{target.metric_name}</span>
                  <span className="text-caption capitalize">· {target.period}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono font-semibold text-ink">{Math.round(current)}</span>
                  <span className="text-caption">/ {target.target_value} {target.unit || "pts"}</span>
                  {done && <span className="ml-1 text-success">Done</span>}
                </div>
              </div>
              <div className="h-[3px] rounded-[2px] bg-track overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-[2px]"
                  style={{ background: done ? "var(--success)" : config.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
