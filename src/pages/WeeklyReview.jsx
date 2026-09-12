import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { subWeeks } from "date-fns";
import {
  localWeekStartDate,
  localWeekEndDate,
  localWeekStartKey,
  localWeekEndKey,
  formatLocalDate,
} from "@/lib/localDate";
import { PILLAR_KEYS } from "../lib/constants";
import { synthesizeWeek, renderWeekSummaryMarkdown, weekHighlights } from "@/lib/weekSynthesis";
import { generateInsights } from "@/lib/insights";
import { computeForgedayScore } from "@/lib/forgedayScore";
import { normalizeBooks } from "@/lib/books";
import { toast } from "sonner";
import GuidedCheckIn from "../components/review/GuidedCheckIn";
import WeekSynthesisCard from "../components/review/WeekSynthesisCard";
import ShareWeekCard from "../components/review/ShareWeekCard";
import InsightList from "../components/score/InsightList";
import ForgedayScoreCard from "../components/score/ForgedayScoreCard";

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function answersFromSummary(summary) {
  const text = summary || "";
  return {
    win: (text.match(/Went well:\s*(.+)/) || [])[1] || "",
    change: (text.match(/Change:\s*(.+)/) || [])[1] || "",
    next: (text.match(/Next week:\s*(.+)/) || [])[1] || "",
  };
}

export default function WeeklyReview() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [meals, setMeals] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const weekStart = localWeekStartDate(subWeeks(new Date(), weekOffset));
  const weekEnd = localWeekEndDate(subWeeks(new Date(), weekOffset));
  const weekStartStr = localWeekStartKey(subWeeks(new Date(), weekOffset));
  const weekEndStr = localWeekEndKey(subWeeks(new Date(), weekOffset));
  const books = normalizeBooks(user?.books);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    async function load() {
      const [acts, mealRows, logs, journals, txns, weights, revs] = await Promise.all([
        safe(base44.entities.Activity.filter({ created_by: user.email }, "-date", 500), []),
        safe(base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 400), []),
        safe(base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 800), []),
        safe(base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 200), []),
        safe(base44.entities.Transaction.filter({ created_by: user.email }, "-date", 200), []),
        safe(base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 80), []),
        safe(base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 50), []),
      ]);
      setActivities(acts);
      setMeals(mealRows);
      setWorkoutLogs(logs);
      setJournalEntries(journals);
      setTransactions(txns);
      setWeightLogs(weights);
      setReviews(revs);
      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    const existing = reviews.find(r => r.week_start === weekStartStr);
    setCurrentReview(existing || null);
    setShowCheckIn(false);
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

  const synthesis = useMemo(() => synthesizeWeek({
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    meals,
    workoutLogs,
    journalEntries,
    transactions,
    weightLogs,
    activities,
    nutritionGoals: user?.nutrition_goals || {},
    books,
  }), [weekStartStr, weekEndStr, meals, workoutLogs, journalEntries, transactions, weightLogs, activities, user, books]);

  const insights = useMemo(() => generateInsights({
    user,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    meals,
    workoutLogs,
    journalEntries,
    transactions,
    weightLogs,
    activities,
    books,
  }), [user, weekStartStr, weekEndStr, meals, workoutLogs, journalEntries, transactions, weightLogs, activities, books]);

  const score = useMemo(() => computeForgedayScore({
    user,
    today: weekEndStr,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    meals,
    workoutLogs,
    journalEntries,
    transactions,
    weightLogs,
    activities,
    books,
  }), [user, weekStartStr, weekEndStr, meals, workoutLogs, journalEntries, transactions, weightLogs, activities, books]);

  const savedAnswers = answersFromSummary(currentReview?.summary);

  const saveReview = async (checkInAnswers) => {
    setSaving(true);
    const answers = checkInAnswers || {};
    const summary = renderWeekSummaryMarkdown(synthesis, answers);
    const highlights = weekHighlights(synthesis, answers);
    const areas = [answers.change, answers.next].filter(Boolean);

    try {
      if (currentReview) {
        await base44.entities.WeeklyReview.update(currentReview.id, {
          summary,
          total_points: totalPoints,
          pillar_scores: pillarPoints,
          highlights,
          areas_to_improve: areas,
        });
      } else {
        await base44.entities.WeeklyReview.create({
          week_start: weekStartStr,
          week_end: weekEndStr,
          summary,
          total_points: totalPoints,
          pillar_scores: pillarPoints,
          highlights,
          areas_to_improve: areas,
        });
      }
      const revs = await safe(base44.entities.WeeklyReview.list("-created_date", 50), []);
      setReviews(revs);
      setShowCheckIn(false);
      toast.success("Weekly review saved.");
    } catch {
      toast.error("Could not save this review.");
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

  const loggedCount = weekActivities.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Weekly Review</h1>
        <p className="text-sm text-caption mt-0.5">Your Forgeday week, from the logs</p>
      </div>

      <div className="flex items-center justify-between editorial-card px-3 py-2">
        <button onClick={() => setWeekOffset(o => o + 1)} className="text-[13px] font-semibold text-caption min-w-[44px]">
          Prev
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-ink">
            {formatLocalDate(weekStart, "MMM d")} – {formatLocalDate(weekEnd, "MMM d")}
          </p>
          <p className="text-[11px] text-caption">
            {loggedCount} activities{totalPoints ? ` · ${totalPoints} pts` : ""}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <ForgedayScoreCard score={score} compact />
      <WeekSynthesisCard
        synthesis={synthesis}
        answers={currentReview && !showCheckIn ? savedAnswers : null}
      />
      <InsightList insights={insights} />

      {showCheckIn ? (
        <GuidedCheckIn
          onComplete={saveReview}
          initial={savedAnswers}
          saving={saving}
        />
      ) : currentReview?.summary ? (
        <button
          type="button"
          onClick={() => setShowCheckIn(true)}
          className="w-full min-h-[44px] rounded-[4px] border border-border text-[13px] font-semibold text-ink"
        >
          Update notes
        </button>
      ) : (
        <div className="editorial-card px-5 py-6 space-y-4">
          <p className="text-sm text-caption leading-relaxed">
            The summary above is already yours. Add two or three notes, then close the week.
          </p>
          <button
            type="button"
            onClick={() => setShowCheckIn(true)}
            className="flex items-center justify-center w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover"
          >
            Add notes & save
          </button>
          <button
            type="button"
            onClick={() => saveReview({})}
            disabled={saving}
            className="flex items-center justify-center w-full min-h-[44px] text-[12px] font-bold uppercase tracking-[0.12em] text-caption"
          >
            {saving ? "Saving…" : "Save without notes"}
          </button>
        </div>
      )}

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
