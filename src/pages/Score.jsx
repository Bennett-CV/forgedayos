import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { localToday, localWeekStartKey, localWeekEndKey, localMonthKey, formatLocalDate } from "@/lib/localDate";
import { computeForgedayScore } from "@/lib/forgedayScore";
import { generateInsights } from "@/lib/insights";
import { normalizeBooks } from "@/lib/books";
import ForgedayScoreCard from "@/components/score/ForgedayScoreCard";
import InsightList from "@/components/score/InsightList";

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default function Score() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    const today = localToday();
    const weekStart = localWeekStartKey(new Date());
    const weekEnd = localWeekEndKey(new Date());
    const month = localMonthKey(new Date());

    const [meals, logs, program, journals, txns, activities, weights, budgets] = await Promise.all([
      safe(base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 200), []),
      safe(base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 400), []),
      safe(base44.entities.WorkoutProgram.filter({ created_by: user.email }, "day", 12), []),
      safe(base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 80), []),
      safe(base44.entities.Transaction.filter({ month, created_by: user.email }), []),
      safe(base44.entities.Activity.filter({ created_by: user.email }, "-created_date", 200), []),
      safe(base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 90), []),
      safe(base44.entities.BudgetCategory.filter({ created_by: user.email }), []),
    ]);

    const input = {
      user,
      today,
      weekStart,
      weekEnd,
      meals,
      workoutLogs: logs,
      workoutProgram: (program || []).filter(d => d.created_by === user.email),
      journalEntries: journals,
      transactions: txns,
      weightLogs: weights,
      activities,
      books: normalizeBooks(user.books),
      budgetCategories: budgets,
    };
    setScore(computeForgedayScore(input));
    setInsights(generateInsights(input));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const weekStart = localWeekStartKey(new Date());
  const weekEnd = localWeekEndKey(new Date());

  return (
    <div className="space-y-[22px]">
      <div>
        <h1 className="page-title">Score</h1>
        <p className="text-sm text-caption mt-0.5">
          {formatLocalDate(weekStart, "MMM d")} – {formatLocalDate(weekEnd, "MMM d")}
        </p>
      </div>
      <ForgedayScoreCard score={score} />
      <InsightList insights={insights} />
      <p className="text-[12px] text-caption leading-relaxed px-0.5">
        Weights follow the pillars you enabled. Disabled pillars do not pull the total down.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/"
          className="flex items-center justify-center min-h-[44px] rounded-[4px] border border-border bg-card text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
        >
          Today
        </Link>
        <Link
          to="/review"
          className="flex items-center justify-center min-h-[44px] rounded-[4px] border border-border bg-card text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
        >
          Weekly Review
        </Link>
      </div>
    </div>
  );
}
