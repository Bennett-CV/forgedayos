import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { calculateMomentumScore } from "../../lib/momentum";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays, format } from "date-fns";

export default function PillarCard({ pillar, activities, index }) {
  const config = PILLARS[pillar];
  const Icon = config.icon;

  const pillarActivities = activities.filter(a => a.pillar === pillar);
  const weekPoints = pillarActivities
    .filter(a => new Date(a.date) >= subDays(new Date(), 7))
    .reduce((s, a) => s + (a.points || 0), 0);
  const prevWeekPoints = pillarActivities
    .filter(a => {
      const d = new Date(a.date);
      return d >= subDays(new Date(), 14) && d < subDays(new Date(), 7);
    })
    .reduce((s, a) => s + (a.points || 0), 0);

  const change = prevWeekPoints === 0
    ? weekPoints > 0 ? 100 : 0
    : Math.round(((weekPoints - prevWeekPoints) / prevWeekPoints) * 100);

  const todayCount = pillarActivities.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length;
  const status = weekPoints > 0 ? (change >= 0 ? "on-track" : "slipping") : "inactive";
  const StatusIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-2xl border ${config.borderClass} bg-card p-5 hover:border-border transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${config.bgClass} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${config.textClass}`} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'on-track' ? 'bg-success/10 text-success' :
          status === 'slipping' ? 'bg-destructive/10 text-destructive' :
          'bg-muted text-muted-foreground'
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${
            status === 'on-track' ? 'bg-success' :
            status === 'slipping' ? 'bg-destructive' :
            'bg-muted-foreground'
          }`} />
          {status === 'on-track' ? 'On Track' : status === 'slipping' ? 'Off Track' : 'No Data'}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1">{config.label}</h3>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black font-mono text-foreground">{weekPoints}</span>
        <span className="text-xs text-muted-foreground">pts / week</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <StatusIcon className={`h-3 w-3 ${change >= 0 ? 'text-success' : 'text-destructive'}`} />
          <span className={`font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        </div>
        <span className="text-muted-foreground">
          {todayCount} today
        </span>
      </div>
    </motion.div>
  );
}