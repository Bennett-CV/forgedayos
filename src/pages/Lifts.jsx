import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfWeek, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import ExerciseRow from "../components/lifts/ExerciseRow";
import ExerciseHistory from "../components/lifts/ExerciseHistory";
import ProgramSetup from "../components/lifts/ProgramSetup";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";

function dayFocus(prog) {
  if (!prog) return "";
  const label = (prog.label || "").replace(/^day\s*\d+\s*/i, "").trim();
  if (label) return label;
  return prog.type === "cardio" ? "Cardio" : "Strength";
}

export default function Lifts() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [allLogs, setAllLogs] = useState([]);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get("view") === "history" ? "history" : "log");
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = Number(searchParams.get("day"));
    return d >= 1 && d <= 5 ? d : 1;
  });

  const weekStart = format(
    startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const prevWeekStart = format(
    startOfWeek(subWeeks(new Date(), weekOffset + 1), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const [logs, programDays] = await Promise.all([
        base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 2000),
        base44.entities.WorkoutProgram.filter({ created_by: user.email }, "day", 10),
      ]);
      setAllLogs(logs);
      const myDays = programDays.filter(d => d.created_by === user.email);
      setProgram(myDays.length > 0 ? myDays : null);
    } catch {
      // best-effort
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("view") === "log" || searchParams.get("log")) {
      setView("log");
    }
    const d = Number(searchParams.get("day"));
    if (d >= 1 && d <= 5) setSelectedDay(d);
  }, [searchParams]);

  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(load);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return <ProgramSetup onComplete={load} />;
  }

  const programByDay = {};
  program.forEach(d => { programByDay[d.day] = d; });

  const currentWeekLogs = allLogs.filter(l => l.week_start === weekStart);
  const prevWeekLogs = allLogs.filter(l => l.week_start === prevWeekStart);
  const dayProgram = programByDay[selectedDay];

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="page-title">Lifts</h1>
          <div className="seg-track w-[160px] shrink-0">
            <button
              onClick={() => setView("log")}
              className={`seg-item ${view === "log" ? "seg-item-active" : ""}`}
            >
              Log
            </button>
            <button
              onClick={() => setView("history")}
              className={`seg-item ${view === "history" ? "seg-item-active" : ""}`}
            >
              History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map(day => {
            const prog = programByDay[day];
            if (!prog) return null;
            const active = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-[4px] border bg-card py-2.5 px-1 text-center min-h-[56px] ${
                  active ? "border-clay" : "border-border"
                }`}
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-faint">Day {day}</p>
                <p className={`text-[12px] font-semibold mt-0.5 truncate ${active ? "text-clay" : "text-ink"}`}>
                  {dayFocus(prog)}
                </p>
              </button>
            );
          })}
        </div>

        {view === "log" && dayProgram && (
          <>
            <div className="flex items-center justify-between editorial-card px-3 py-2">
              <button onClick={() => setWeekOffset(o => o + 1)} className="text-[13px] font-semibold text-caption min-w-[44px]">
                Prev
              </button>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-ink">
                  Week of {format(startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), "MMM d")}
                </p>
                <p className="text-[11px] text-caption">
                  {currentWeekLogs.filter(l => l.day === selectedDay).length} sets
                </p>
              </div>
              <button
                onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
                disabled={weekOffset === 0}
                className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
              >
                Next
              </button>
            </div>

            <motion.div
              key={`log-${selectedDay}-${weekOffset}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="editorial-card p-4"
            >
              <h2 className="text-[15px] font-semibold text-ink">
                {dayFocus(dayProgram)} — {dayProgram.type === "cardio" ? "Cardio" : "Strength"}
              </h2>
              <p className="text-[12px] text-caption mt-1 mb-4">
                {dayProgram.type === "cardio"
                  ? "Type, time, and distance."
                  : "Weight (lbs) and reps for each set."}
              </p>
              <div>
                {(dayProgram.exercises || []).map(exercise => (
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

        {view === "history" && dayProgram && (
          <motion.div
            key={`history-${selectedDay}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="editorial-card p-4"
          >
            <h2 className="text-[15px] font-semibold text-ink mb-1">{dayFocus(dayProgram)} — History</h2>
            <p className="text-[12px] text-caption mb-4">
              {dayProgram.type === "cardio"
                ? "Duration over time · last 8 weeks in the table."
                : "Best set over time · last 8 weeks in the table."}
            </p>
            <div>
              {(dayProgram.exercises || []).map(exercise => {
                const cardio = exercise.isCardio || dayProgram.type === "cardio";
                return (
                  <ExerciseHistory
                    key={exercise.name}
                    exercise={{ ...exercise, isCardio: cardio, _day: selectedDay }}
                    allLogs={allLogs.filter(l => l.day === selectedDay)}
                    variant={cardio ? "cardio" : "strength"}
                  />
                );
              })}
              {allLogs.filter(l => l.day === selectedDay).length === 0 && (
                <p className="text-sm text-caption text-center py-8">No history for Day {selectedDay} yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
