import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Target, ChevronRight } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Goal Progress</h2>
        </div>
        <Link to="/settings" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Manage <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {targets.slice(0, 5).map(target => {
          const config = PILLARS[target.pillar] || PILLARS["career"];
          const current = getPeriodPoints(activities, target);
          const pct = Math.min(100, Math.round((current / target.target_value) * 100));
          const done = pct >= 100;

          return (
            <div key={target.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${config.bgClass} border ${config.borderClass}`} />
                  <span className="font-medium text-foreground">{target.metric_name}</span>
                  <span className="text-muted-foreground capitalize">· {target.period}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`font-mono font-bold ${done ? "text-success" : config.textClass}`}>
                    {Math.round(current)}
                  </span>
                  <span className="text-muted-foreground">/ {target.target_value} {target.unit || "pts"}</span>
                  {done && <span className="ml-1">✓</span>}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${done ? "bg-success" : `bg-current ${config.textClass}`}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}