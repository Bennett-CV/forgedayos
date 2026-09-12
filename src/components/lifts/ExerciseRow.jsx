import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { localToday, localWeekStartKey } from "@/lib/localDate";
import { Input } from "@/components/ui/input";
import {
  CARDIO_TYPES,
  displayLoggedNumber,
  parseOptionalNumber,
  parseDurationMinutes,
  formatDurationMinutes,
  parseCardioType,
} from "@/lib/workoutLog";
import {
  lastSessionSets,
  formatLastSessionLine,
  mergeLastIntoSets,
} from "@/lib/workoutSession";

function getLog(logsArr, exerciseName, setNum) {
  return logsArr?.find(l => l.exercise === exerciseName && l.set_number === setNum);
}

function emptyToNull(n) {
  return n == null ? null : n;
}

async function awardSessionActivity(isCardio) {
  const today = localToday();
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
  return weekStart === localWeekStartKey(new Date());
}

function initialSets(numSets, currentLogs, exerciseName) {
  return Array.from({ length: numSets }, (_, i) => {
    const existing = getLog(currentLogs, exerciseName, i + 1);
    return {
      weight: displayLoggedNumber(existing?.weight),
      reps: displayLoggedNumber(existing?.reps),
      id: existing?.id || null,
    };
  });
}

export default function ExerciseRow({
  exercise,
  sets,
  weekStart,
  currentLogs,
  historyLogs,
  prevLogs,
  loadToken = 0,
  onSaved,
}) {
  if (exercise.isCardio) {
    return (
      <CardioRow
        exercise={exercise}
        weekStart={weekStart}
        currentLogs={currentLogs}
        historyLogs={historyLogs || prevLogs}
        loadToken={loadToken}
        onSaved={onSaved}
      />
    );
  }

  return (
    <StrengthRow
      exercise={exercise}
      sets={sets}
      weekStart={weekStart}
      currentLogs={currentLogs}
      historyLogs={historyLogs || prevLogs}
      loadToken={loadToken}
      onSaved={onSaved}
    />
  );
}

