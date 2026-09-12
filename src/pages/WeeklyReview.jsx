import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { toast } from "sonner";
import GuidedCheckIn from "../components/review/GuidedCheckIn";
import WeekDigest from "../components/review/WeekDigest";
import ShareWeekCard from "../components/review/ShareWeekCard";
import { PILLAR_KEYS } from "../lib/constants";
import { buildWeekDigest, digestToMarkdown, formatWeekRange } from "../lib/weekSummary";

function answersFromReview(review) {
  if (!review) return {};
  return {
    win: review.highlights?.[0] || "",
    change: review.areas_to_improve?.[0] || "",
    next: extractFocus(review.summary),
  };
}

function extractFocus(summary) {
  if (!summary) return "";
  const match = String(summary).match(/### Focus next week\n([\s\S]*?)(?:\n###|$)/);
  return match ? match[1].trim() : "";
}

export default function WeeklyReview() {
  const { user } = useAuth();
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [meals, setMeals] = useState([]);
  const [weights, setWeights] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState(false);

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const [logs, mealRows, weightRows, journals, txns, acts, revs, me] = await Promise.all([
        base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 800),
        base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 400),
        base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 60),
        base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 120),
        base44.entities.Transaction.filter({ created_by: user.email }, "-date", 200),
        base44.entities.Activity.filter({ created_by: user.email }, "-date", 300),
        base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50),
        base44.auth.me(),
      ]);
      setWorkoutLogs(logs);
      setMeals(mealRows);
      setWeights(weightRows);
      setJournalEntries(journals);
      setTransactions(txns);
      setActivities(acts);
      setReviews(revs);
      setGoals(me?.nutrition_goals || user.nutrition_goals || null);
    } catch {
      // best-effort
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const currentReview = reviews.find(r => r.week_start === weekStartStr) || null;
  const digest = buildWeekDigest({
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    workoutLogs,
    meals,
    weights,
    journalEntries,
    transactions,
    goals,
  });
  const weekActivities = activities.filter(a => a.date >= weekStartStr && a.date <= weekEndStr);
  const totalPoints = weekActivities.reduce((s, a) => s + (a.points || 0), 0);
  const pillarPoints = {};
  PILLAR_KEYS.forEach(k => {
    pillarPoints[k] = weekActivities.filter(a => a.pillar === k).reduce((s, a) => s + (a.points || 0), 0);
  });

  const saveReview = async (answers) => {
    setSaving(true);
    const summary = digestToMarkdown(digest, answers || {});
    const payload = {
      week_start: weekStartStr,
      week_end: weekEndStr,
      summary,
      total_points: totalPoints,
      pillar_scores: pillarPoints,
      highlights: answers?.win ? [answers.win] : [],
      areas_to_improve: answers?.change ? [answers.change] : [],
    };
    try {
      if (currentReview) {
        await base44.entities.WeeklyReview.update(currentReview.id, payload);
      } else {
        await base44.entities.WeeklyReview.create(payload);
      }
      const revs = await base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50);
      setReviews(revs);
      setEditing(false);
      toast.success("Week closed.");
    } catch {
      toast.error("Couldn't save the review. Try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const showCheckIn = !currentReview || editing;
  const savedAnswers = answersFromReview(currentReview);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Weekly Review</h1>
        <p className="text-[13px] text-caption mt-1">The loop closes here.</p>
      </div>

      <div className="flex items-center justify-between editorial-card px-3 py-2">
        <button onClick={() => { setWeekOffset(o => o + 1); setEditing(false); }} className="text-[13px] font-semibold text-caption min-w-[44px]">
          Prev
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-ink">{formatWeekRange(weekStartStr, weekEndStr)}</p>
          <p className="text-[11px] text-caption">
            {currentReview ? "Reviewed" : "Open"}
          </p>
        </div>
        <button
          onClick={() => { setWeekOffset(o => Math.max(0, o - 1)); setEditing(false); }}
          disabled={weekOffset === 0}
          className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <WeekDigest digest={digest} rangeLabel={formatWeekRange(weekStartStr, weekEndStr)} />

      {showCheckIn ? (
        <GuidedCheckIn
          key={`${weekStartStr}-${currentReview?.id || "new"}`}
          initial={savedAnswers}
          saving={saving}
          onComplete={saveReview}
        />
      ) : (
        <div className="editorial-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="micro-label">Your notes</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[12px] font-semibold text-caption min-h-0 min-w-0"
            >
              Edit
            </button>
          </div>
          <Note label="Went well" text={savedAnswers.win} />
          <Note label="Change" text={savedAnswers.change} />
          <Note label="Next week" text={savedAnswers.next} />
        </div>
      )}

      {currentReview && (
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

function Note({ label, text }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-1 text-[14px] text-ink leading-relaxed">{text || "—"}</p>
    </div>
  );
}
