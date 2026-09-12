import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import TodayCommand from "../components/dashboard/TodayCommand";
import { buildTodayCommand, todayKey, weekStartKey } from "../lib/todayCommand";

export default function Dashboard() {
  const { user } = useAuth();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    const today = todayKey();
    const weekStart = weekStartKey();
    const monthKey = format(new Date(), "yyyy-MM");
    try {
      const [
        acts,
        meals,
        logs,
        programDays,
        journals,
        txns,
        reviews,
        weights,
        me,
      ] = await Promise.all([
        base44.entities.Activity.filter({ created_by: user.email }, "-created_date", 200),
        base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 200),
        base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 400),
        base44.entities.WorkoutProgram.filter({ created_by: user.email }, "day", 10),
        base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 80),
        base44.entities.Transaction.filter({ month: monthKey, created_by: user.email }),
        base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 12),
        base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 30),
        base44.auth.me(),
      ]);

      const todayMeals = meals.filter(m => m.date === today);
      const weekLogs = logs.filter(l => l.week_start === weekStart);
      const weekSessions = new Set(weekLogs.map(l => `${l.week_start}-${l.day}`)).size;
      const reviewExists = reviews.some(r => r.week_start === weekStart);
      const weekWeights = weights
        .filter(w => w.date >= weekStart)
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const weightDelta = weekWeights.length >= 2
        ? Number(weekWeights[weekWeights.length - 1].weight_lbs) - Number(weekWeights[0].weight_lbs)
        : null;
      const hasFinanceData = txns.length > 0 || (user.focused_pillars || []).includes("finance");
      const weekHasData = weekSessions > 0 || todayMeals.length > 0 || journals.some(e => e.date >= weekStart) || txns.some(t => t.date >= weekStart);

      setView(buildTodayCommand({
        user: { ...user, ...(me || {}) },
        meals: todayMeals,
        goals: me?.nutrition_goals || user.nutrition_goals,
        workoutLogs: logs,
        weekWorkoutLogs: weekLogs,
        activities: acts,
        journalEntries: journals,
        transactions: txns,
        program: programDays.filter(d => d.created_by === user.email),
        hasFinanceData,
        reviewExists,
        weekHasData,
        weekSessions,
        weightDelta,
      }));
    } catch {
      setView(buildTodayCommand({ user }));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(load);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <TodayCommand view={view} />
    </>
  );
}