function StrengthRow({ exercise, sets, weekStart, currentLogs, historyLogs, loadToken, onSaved }) {
  const numSets = sets || 3;
  const lastSets = lastSessionSets(historyLogs, exercise.name, { excludeWeek: weekStart });
  const lastLine = formatLastSessionLine(lastSets);

  const [setData, setSetData] = useState(() => initialSets(numSets, currentLogs, exercise.name));
  const [savingIndex, setSavingIndex] = useState(null);

  useEffect(() => {
    setSetData(initialSets(numSets, currentLogs, exercise.name));
  }, [currentLogs, exercise.name, numSets]);

  useEffect(() => {
    if (!loadToken) return;
    setSetData(prev => mergeLastIntoSets(prev, lastSets));
  }, [loadToken]);

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
    setSavingIndex(setIndex);

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
          next[setIndex] = { ...next[setIndex], id: created.id, loaded: false };
          return next;
        });
      }

      if (isCurrentWeekStart(weekStart)) {
        await awardSessionActivity(false);
      }
      onSaved?.();
    } catch {
      // keep the typed values; retry on next save
    } finally {
      setSavingIndex(null);
    }
  };

  const loadLast = () => {
    setSetData(prev => mergeLastIntoSets(prev, lastSets));
  };

  const canLoad = lastSets.length > 0 && setData.some(s => !s.id && !String(s.weight || "").trim() && !String(s.reps || "").trim());
  const repsPlaceholder = exercise.isAmrap
    ? "AMRAP"
    : exercise.reps
      ? String(exercise.reps)
      : "reps";

  return (
    <div className="py-4 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{exercise.name}</p>
          {lastLine ? (
            <p className="text-[11px] text-caption mt-0.5">Last {lastLine}</p>
          ) : (
            <p className="text-[11px] text-caption mt-0.5">No last session yet</p>
          )}
        </div>
        {canLoad && (
          <button
            type="button"
            onClick={loadLast}
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-clay min-h-[36px] shrink-0"
          >
            Load last
          </button>
        )}
      </div>

      <div className="space-y-2">
        {Array.from({ length: numSets }, (_, i) => {
          const last = lastSets[i];
          const saved = Boolean(setData[i]?.id);
          return (
            <SetLine
              key={i}
              index={i}
              weight={setData[i]?.weight ?? ""}
              reps={setData[i]?.reps ?? ""}
              repsPlaceholder={last?.reps > 0 ? String(last.reps) : repsPlaceholder}
              weightPlaceholder={last?.weight > 0 ? String(last.weight) : "lbs"}
              saved={saved}
              saving={savingIndex === i}
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

function SetLine({
  index,
  weight,
  reps,
  repsPlaceholder,
  weightPlaceholder,
  saved,
  saving,
  onWeight,
  onReps,
  onSave,
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] text-caption tabular-nums w-5 shrink-0">{index + 1}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={weightPlaceholder}
        value={weight}
        onChange={e => onWeight(e.target.value)}
        onBlur={onSave}
        className="h-11 text-[15px] bg-secondary border-0 font-mono px-2 flex-1"
        aria-label={`Set ${index + 1} weight`}
      />
      <Input
        type="text"
        inputMode="decimal"
        placeholder={repsPlaceholder}
        value={reps}
        onChange={e => onReps(e.target.value)}
        onBlur={onSave}
        className="h-11 text-[15px] bg-secondary border-0 font-mono px-2 w-[72px]"
        aria-label={`Set ${index + 1} reps`}
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`h-11 w-11 rounded-[4px] border text-[12px] font-bold shrink-0 ${
          saved
            ? "border-clay bg-clay text-clay-fg"
            : "border-border bg-card text-caption"
        }`}
        aria-label={saved ? `Set ${index + 1} saved` : `Log set ${index + 1}`}
      >
        {saving ? "…" : saved ? "✓" : "Log"}
      </button>
    </div>
  );
}

function CardioRow({ exercise, weekStart, currentLogs, historyLogs, loadToken, onSaved }) {
  const existing = getLog(currentLogs, exercise.name, 1) || currentLogs?.find(l => l.exercise === exercise.name);
  const last = lastSessionSets(historyLogs, exercise.name, { excludeWeek: weekStart })[0]
    || getLog(historyLogs, exercise.name, 1)
    || historyLogs?.find(l => l.exercise === exercise.name && l.week_start !== weekStart);

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

  const applyLast = () => {
    if (id || duration || distance || type) return;
    if (!last) return;
    setType(parseCardioType(last.notes) || "");
    setDuration(formatDurationMinutes(last.reps) || displayLoggedNumber(last.reps));
    setDistance(displayLoggedNumber(last.weight));
  };

  useEffect(() => {
    if (!loadToken) return;
    applyLast();
  }, [loadToken]);

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
  const prevType = parseCardioType(last?.notes);
  if (prevType) lastBits.push(CARDIO_TYPES.find(t => t.id === prevType)?.label || prevType);
  const prevTime = formatDurationMinutes(last?.reps);
  if (prevTime) lastBits.push(`${prevTime} min`);
  const prevDist = displayLoggedNumber(last?.weight);
  if (prevDist) lastBits.push(`${prevDist} mi`);
  const canLoad = lastBits.length > 0 && !id && !duration && !distance && !type;

  return (
    <div className="py-4 border-b border-border last:border-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-ink">{exercise.name}</p>
          {lastBits.length > 0 && (
            <p className="text-[11px] text-caption mt-0.5">Last {lastBits.join(" · ")}</p>
          )}
        </div>
        {canLoad && (
          <button
            type="button"
            onClick={applyLast}
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-clay min-h-[36px]"
          >
            Load last
          </button>
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
            placeholder={prevTime || "min"}
            value={duration}
            onChange={e => setDuration(e.target.value)}
            onBlur={() => handleSave()}
            className="h-11 text-[15px] bg-secondary border-0 font-mono px-2"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1.5 block">Distance</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={prevDist || "mi"}
            value={distance}
            onChange={e => setDistance(e.target.value)}
            onBlur={() => handleSave()}
            className="h-11 text-[15px] bg-secondary border-0 font-mono px-2"
          />
        </div>
      </div>
    </div>
  );
}
