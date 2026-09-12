import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfWeek } from "date-fns";
import { useLifeData } from "@/hooks/useLifeData";
import TodayOverview from "@/components/dashboard/TodayOverview";
import { Link } from "react-router-dom";
import { formatLocalDate } from "@/lib/localDate";
import { greetingFirstName, greetingForHour } from "@/lib/greetingName";
import CompoundingScore from "../components/dashboard/CompoundingScore";
import PillarCard from "../components/dashboard/PillarCard";
import MomentumChart from "../components/dashboard/MomentumChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import ActiveProjects from "../components/dashboard/ActiveProjects";
import WealthSnapshot from "../components/dashboard/WealthSnapshot";
import GoalProgress from "../components/dashboard/GoalProgress";
import { PILLAR_KEYS } from "../lib/constants";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import EmptyStateDashboard from "../components/dashboard/EmptyStateDashboard";
import { CaptureCTA } from "../components/capture/CaptureChooser";

export default function Dashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const dateKey = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const life = useLifeData(user?.email, weekStart, dateKey);

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const [acts, projs] = await Promise.all([
        base44.entities.Activity.filter({ created_by: user.email }, "-created_date", 500),
        base44.entities.Project.filter({ created_by: user.email }, "-created_date", 50),
      ]);
      setActivities(acts);
      setProjects(projs);
    } catch {
      // Best-effort: show empty state rather than error on launch
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load, user]);

  const refresh = useCallback(() => Promise.all([load(), life.refresh()]), [load, life.refresh]);
  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(refresh);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const today = formatLocalDate(new Date(), "EEEE, MMMM d");
  const isEmpty = activities.length === 0;
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

        <TodayOverview user={user} data={life.data} errors={life.errors} loading={life.loading} today={dateKey} weekStart={weekStart} onRetry={life.refresh} />
        <Link to="/review" className="editorial-card p-4 flex items-center justify-between gap-3">
          <div><p className="micro-label">Your weekly ritual</p><p className="font-serif text-[20px] text-ink mt-1">See what’s adding up.</p></div>
          <span className="text-clay text-sm font-semibold">Review →</span>
        </Link>
        {isEmpty ? (
          <EmptyStateDashboard user={user} />
        ) : (
          <>
            <CompoundingScore activities={activities} />
            <MomentumChart activities={activities} />

            <div>
              <p className="micro-label mb-3">The 5 Pillars</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PILLAR_KEYS.map((pillar, i) => (
                  <PillarCard key={pillar} pillar={pillar} activities={activities} index={i} />
                ))}
              </div>
            </div>

            <CaptureCTA label="+ Log" />

            <RecentActivity activities={activities} />
            <ActiveProjects projects={projects} />
            <GoalProgress activities={activities} />
            <WealthSnapshot />
          </>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { to: "/review", label: "Review" },
            { to: "/projects", label: "Projects" },
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
