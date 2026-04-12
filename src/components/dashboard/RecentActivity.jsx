import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { format } from "date-fns";
import { Clock } from "lucide-react";

export default function RecentActivity({ activities }) {
  const recent = [...activities]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="p-6 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
        </div>
      </div>

      <div className="px-4 pb-4">
        {recent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No activities yet. Start logging!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((activity, i) => {
              const pillar = PILLARS[activity.pillar];
              const Icon = pillar?.icon;
              return (
                <div
                  key={activity.id || i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-lg ${pillar?.bgClass} flex items-center justify-center flex-shrink-0`}>
                    {Icon && <Icon className={`h-4 w-4 ${pillar?.textClass}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {activity.value ? `${activity.value} ${activity.unit || ''}` : ''} · {format(new Date(activity.date), 'MMM d')}
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-primary">+{activity.points}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}