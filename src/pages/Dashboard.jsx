import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatLocalDate, localToday, localWeekStartKey, localWeekEndKey, localMonthKey } from "@/lib/localDate";
import { greetingFirstName, greetingForHour } from "@/lib/greetingName";
import { buildTodaySnapshot } from "@/lib/todayCommand";
import { computeForgedayScore } from "@/lib/forgedayScore";
import { generateInsights } from "@/lib/insights";
import { normalizeBooks } from "@/lib/books";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import TodayCommand from "../components/dashboard/TodayCommand";
import ForgedayScoreCard from "../components/score/ForgedayScoreCard";
import InsightList from "../components/score/InsightList";

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
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

    const [meals, logs, program, journals, txns, reviews, activities, weights, budgets] = await Promise.all([
      safe(base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 200), []),
      safe(base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 400), []),
      safe(base44.entities.WorkoutProgram.filter({ created_by: user.email }, "day", 12), []),
      safe(base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 80), []),
      safe(base44.entities.Transaction.filter({ month, created_by: user.email }), []),
      safe(base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 20), []),
      safe(base44.entities.Activity.filter({ created_by: user.email }, "-created_date", 200), []),
      safe(base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 90), []),
      safe(base44.entities.BudgetCategory.filter({ created_by: user.email }), []),
    ]);

    const workoutProgram = (program || []).filter(d => d.created_by === user.email);
    const books = normalizeBooks(user.books);

    setSnapshot(buildTodaySnapshot({
      user,
      today,
      now: new Date(),
      meals,
      workoutLogs: logs,
      workoutProgram,
      journalEntries: journals,
      transactions: txns,
      activities,
      reviews,
      weightLogs: weights,
      books,
      weekStart,
    }));

    setScore(computeForgedayScore({
      user,
      today,
      weekStart,
      weekEnd,
      meals,
      workoutLogs: logs,
      workoutProgram,
      journalEntries: journals,
      transactions: txns,
      weightLogs: weights,
      activities,
      books,
      budgetCategories: budgets,
    }));

    setInsights(generateInsights({
      user,
      today,
      weekStart,
      weekEnd,
      meals,
      workoutLogs: logs,
      journalEntries: journals,
      transactions: txns,
      weightLogs: weights,
      activities,
      books,
    }));

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(), [load]);
  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(refresh);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const today = formatLocalDate(new Date(), "EEEE, MMMM d");
  const firstName = greetingFirstName(user);
  const greeting = greetingForHour(new Date().getHours());

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-[22px]">
        <div>
          <p className="text-[12px] text-caption">{today}</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight text-ink leading-tight">
            {greeting}, {firstName}.
          </h1>
        </div>
        <TodayCommand snapshot={snapshot} />
        <ForgedayScoreCard score={score} compact />
        <InsightList insights={insights} />
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { to: "/score", label: "Score" },
            { to: "/review", label: "Review" },
            { to: "/finance", label: "Finance" },
          ].map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-center min-h-[44px] rounded-[4px] border border-border bg-card text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
