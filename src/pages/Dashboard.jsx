import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatLocalDate, localToday, localWeekStartKey, localMonthKey } from "@/lib/localDate";
import { greetingFirstName, greetingForHour } from "@/lib/greetingName";
import { buildTodaySnapshot } from "@/lib/todayCommand";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import TodayCommand from "../components/dashboard/TodayCommand";

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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    const today = localToday();
    const weekStart = localWeekStartKey(new Date());
    const month = localMonthKey(new Date());

    const [meals, logs, program, journals, txns, reviews, activities] = await Promise.all([
      safe(base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 200), []),
      safe(base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 400), []),
      safe(base44.entities.WorkoutProgram.filter({ created_by: user.email }, "day", 12), []),
      safe(base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 80), []),
      safe(base44.entities.Transaction.filter({ month, created_by: user.email }), []),
      safe(base44.entities.WeeklyReview.filter({ created_by: user.email }, "-created_date", 20), []),
      safe(base44.entities.Activity.filter({ created_by: user.email }, "-created_date", 200), []),
    ]);

    setSnapshot(buildTodaySnapshot({
      user,
      today,
      now: new Date(),
      meals,
      workoutLogs: logs,
      workoutProgram: (program || []).filter(d => d.created_by === user.email),
      journalEntries: journals,
      transactions: txns,
      activities,
      reviews,
      weekStart,
    }));
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
      </div>
    </>
  );
}
