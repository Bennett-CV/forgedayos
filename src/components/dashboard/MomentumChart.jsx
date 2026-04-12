import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getDailyPoints } from "../../lib/momentum";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{payload[0]?.payload?.label}</p>
        <p className="text-sm font-bold font-mono text-primary">{payload[0].value} pts</p>
      </div>
    );
  }
  return null;
};

export default function MomentumChart({ activities }) {
  const data = getDailyPoints(activities, 30);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Momentum Trend</h2>
          <p className="text-xs text-muted-foreground mt-0.5">30-day rolling points</p>
        </div>
      </div>

      <div className="h-48 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(173, 80%, 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(173, 80%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215, 20%, 45%)' }}
              axisLine={false}
              tickLine={false}
              interval={6}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="points"
              stroke="hsl(173, 80%, 50%)"
              strokeWidth={2}
              fill="url(#momentumGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}