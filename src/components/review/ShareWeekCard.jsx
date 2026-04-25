import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PILLARS, PILLAR_KEYS } from "../../lib/constants";
import { format } from "date-fns";

export default function ShareWeekCard({ review, weekStart, weekEnd, pillarPoints }) {
  const [copied, setCopied] = useState(false);

  const buildShareText = () => {
    const lines = [
      `📊 Forgeday Weekly Report`,
      `${format(new Date(weekStart), "MMM d")} – ${format(new Date(weekEnd), "MMM d, yyyy")}`,
      ``,
      `🏆 Total Points: ${review.total_points || 0}`,
      ``,
      `Pillar Breakdown:`,
      ...PILLAR_KEYS.map(k => {
        const pts = (review.pillar_scores || pillarPoints)[k] || 0;
        const bar = "█".repeat(Math.min(10, Math.round(pts / 3))) || "░";
        return `${PILLARS[k].label}: ${bar} ${pts}pts`;
      }),
      ``,
      review.highlights?.length ? `✅ Wins:\n${review.highlights.slice(0, 2).map(h => `• ${h}`).join("\n")}` : "",
      ``,
      `Built with Forgeday 🔥`,
    ].filter(l => l !== undefined);

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Share Your Week</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
          {copied ? <><Check className="h-3 w-3 text-success" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
        </Button>
      </div>

      <pre className="text-xs text-muted-foreground bg-secondary/40 rounded-xl p-4 font-mono whitespace-pre-wrap leading-relaxed">
        {buildShareText()}
      </pre>
    </motion.div>
  );
}