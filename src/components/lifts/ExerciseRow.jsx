import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ExerciseRow({ exercise, sets, weekStart, prevLogs, currentLogs, onSaved }) {
  // currentLogs and prevLogs are arrays of WorkoutLog for this exercise
  const numSets = sets;

  const getLog = (logsArr, setNum) =>
    logsArr?.find(l => l.exercise === exercise.name && l.set_number === setNum);

  const [setData, setSetData] = useState(() =>
    Array.from({ length: numSets }, (_, i) => {
      const existing = getLog(currentLogs, i + 1);
      return {
        weight: existing?.weight != null ? String(existing.weight) : "",
        reps: existing?.reps != null ? String(existing.reps) : "",
        id: existing?.id || null,
      };
    })
  );

  useEffect(() => {
    setSetData(
      Array.from({ length: numSets }, (_, i) => {
        const existing = getLog(currentLogs, i + 1);
        return {
          weight: existing?.weight != null ? String(existing.weight) : "",
          reps: existing?.reps != null ? String(existing.reps) : "",
          id: existing?.id || null,
        };
      })
    );
  }, [currentLogs, exercise.name]);

  const handleBlur = async (setIndex) => {
    const d = setData[setIndex];
    if (!d.weight && !d.reps) return;
    const payload = {
      week_start: weekStart,
      day: exercise._day,
      exercise: exercise.name,
      set_number: setIndex + 1,
      weight: d.weight ? parseFloat(d.weight) : 0,
      reps: d.reps ? parseInt(d.reps) : 0,
      is_amrap: exercise.isAmrap || false,
    };
    if (d.id) {
      await base44.entities.WorkoutLog.update(d.id, payload);
    } else {
      const created = await base44.entities.WorkoutLog.create(payload);
      setSetData(prev => {
        const next = [...prev];
        next[setIndex] = { ...next[setIndex], id: created.id };
        return next;
      });
    }
    onSaved?.();
  };

  const updateField = (setIndex, field, val) => {
    setSetData(prev => {
      const next = [...prev];
      next[setIndex] = { ...next[setIndex], [field]: val };
      return next;
    });
  };

  // Compare avg weight this week vs last
  const currentAvgWeight = currentLogs
    ?.filter(l => l.exercise === exercise.name && l.weight > 0)
    .reduce((s, l, _, arr) => s + l.weight / arr.length, 0) || 0;
  const prevAvgWeight = prevLogs
    ?.filter(l => l.exercise === exercise.name && l.weight > 0)
    .reduce((s, l, _, arr) => s + l.weight / arr.length, 0) || 0;

  const delta = currentAvgWeight > 0 && prevAvgWeight > 0
    ? currentAvgWeight - prevAvgWeight : null;

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{exercise.name}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            {exercise.isAmrap ? "AMRAP" : exercise.isCardio ? "60 min" : `${exercise.reps} reps`}
          </span>
        </div>
        {delta !== null && (
          <div className={`flex items-center gap-1 text-xs font-bold font-mono ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)} lbs vs last wk
          </div>
        )}
      </div>

      {!exercise.isCardio && (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numSets}, 1fr)` }}>
          {Array.from({ length: numSets }, (_, i) => {
            const prevSet = getLog(prevLogs, i + 1);
            return (
              <div key={i} className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground text-center">Set {i + 1}</p>
                <Input
                  type="number"
                  placeholder="lbs"
                  value={setData[i]?.weight || ""}
                  onChange={e => updateField(i, "weight", e.target.value)}
                  onBlur={() => handleBlur(i)}
                  className="h-8 text-xs text-center bg-secondary/50 border-border font-mono px-1"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="reps"
                  value={setData[i]?.reps || ""}
                  onChange={e => updateField(i, "reps", e.target.value.replace(/\D/g, ""))}
                  onBlur={() => handleBlur(i)}
                  className="h-8 text-xs text-center bg-secondary/50 border-border font-mono px-1"
                />
                {prevSet ? (
                  <p className="text-[9px] text-center text-muted-foreground font-mono">
                    {prevSet.weight > 0
                      ? `${prevSet.weight}×${prevSet.reps}`
                      : prevSet.reps > 0
                      ? `${prevSet.reps} reps`
                      : "— last wk"}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {exercise.isCardio && (
        <div className="space-y-1 max-w-[120px]">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Duration (min)</p>
          <Input
            type="number"
            placeholder="60"
            value={setData[0]?.reps || ""}
            onChange={e => updateField(0, "reps", e.target.value)}
            onBlur={() => handleBlur(0)}
            className="h-8 text-xs bg-secondary/50 border-border font-mono"
          />
        </div>
      )}

      {/* Previous week comparison */}
      {prevAvgWeight > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Last week: {prevAvgWeight.toFixed(1)} lbs avg
        </p>
      )}
    </div>
  );
}