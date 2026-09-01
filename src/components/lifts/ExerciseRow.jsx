import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek } from "date-fns";
import { Input } from "@/components/ui/input";

export default function ExerciseRow({ exercise, sets, weekStart, prevLogs, currentLogs, onSaved }) {
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
  const [dirty, setDirty] = useState(false);

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
    setDirty(false);
  }, [currentLogs, exercise.name]);

  const handleSave = (setIndex) => {
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
    const today = format(new Date(), "yyyy-MM-dd");
    const isCurrentWeek = weekStart === format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    const saveLog = d.id
      ? base44.entities.WorkoutLog.update(d.id, payload)
      : base44.entities.WorkoutLog.create(payload).then(created => {
          setSetData(prev => {
            const next = [...prev];
            next[setIndex] = { ...next[setIndex], id: created.id };
            return next;
          });
        });

    saveLog.then(async () => {
      if (isCurrentWeek) {
        const category = exercise.isCardio ? "cardio" : "lifting";
        const existing = await base44.entities.Activity.filter({ date: today, category });
        if (existing.length === 0) {
          await base44.entities.Activity.create({
            pillar: "lifts",
            category,
            title: exercise.isCardio ? "Cardio session" : "Lifting session",
            points: exercise.isCardio ? 3 : 4,
            date: today,
          });
        }
      }
      onSaved?.();
    });
  };

  const updateField = (setIndex, field, val) => {
    setDirty(true);
    setSetData(prev => {
      const next = [...prev];
      next[setIndex] = { ...next[setIndex], [field]: val };
      return next;
    });
  };

  const handleSaveAll = () => {
    Array.from({ length: numSets }, (_, i) => handleSave(i));
    setDirty(false);
  };

  const lastWeight = prevLogs
    ?.filter(l => l.exercise === exercise.name && l.weight > 0)
    .sort((a, b) => (b.set_number || 0) - (a.set_number || 0))[0]?.weight;

  const placeholder = exercise.isAmrap ? "AMRAP" : exercise.reps ? String(exercise.reps) : "lbs";

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-semibold text-ink">{exercise.name}</span>
        {lastWeight != null && (
          <span className="font-mono text-[11px] text-caption">last: {lastWeight} lbs</span>
        )}
      </div>

      {!exercise.isCardio && (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numSets}, 1fr)` }}>
          {Array.from({ length: numSets }, (_, i) => (
            <div key={i} className="space-y-1">
              <Input
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                value={setData[i]?.weight || ""}
                onChange={e => updateField(i, "weight", e.target.value)}
                onFocus={e => e.target.select()}
                onBlur={() => handleSave(i)}
                className="h-10 text-[13px] text-center bg-secondary border-0 font-mono px-1"
              />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="reps"
                value={setData[i]?.reps || ""}
                onChange={e => updateField(i, "reps", e.target.value.replace(/\D/g, ""))}
                onFocus={e => e.target.select()}
                onBlur={() => handleSave(i)}
                className="h-8 text-[11px] text-center bg-secondary border-0 font-mono px-1"
              />
            </div>
          ))}
        </div>
      )}

      {exercise.isCardio && (
        <Input
          type="text"
          inputMode="numeric"
          placeholder="min"
          value={setData[0]?.reps || ""}
          onChange={e => updateField(0, "reps", e.target.value.replace(/\D/g, ""))}
          onFocus={e => e.target.select()}
          onBlur={() => handleSave(0)}
          className="h-10 max-w-[120px] text-center bg-secondary border-0 font-mono"
        />
      )}

      {dirty && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={handleSaveAll}
          className="mt-2 text-[12px] font-semibold text-clay min-h-[36px]"
        >
          Save
        </button>
      )}
    </div>
  );
}
