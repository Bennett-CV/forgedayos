import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Plus, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PILLARS } from "../../lib/constants";

export default function EmptyStateDashboard({ user }) {
  const focusedPillars = user?.focused_pillars || [];
  const name = user?.full_name?.split(" ")[0] || "there";

  const quickActions = focusedPillars.length > 0
    ? focusedPillars.slice(0, 3).map(key => {
        const p = PILLARS[key];
        if (!p) return null;
        const Icon = p.icon;
        return (
          <Link key={key} to="/log">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 p-4 rounded-xl border ${p.borderClass} ${p.bgClass} cursor-pointer`}
            >
              <div className={`h-9 w-9 rounded-lg bg-background/30 flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${p.textClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Log {p.label}</p>
                <p className="text-xs text-muted-foreground truncate">{p.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </motion.div>
          </Link>
        );
      }).filter(Boolean)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-12 px-4 space-y-8"
    >
      {/* Hero */}
      <div>
        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">
          Ready to forge, {name}?
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Log your first activity to start building momentum. Every rep, every page, every dollar counts.
        </p>
      </div>

      {/* Quick actions based on chosen pillars */}
      {quickActions && quickActions.length > 0 ? (
        <div className="w-full max-w-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Your Focus Areas
          </p>
          {quickActions}
        </div>
      ) : (
        <Link to="/log">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 px-8">
            <Plus className="h-5 w-5" />
            Log Your First Activity
          </Button>
        </Link>
      )}

      {/* Set goals nudge */}
      <Link to="/settings" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Target className="h-3.5 w-3.5" />
        Set up your goals & targets
        <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}