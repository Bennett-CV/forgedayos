import { motion } from "framer-motion";
import { PILLARS } from "../../lib/constants";
import { subDays } from "date-fns";

export default function PillarCard({ pillar, activities, index }) {
  const config = PILLARS[pillar];
  const weekPoints = activities
    .filter(a => a.pillar === pillar && new Date(a.date) >= subDays(new Date(), 7))
    .reduce((s, a) => s + (a.points || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="editorial-card flex flex-col items-center justify-between py-3 px-1 min-h-[88px]"
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: config.color }} />
      <span className="font-mono text-[18px] font-semibold text-ink leading-none">{weekPoints}</span>
      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-faint text-center leading-tight">
        {config.label}
      </span>
    </motion.div>
  );
}
