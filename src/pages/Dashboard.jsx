import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Link } from "react-router-dom";
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

function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(load);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM d");
  const isEmpty = activities.length === 0;
  const firstName = user?.full_name?.split(" ")[0] || "there";
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
