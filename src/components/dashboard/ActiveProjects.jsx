import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function ActiveProjects({ projects }) {
  const active = projects.filter(p => p.status === "active").slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="p-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</h2>
        </div>
        <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {active.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No active projects.</p>
            <Link to="/projects" className="text-xs text-primary hover:underline mt-1 inline-block">
              Create one →
            </Link>
          </div>
        ) : (
          active.map((project, i) => {
            const pillar = PILLARS[project.pillar];
            return (
              <div key={project.id || i} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full`} style={{ background: pillar?.color }} />
                    <span className="text-sm font-medium text-foreground">{project.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-1.5" />
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}