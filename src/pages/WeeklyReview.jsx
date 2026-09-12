import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subWeeks } from "date-fns";
import { formatLocalDate, localWeekStartDate, localWeekEndDate, normalizeDateKey } from "@/lib/localDate";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PILLARS, PILLAR_KEYS } from "../lib/constants";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import GuidedCheckIn from "../components/review/GuidedCheckIn";
import ShareWeekCard from "../components/review/ShareWeekCard";
import WeekOverview from "@/components/review/WeekOverview";
import { useLifeData } from "@/hooks/useLifeData";

export default function WeeklyReview() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const weekStart = localWeekStartDate(subWeeks(new Date(), weekOffset));
  const weekEnd = localWeekEndDate(subWeeks(new Date(), weekOffset));
  const weekStartStr = formatLocalDate(weekStart, "yyyy-MM-dd");
  const weekEndStr = formatLocalDate(weekEnd, "yyyy-MM-dd");

  const life = useLifeData(user?.email, weekStartStr, weekEndStr);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [acts, projs, revs] = await Promise.all([
          base44.entities.Activity.filter({ created_by: user.email }, "-date", 500),
          base44.entities.Project.filter({ created_by: user.email }, "-created_date", 50),
          base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50),
        ]);
        setActivities(acts);
        setProjects(projs);
        setReviews(revs);
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    const existing = reviews.find(r => r.week_start === weekStartStr);
    setCurrentReview(existing || null);
  }, [reviews, weekStartStr]);

  const weekActivities = activities.filter(a => {
    const d = normalizeDateKey(a.date);
    return d >= weekStartStr && d <= weekEndStr;
  });

  const totalPoints = weekActivities.reduce((s, a) => s + (a.points || 0), 0);
  const pillarPoints = {};
  PILLAR_KEYS.forEach(k => {
    pillarPoints[k] = weekActivities.filter(a => a.pillar === k).reduce((s, a) => s + (a.points || 0), 0);
  });

  const generateReview = async (checkInAnswers) => {
    if (generating || loadError || !user?.email) return;
    setShowCheckIn(false);
    setGenerating(true);
    try {
    const actSummary = weekActivities.map(a => `${a.title} (${a.pillar}, ${a.value || ''} ${a.unit || ''}, +${a.points}pts)`).join("\n");
    const projSummary = projects.filter(p => p.status === "active").map(p => `${p.name} (${p.progress}% complete, ${p.pillar})`).join("\n");

    const checkInContext = checkInAnswers ? `
User's self-reflection:
- Biggest win: ${checkInAnswers.win || "—"}
- What they missed: ${checkInAnswers.miss || "—"}
- Energy notes: ${checkInAnswers.energy || "—"}
- Next week focus: ${checkInAnswers.next || "—"}
` : "";

    const prompt = `You are Forgeday, a personal operating system for ambitious operators. Generate a concise, data-driven weekly review.
${checkInContext}

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
4. **What We Know** (distinguish logged facts from incomplete information; do not grade pillars without targets or infer failures from missing logs)
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

    const revs = await base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50);
    setReviews(revs);
    toast.success("Weekly review generated!");
    } catch {
      toast.error("Couldn't generate or save your review. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Weekly Review</h1>
        <p className="text-sm text-caption mt-0.5">Performance summary</p>
      </div>

      <div className="flex items-center justify-between editorial-card px-3 py-2">
        <button disabled={generating} onClick={() => setWeekOffset(o => o + 1)} className="text-[13px] font-semibold text-caption min-w-[44px]">
          Prev
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-ink">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}</p>
          <p className="text-[11px] text-caption">{weekActivities.length} activities · {totalPoints} pts</p>
        </div>
        <button
          onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
          disabled={weekOffset === 0 || generating}
          className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
        >
          Next
        </button>
      </div>

      {loadError && <p role="alert" className="editorial-card p-4 text-sm text-caption">Some review records could not load. Reload this page before generating a review.</p>}
      <div className="grid grid-cols-5 gap-1.5">
        {PILLAR_KEYS.map(k => {
          const p = PILLARS[k];
          return (
            <div key={k} className="editorial-card p-3 text-center flex flex-col items-center gap-1.5">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: p.color }} />
              <p className="text-[16px] font-semibold font-mono text-ink">{pillarPoints[k]}</p>
              <p className="text-[8px] uppercase tracking-[0.08em] text-faint font-bold">{p.label}</p>
            </div>
          );
        })}
      </div>

      <WeekOverview data={life.data} errors={life.errors} loading={life.loading} start={weekStartStr} end={weekEndStr} onRetry={life.refresh} />
      <p className="text-xs text-caption">These totals are calculated in the app. The optional AI review below uses activity logs, projects, and your reflection; it does not receive these new totals.</p>
      {/* Guided Check-In */}
      {showCheckIn && (
        <GuidedCheckIn key={weekStartStr} onComplete={(answers) => generateReview(answers)} />
      )}

      {/* Generate / Review */}
      {!showCheckIn && (currentReview?.summary ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="editorial-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="micro-label">Review</p>
            <Button variant="outline" size="sm" onClick={() => setShowCheckIn(true)} disabled={generating || loadError} className="text-xs">
              {generating ? "Working…" : "Regenerate"}
            </Button>
          </div>
          <div className="prose prose-sm max-w-none text-ink">
            <ReactMarkdown>{currentReview.summary}</ReactMarkdown>
          </div>
        </motion.div>
      ) : generating ? (
        <div className="text-center py-12 editorial-card">
          <p className="text-sm text-caption">Generating your review…</p>
        </div>
      ) : (
        <div className="text-center py-12 editorial-card border-dashed">
          <p className="text-sm text-caption mb-4">No review for this week yet.</p>
          <Button disabled={loadError} onClick={() => setShowCheckIn(true)} className="bg-clay text-clay-fg hover:bg-clay-hover">
            Start Weekly Review
          </Button>
        </div>
      ))}

      {/* Share */}
      {currentReview?.summary && (
        <ShareWeekCard
          review={currentReview}
          weekStart={weekStartStr}
          weekEnd={weekEndStr}
          pillarPoints={pillarPoints}
        />
      )}
    </div>
  );
}