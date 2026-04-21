import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { FileText, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PILLARS, PILLAR_KEYS } from "../lib/constants";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function WeeklyReview() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [acts, projs, revs] = await Promise.all([
        base44.entities.Activity.filter({ created_by: user.email }, "-date", 500),
        base44.entities.Project.filter({ created_by: user.email }, "-created_date", 50),
        base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50),
      ]);
      setActivities(acts);
      setProjects(projs);
      setReviews(revs);
      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    const existing = reviews.find(r => r.week_start === weekStartStr);
    setCurrentReview(existing || null);
  }, [reviews, weekStartStr]);

  const weekActivities = activities.filter(a => {
    const d = a.date;
    return d >= weekStartStr && d <= weekEndStr;
  });

  const totalPoints = weekActivities.reduce((s, a) => s + (a.points || 0), 0);
  const pillarPoints = {};
  PILLAR_KEYS.forEach(k => {
    pillarPoints[k] = weekActivities.filter(a => a.pillar === k).reduce((s, a) => s + (a.points || 0), 0);
  });

  const generateReview = async () => {
    setGenerating(true);
    const actSummary = weekActivities.map(a => `${a.title} (${a.pillar}, ${a.value || ''} ${a.unit || ''}, +${a.points}pts)`).join("\n");
    const projSummary = projects.filter(p => p.status === "active").map(p => `${p.name} (${p.progress}% complete, ${p.pillar})`).join("\n");

    const prompt = `You are MomentumOS, a personal operating system for ambitious operators. Generate a concise, data-driven weekly review.

Week: ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}
Total Points: ${totalPoints}

Activities this week:
${actSummary || 'No activities logged.'}

Active Projects:
${projSummary || 'No active projects.'}

Pillar Breakdown:
${PILLAR_KEYS.map(k => `${PILLARS[k].label}: ${pillarPoints[k]} pts`).join('\n')}

Generate a weekly review with these sections:
1. **Executive Summary** (2-3 sentences, direct and metrics-driven)
2. **Highlights** (bullet points of wins)
3. **Areas to Improve** (bullet points, honest but constructive)
4. **Pillar Scorecard** (rate each pillar: 🟢 On Track / 🟡 Needs Attention / 🔴 Off Track)
5. **Next Week Focus** (1-2 priority items)

Keep the tone like a founder's weekly investor update — sharp, honest, forward-looking. No fluff.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Full markdown review" },
          highlights: { type: "array", items: { type: "string" } },
          areas_to_improve: { type: "array", items: { type: "string" } },
        },
      },
    });

    if (currentReview) {
      await base44.entities.WeeklyReview.update(currentReview.id, {
        summary: result.summary,
        total_points: totalPoints,
        pillar_scores: pillarPoints,
        highlights: result.highlights,
        areas_to_improve: result.areas_to_improve,
      });
    } else {
      await base44.entities.WeeklyReview.create({
        week_start: weekStartStr,
        week_end: weekEndStr,
        summary: result.summary,
        total_points: totalPoints,
        pillar_scores: pillarPoints,
        highlights: result.highlights,
        areas_to_improve: result.areas_to_improve,
      });
    }

    const revs = await base44.entities.WeeklyReview.list("-created_date", 50);
    setReviews(revs);
    setGenerating(false);
    toast.success("Weekly review generated!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Weekly Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-generated performance summary</p>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{weekActivities.length} activities · {totalPoints} pts</p>
        </div>
        <button
          onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Pillar Summary */}
      <div className="grid grid-cols-5 gap-2">
        {PILLAR_KEYS.map(k => {
          const p = PILLARS[k];
          return (
            <div key={k} className={`rounded-xl border ${p.borderClass} ${p.bgClass} p-3 text-center`}>
              <p className={`text-lg font-black font-mono ${p.textClass}`}>{pillarPoints[k]}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{p.label.slice(0, 6)}</p>
            </div>
          );
        })}
      </div>

      {/* Generate / Review */}
      {currentReview?.summary ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Review</h2>
            </div>
            <Button variant="outline" size="sm" onClick={generateReview} disabled={generating} className="text-xs">
              {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Regenerate
            </Button>
          </div>
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{currentReview.summary}</ReactMarkdown>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No review for this week yet.</p>
          <Button onClick={generateReview} disabled={generating} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Weekly Review
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}