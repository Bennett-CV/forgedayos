import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Dumbbell, Activity, History, ClipboardList } from "lucide-react";
import { WORKOUT_PROGRAM } from "../lib/workoutProgram";
import ExerciseRow from "../components/lifts/ExerciseRow";
import ExerciseHistory from "../components/lifts/ExerciseHistory";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";

export default function Lifts() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [view, setView] = useState("log");

  const weekStart = format(
    startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const prevWeekStart = format(
    startOfWeek(subWeeks(new Date(), weekOffset + 1), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const load = useCallback(async () => {
    const logs = await base44.entities.WorkoutLog.list("-created_date", 2000);
    setAllLogs(logs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(load);

  const currentWeekLogs = allLogs.filter(l => l.week_start === weekStart);
  const prevWeekLogs = allLogs.filter(l => l.week_start === prevWeekStart);
  const dayProgram = WORKOUT_PROGRAM[selectedDay];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Lifts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allLogs.length > 0
                ? `${[...new Set(allLogs.map(l => l.week_start))].length} weeks of history`
                : "Track week-over-week progress"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
            <button
              onClick={() => setView("log")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${view === "log" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Log
            </button>
            <button
              onClick={() => setView("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${view === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
          </div>
        </div>

        {/* Day Tabs */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(day => {
            const prog = WORKOUT_PROGRAM[day];
            const isCardio = prog.type === "cardio";
            const hasData = allLogs.some(l => l.day === day);
            const active = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl border p-3 text-center transition-all min-h-[44px] ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary/50 text-muted-foreground"
                }`}
              >
                <div className="flex justify-center mb-1">
                  {isCardio
                    ? <Activity className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    : <Dumbbell className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  }
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Day {day}</p>
                {hasData && <div className="h-1 w-1 rounded-full bg-success mx-auto mt-1" />}
              </button>
            );
          })}
        </div>

        {/* LOG VIEW */}
        {view === "log" && (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors min-h-[44px] min-w-[44px]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold">Week of {format(startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), "MMM d, yyyy")}</p>
                <p className="text-xs text-muted-foreground">{currentWeekLogs.filter(l => l.day === selectedDay).length} sets logged this day</p>
              </div>
              <button
                onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
                disabled={weekOffset === 0}
                className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <motion.div
              key={`log-${selectedDay}-${weekOffset}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 mb-1">
                {dayProgram.type === "cardio"
                  ? <Activity className="h-5 w-5 text-chart-3" />
                  : <Dumbbell className="h-5 w-5 text-primary" />
                }
                <h2 className="text-base font-bold text-foreground">
                  {dayProgram.label} — {dayProgram.type === "cardio" ? "Cardio" : "Strength"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {dayProgram.type === "cardio" ? "Log your cardio duration below." : "Enter weight (lbs) and reps. Auto-saves on blur."}
              </p>
              <div>
                {dayProgram.exercises.map(exercise => (
                  <ExerciseRow
                    key={exercise.name}
                    exercise={{ ...exercise, _day: selectedDay }}
                    sets={exercise.sets}
                    weekStart={weekStart}
                    currentLogs={currentWeekLogs}
                    prevLogs={prevWeekLogs}
                    onSaved={load}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <motion.div
            key={`history-${selectedDay}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">{dayProgram.label} — Full History</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              All-time weight tracking. Shows avg lbs per set and week-over-week delta (Δ).
            </p>
            <div>
              {dayProgram.exercises
                .filter(e => !e.isCardio)
                .map(exercise => (
                  <ExerciseHistory
                    key={exercise.name}
                    exercise={{ ...exercise, _day: selectedDay }}
                    allLogs={allLogs.filter(l => l.day === selectedDay)}
                  />
                ))}
              {dayProgram.type === "cardio" && (
                <ExerciseHistory
                  exercise={{ name: "Cardio", sets: 1, _day: selectedDay }}
                  allLogs={allLogs.filter(l => l.day === selectedDay)}
                />
              )}
              {allLogs.filter(l => l.day === selectedDay).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No history logged for Day {selectedDay} yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}