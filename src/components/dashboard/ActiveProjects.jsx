import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { Link } from "react-router-dom";

export default function ActiveProjects({ projects }) {
  const active = projects.filter(p => p.status === "active").slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="micro-label">Active Projects</p>
        <Link to="/projects" className="text-[12px] font-semibold text-clay min-h-0 min-w-0">
          View all
        </Link>
      </div>
      {active.length === 0 ? (
        <div className="editorial-card px-4 py-6 text-center">
          <p className="text-sm text-caption">No active projects.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((project, i) => {
            const pillar = PILLARS[project.pillar];
            const pct = project.progress || 0;
            const metric = project.target_value
              ? `${project.current_value || 0} / ${project.target_value}`
              : `${pct}%`;
            return (
              <div key={project.id || i} className="editorial-card p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[14px] font-semibold text-ink truncate pr-3">{project.name}</p>
                  <span className="font-mono text-[12px] text-caption shrink-0">{metric}</span>
                </div>
                <div className="h-[3px] rounded-[2px] bg-track overflow-hidden">
                  <div
                    className="h-full rounded-[2px]"
                    style={{ width: `${pct}%`, background: pillar?.color || "oklch(var(--clay))" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
