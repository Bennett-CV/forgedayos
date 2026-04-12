import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CompoundingScore from "../components/dashboard/CompoundingScore";
import PillarCard from "../components/dashboard/PillarCard";
import MomentumChart from "../components/dashboard/MomentumChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import ActiveProjects from "../components/dashboard/ActiveProjects";
import { PILLAR_KEYS } from "../lib/constants";

export default function Dashboard() {
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [acts, projs] = await Promise.all([
        base44.entities.Activity.list("-created_date", 500),
        base44.entities.Project.list("-created_date", 50),
      ]);
      setActivities(acts);
      setProjects(projs);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <Link to="/log">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log Activity</span>
          </Button>
        </Link>
      </div>

      {/* Compounding Score + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompoundingScore activities={activities} />
        <MomentumChart activities={activities} />
      </div>

      {/* 5 Pillars */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">The 5 Pillars</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {PILLAR_KEYS.map((pillar, i) => (
            <PillarCard key={pillar} pillar={pillar} activities={activities} index={i} />
          ))}
        </div>
      </div>

      {/* Recent + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivity activities={activities} />
        <ActiveProjects projects={projects} />
      </div>
    </div>
  );
}