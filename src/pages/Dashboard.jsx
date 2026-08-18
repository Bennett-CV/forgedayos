import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

export default function Dashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.email) return;
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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM d");
  const isEmpty = activities.length === 0;

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
          </div>
          <Link to="/log">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold min-h-[44px]">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Log Activity</span>
            </Button>
          </Link>
        </div>

        {/* Empty state for new users */}
        {isEmpty ? (
          <EmptyStateDashboard user={user} />
        ) : (
          <>
            {/* Compounding Score + Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompoundingScore activities={activities} />
              <MomentumChart activities={activities} />
            </div>

            {/* 5 Pillars */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">The 5 Pillars</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PILLAR_KEYS.map((pillar, i) => (
                  <PillarCard key={pillar} pillar={pillar} activities={activities} index={i} />
                ))}
              </div>
            </div>

            {/* Recent + Projects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RecentActivity activities={activities} />
              <ActiveProjects projects={projects} />
            </div>

            {/* Goal Progress */}
            <GoalProgress activities={activities} />

            {/* Wealth Snapshot */}
            <WealthSnapshot />
          </>
        )}
      </div>
    </>
  );
}