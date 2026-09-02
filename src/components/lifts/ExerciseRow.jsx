import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  CARDIO_TYPES,
  displayLoggedNumber,
  parseOptionalNumber,
  parseDurationMinutes,
  formatDurationMinutes,
  parseCardioType,
} from "@/lib/workoutLog";

function getLog(logsArr, exerciseName, setNum) {
  return logsArr?.find(l => l.exercise === exerciseName && l.set_number === setNum);
}

function emptyToNull(n) {
  return n == null ? null : n;
}

async function awardSessionActivity(isCardio) {
  const today = format(new Date(), "yyyy-MM-dd");
  const category = isCardio ? "cardio" : "lifting";
  const existing = await base44.entities.Activity.filter({ date: today, category });
  if (existing.length === 0) {
    await base44.entities.Activity.create({
      pillar: "lifts",
      category,
      title: isCardio ? "Cardio session" : "Lifting session",
      points: isCardio ? 3 : 4,
      date: today,
    });
  }
}

function isCurrentWeekStart(weekStart) {
  return weekStart === format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function ExerciseRow({ exercise, sets, weekStart, prevLogs, currentLogs, onSaved }) {
  if (exercise.isCardio) {
    return (
      <CardioRow
        exercise={exercise}
        weekStart={weekStart}
        currentLogs={currentLogs}
        prevLogs={prevLogs}
        onSaved={onSaved}
      />
    );
  }

  const numSets = sets || 3;

  const [setData, setSetData] = useState(() =>
    Array.from({ length: numSets }, (_, i) => {
      const existing = getLog(currentLogs, exercise.name, i + 1);
      return {
        weight: displayLoggedNumber(existing?.weight),
        reps: displayLoggedNumber(existing?.reps),
        id: existing?.id || null,
      };
    })
  );

  useEffect(() => {
    setSetData(
      Array.from({ length: numSets }, (_, i) => {
        const existing = getLog(currentLogs, exercise.name, i + 1);
        return {
          weight: displayLoggedNumber(existing?.weight),
          reps: displayLoggedNumber(existing?.reps),
          id: existing?.id || null,
        };
      })
    );
  }, [currentLogs, exercise.name, numSets]);

  const updateField = (setIndex, field, val) => {
    setSetData(prev => {
      const next = [...prev];
      next[setIndex] = { ...next[setIndex], [field]: val };
      return next;
    });
  };

  const handleSave = async (setIndex) => {
    const d = setData[setIndex];
    const weight = parseOptionalNumber(d.weight);
    const reps = parseOptionalNumber(d.reps);

    try {
      if (weight == null && reps == null) {
        if (d.id) {
          await base44.entities.WorkoutLog.delete(d.id);
          setSetData(prev => {
            const next = [...prev];
            next[setIndex] = { ...next[setIndex], id: null };
            return next;
          });
          onSaved?.();
        }
        return;
      }

      const payload = {
        week_start: weekStart,
        day: exercise._day,
        exercise: exercise.name,
        set_number: setIndex + 1,
        is_amrap: exercise.isAmrap || false,
        weight: emptyToNull(weight),
        reps: emptyToNull(reps),
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

      if (isCurrentWeekStart(weekStart)) {
        await awardSessionActivity(false);
      }
      onSaved?.();
    } catch {
      // keep the typed values; retry on next blur
    }
  };

  const repsPlaceholder = exercise.isAmrap
    ? "AMRAP"
    : exercise.reps
      ? String(exercise.reps)
      : "reps";

  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-[14px] font-semibold text-ink mb-2">{exercise.name}</p>
      <div className="grid grid-cols-[28px_1fr_1fr_auto] gap-x-2 gap-y-1.5 items-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Set</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Lbs</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Reps</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint text-right min-w-[52px]">Last</span>
        {Array.from({ length: numSets }, (_, i) => {
          const prev = getLog(prevLogs, exercise.name, i + 1);
          const lastW = prev?.weight > 0 ? prev.weight : null;
          return (
            <SetLine
              key={i}
              index={i}
              weight={setData[i]?.weight ?? ""}
              reps={setData[i]?.reps ?? ""}
              repsPlaceholder={repsPlaceholder}
              lastWeight={lastW}
              onWeight={val => updateField(i, "weight", val)}
              onReps={val => updateField(i, "reps", val)}
              onSave={() => handleSave(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SetLine({ index, weight, reps, repsPlaceholder, lastWeight, onWeight, onReps, onSave }) {
  return (
    <>
      <span className="font-mono text-[13px] text-caption tabular-nums">{index + 1}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="lbs"
        value={weight}
        onChange={e => onWeight(e.target.value)}
        onBlur={onSave}
        className="h-10 text-[13px] bg-secondary border-0 font-mono px-2"
      />
      <Input
        type="text"
        inputMode="decimal"
        placeholder={repsPlaceholder}
        value={reps}
        onChange={e => onReps(e.target.value)}
        onBlur={onSave}
        className="h-10 text-[13px] bg-secondary border-0 font-mono px-2"
      />
      <span className="font-mono text-[11px] text-caption text-right min-w-[52px] tabular-nums">
        {lastWeight != null ? lastWeight : "—"}
      </span>
    </>
  );
}

function CardioRow({ exercise, weekStart, currentLogs, prevLogs, onSaved }) {
  const existing = getLog(currentLogs, exercise.name, 1) || currentLogs?.find(l => l.exercise === exercise.name);
  const prev = getLog(prevLogs, exercise.name, 1) || prevLogs?.find(l => l.exercise === exercise.name);

  const [type, setType] = useState(() => parseCardioType(existing?.notes) || "");
  const [duration, setDuration] = useState(() => formatDurationMinutes(existing?.reps) || displayLoggedNumber(existing?.reps));
  const [distance, setDistance] = useState(() => displayLoggedNumber(existing?.weight));
  const [id, setId] = useState(existing?.id || null);

  useEffect(() => {
    const log = getLog(currentLogs, exercise.name, 1) || currentLogs?.find(l => l.exercise === exercise.name);
    setType(parseCardioType(log?.notes) || "");
    setDuration(formatDurationMinutes(log?.reps) || displayLoggedNumber(log?.reps));
    setDistance(displayLoggedNumber(log?.weight));
    setId(log?.id || null);
  }, [currentLogs, exercise.name]);

  const handleSave = async (overrides = {}) => {
    const nextType = overrides.type !== undefined ? overrides.type : type;
    const nextDuration = overrides.duration !== undefined ? overrides.duration : duration;
    const nextDistance = overrides.distance !== undefined ? overrides.distance : distance;
    const minutes = parseDurationMinutes(nextDuration);
    const miles = parseOptionalNumber(nextDistance);
    const cardioType = nextType || "";

    try {
      if (minutes == null && miles == null && !cardioType) {
        if (id) {
          await base44.entities.WorkoutLog.delete(id);
          setId(null);
          onSaved?.();
        }
        return;
      }

      const payload = {
        week_start: weekStart,
        day: exercise._day,
        exercise: exercise.name,
        set_number: 1,
        is_amrap: false,
        reps: emptyToNull(minutes),
        weight: emptyToNull(miles),
        notes: cardioType || "other",
      };

      if (id) {
        await base44.entities.WorkoutLog.update(id, payload);
      } else {
        const created = await base44.entities.WorkoutLog.create(payload);
        setId(created.id);
      }

      if (isCurrentWeekStart(weekStart)) {
        await awardSessionActivity(true);
      }
      onSaved?.();
    } catch {
      // keep the typed values; retry on next blur
    }
  };

  const lastBits = [];
  const prevType = parseCardioType(prev?.notes);
  if (prevType) lastBits.push(CARDIO_TYPES.find(t => t.id === prevType)?.label || prevType);
  const prevTime = formatDurationMinutes(prev?.reps);
  if (prevTime) lastBits.push(`${prevTime} min`);
  const prevDist = displayLoggedNumber(prev?.weight);
  if (prevDist) lastBits.push(`${prevDist} mi`);

  return (
    <div className="py-3 border-b border-border last:border-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink">{exercise.name}</p>
        {lastBits.length > 0 && (
          <span className="font-mono text-[11px] text-caption">last: {lastBits.join(" · ")}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CARDIO_TYPES.map(t => {
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id);
                handleSave({ type: t.id });
              }}
              className={`px-3 py-2 rounded-full border text-[13px] font-semibold min-h-[40px] min-w-0 ${
                active ? "border-clay text-ink bg-card" : "border-border text-caption bg-card"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1.5 block">Time</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="min"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            onBlur={handleSave}
            className="h-10 text-[13px] bg-secondary border-0 font-mono px-2"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1.5 block">Distance</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="mi"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            onBlur={handleSave}
            className="h-10 text-[13px] bg-secondary border-0 font-mono px-2"
          />
        </div>
      </div>
    </div>
  );
}
