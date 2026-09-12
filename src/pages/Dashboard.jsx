import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatLocalDate, localToday, localWeekStartKey, localWeekEndKey, localMonthKey } from "@/lib/localDate";
import { greetingFirstName, greetingForHour } from "@/lib/greetingName";
import { buildTodaySnapshot } from "@/lib/todayCommand";
import { computeForgedayScore } from "@/lib/forgedayScore";
import { generateInsights } from "@/lib/insights";
import { normalizeBooks } from "@/lib/books";
import { buildGlanceWidgets } from "@/lib/glanceWidgets";
import { evaluateSmartNudges, pickPrimaryNudge, normalizeNotificationPrefs } from "@/lib/smartNotifications";
import {
  detectNotificationCapability,
  dismissNudge,
  markNudgeFired,
  readNudgeState,
  shouldFireLocalHook,
  shouldShowInAppNudge,
  showBrowserNotification,
} from "@/lib/notificationBridge";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import TodayCommand from "../components/dashboard/TodayCommand";
import ForgedayScoreCard from "../components/score/ForgedayScoreCard";
import InsightList from "../components/score/InsightList";
import GlanceWidgets from "../components/dashboard/GlanceWidgets";
import SmartBanner from "../components/notifications/SmartBanner";

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
  const [weightLogs, setWeightLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [nudgeState, setNudgeState] = useState(() => readNudgeState());
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

    const [meals, logs, program, journals, txns, reviews, acts, weights, budgets] = await Promise.all([
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

    setActivities(acts);
    setWeightLogs(weights);
    setSnapshot(buildTodaySnapshot({
      user,
      today,
      now: new Date(),
      meals,
      workoutLogs: logs,
      workoutProgram,
      journalEntries: journals,
      transactions: txns,
      activities: acts,
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
      activities: acts,
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
      activities: acts,
      books,
    }));

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(), [load]);
  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(refresh);

  const todayKey = localToday();
  const prefs = useMemo(
    () => normalizeNotificationPrefs(user?.notification_prefs || nudgeState.localPrefs),
    [user?.notification_prefs, nudgeState.localPrefs]
  );

  const widgets = useMemo(
    () => buildGlanceWidgets({ snapshot, weightLogs, activities, today: todayKey }),
    [snapshot, weightLogs, activities, todayKey]
  );

  const primaryNudge = useMemo(() => {
    const nudges = evaluateSmartNudges({
      snapshot,
      weightLogs,
      today: todayKey,
      now: new Date(),
      prefs,
    });
    const pick = pickPrimaryNudge(nudges);
    return shouldShowInAppNudge(pick, { today: todayKey, dismissed: nudgeState.dismissed }) ? pick : null;
  }, [snapshot, weightLogs, todayKey, prefs, nudgeState.dismissed]);

  useEffect(() => {
    if (loading || !primaryNudge) return;
    const cap = detectNotificationCapability();
    if (cap.permission !== "granted") return;
    if (!shouldFireLocalHook(primaryNudge, { today: todayKey, lastFired: nudgeState.lastFired })) return;
    showBrowserNotification({
      id: primaryNudge.id,
      title: primaryNudge.title,
      body: primaryNudge.body,
    });
    setNudgeState(s => ({ ...s, lastFired: markNudgeFired(primaryNudge.id, todayKey) }));
  }, [loading, primaryNudge?.id, primaryNudge?.title, primaryNudge?.body, todayKey, nudgeState.lastFired]);

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
        <SmartBanner
          nudge={primaryNudge}
          onDismiss={() => {
            if (!primaryNudge) return;
            setNudgeState(s => ({ ...s, dismissed: dismissNudge(primaryNudge.id, todayKey) }));
          }}
        />
        <GlanceWidgets widgets={widgets} />
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
