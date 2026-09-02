import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { formatDistanceToNow } from "date-fns";

function relativeLabel(when) {
  if (!when) return "";
  const raw = String(when);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const d = dateOnly ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  if (d.getTime() > Date.now()) return "today";
  try {
    return formatDistanceToNow(d, { addSuffix: true }).replace("about ", "");
  } catch {
    return raw;
  }
}

export default function RecentActivity({ activities }) {
  const recent = [...activities]
    .sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date))
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <p className="micro-label mb-3">Recent Activity</p>
      {recent.length === 0 ? (
        <div className="editorial-card px-4 py-6 text-center">
          <p className="text-sm text-caption">No activities yet.</p>
        </div>
      ) : (
        <div className="editorial-card overflow-hidden">
          {recent.map((activity, i) => {
            const pillar = PILLARS[activity.pillar];
            const rel = relativeLabel(activity.created_date || activity.date);
            return (
              <div
                key={activity.id || i}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink truncate">{activity.title}</p>
                  <p className="text-[11px] text-caption mt-0.5">
                    {pillar?.label || activity.pillar} · {rel}
                  </p>
                </div>
                <span className="font-mono text-[13px] font-medium text-clay shrink-0">+{activity.points}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
