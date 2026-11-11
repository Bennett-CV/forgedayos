import { useState, useEffect, useRef } from "react";
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
  parseCardioNoteText,
  encodeCardioNotes,
} from "@/lib/workoutLog";
import { requestTrainingSheetSync } from "@/lib/requestTrainingSheetSync";
import {
  lastSessionSets,
  formatLastSessionLine,
  mergeLastIntoSets,
  serverSetsFromLogs,
  mergeServerIntoSets,
  setRowsEqual,
  isPendingSet,
  isUntouchedPrefill,
  mergeCardioDraft,
  cardioDraftEqual,
  emptyCardioTouched,
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

function withPerformedDate(payload, isCreate, weekStart) {
  if (!isCreate || !isCurrentWeekStart(weekStart)) return payload;
  return { ...payload, date: localToday() };
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
  const prefillFrom = isCurrentWeekStart(weekStart) ? lastSets : [];
  const prefillKey = prefillFrom
    .map(l => `${l.set_number}|${l.weight}|${l.reps}`)
    .join(";");

  const [setData, setSetData] = useState(() =>
    mergeServerIntoSets([], serverSetsFromLogs(numSets, currentLogs, exercise.name), prefillFrom)
  );
  const [savingIndex, setSavingIndex] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const setDataRef = useRef(setData);
  setDataRef.current = setData;
  const prefillRef = useRef(prefillFrom);
  prefillRef.current = prefillFrom;
  const lastSetsRef = useRef(lastSets);
  lastSetsRef.current = lastSets;
  const inFlight = useRef(new Set());

  useEffect(() => {
    const serverSets = serverSetsFromLogs(numSets, currentLogs, exercise.name);
    setSetData(prev => {
      const next = mergeServerIntoSets(prev, serverSets, prefillRef.current);
      if (setRowsEqual(prev, next)) return prev;
      setDataRef.current = next;
      return next;
    });
  }, [currentLogs, exercise.name, numSets, prefillKey]);

  useEffect(() => {
    if (!loadToken) return;
    setSetData(prev => {
      const next = mergeLastIntoSets(prev, lastSetsRef.current);
      if (setRowsEqual(prev, next)) return prev;
      setDataRef.current = next;
      return next;
    });
  }, [loadToken]);

  const updateField = (setIndex, field, val) => {
    const touchedKey = field === "weight" ? "weightTouched" : "repsTouched";
    const prefilledKey = field === "weight" ? "weightPrefilled" : "repsPrefilled";
    setSetData(prev => {
      const next = [...prev];
      next[setIndex] = {
        ...next[setIndex],
        [field]: val,
        [touchedKey]: true,
        [prefilledKey]: false,
      };
      setDataRef.current = next;
      return next;
    });
  };

  const persistSet = async (setIndex, { commitPrefill }) => {
    const d = setDataRef.current[setIndex];
    if (!d) return false;
    if (!commitPrefill && isUntouchedPrefill(d)) return false;
    if (inFlight.current.has(setIndex)) return false;
    inFlight.current.add(setIndex);

    const weight = parseOptionalNumber(d.weight);
    const reps = parseOptionalNumber(d.reps);

    try {
      if (weight == null && reps == null) {
        if (!d.id) return false;
        await base44.entities.WorkoutLog.delete(d.id);
        setSetData(prev => {
          const next = [...prev];
          next[setIndex] = { ...next[setIndex], id: null };
          setDataRef.current = next;
          return next;
        });
        requestTrainingSheetSync();
        return true;
      }

      const payload = withPerformedDate({
        week_start: weekStart,
        day: exercise._day,
        exercise: exercise.name,
        set_number: setIndex + 1,
        is_amrap: exercise.isAmrap || false,
        weight: emptyToNull(weight),
        reps: emptyToNull(reps),
      }, !d.id, weekStart);

      let newId = d.id;
      if (d.id) {
        await base44.entities.WorkoutLog.update(d.id, payload);
      } else {
        const created = await base44.entities.WorkoutLog.create(payload);
        newId = created.id;
      }

      setSetData(prev => {
        const cur = prev[setIndex] || d;
        const same = cur.weight === d.weight && cur.reps === d.reps;
        const next = [...prev];
        next[setIndex] = {
          ...cur,
          id: newId,
          weightTouched: same ? false : cur.weightTouched,
          repsTouched: same ? false : cur.repsTouched,
          weightPrefilled: same ? false : cur.weightPrefilled,
          repsPrefilled: same ? false : cur.repsPrefilled,
        };
        setDataRef.current = next;
        return next;
      });

      if (isCurrentWeekStart(weekStart)) {
        await awardSessionActivity(false);
      }
      requestTrainingSheetSync();
      return true;
    } catch {
      return false;
    } finally {
      inFlight.current.delete(setIndex);
    }
  };

  const handleSave = async (setIndex, { commitPrefill }) => {
    const row = setDataRef.current[setIndex];
    if (!row) return;
    if (!commitPrefill && isUntouchedPrefill(row)) return;
    if (inFlight.current.has(setIndex)) return;
    const weight = parseOptionalNumber(row.weight);
    const reps = parseOptionalNumber(row.reps);
    if (weight == null && reps == null && !row.id) return;
    setSavingIndex(setIndex);
    try {
      const changed = await persistSet(setIndex, { commitPrefill });
      if (changed) onSaved?.();
    } finally {
      setSavingIndex(current => (current === setIndex ? null : current));
    }
  };

  const logAll = async () => {
    const indexes = setDataRef.current
      .map((row, i) => (isPendingSet(row) ? i : -1))
      .filter(i => i >= 0);
    if (!indexes.length) return;
    setSavingAll(true);
    let any = false;
    try {
      for (const i of indexes) {
        const changed = await persistSet(i, { commitPrefill: true });
        if (changed) any = true;
      }
    } finally {
      setSavingAll(false);
    }
    if (any) onSaved?.();
  };

  const loadLast = () => {
    setSetData(prev => {
      const next = mergeLastIntoSets(prev, lastSets);
      setDataRef.current = next;
      return next;
    });
  };

  const canLoad = lastSets.length > 0 && setData.some(s => !s.id && !String(s.weight || "").trim() && !String(s.reps || "").trim());
  const hasPrefill = setData.some(s => s?.weightPrefilled || s?.repsPrefilled);
  const pending = setData.some(isPendingSet);
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
            <p className="text-[11px] text-caption mt-0.5">
              Last {lastLine}{hasPrefill ? " · filled in, not saved" : ""}
            </p>
          ) : (
            <p className="text-[11px] text-caption mt-0.5">No last session yet</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 shrink-0">
          {canLoad && (
            <button
              type="button"
              onClick={loadLast}
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-clay min-h-[36px] shrink-0"
            >
              Load last
            </button>
          )}
          {pending && (
            <button
              type="button"
              onClick={logAll}
              disabled={savingAll || savingIndex != null}
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-clay min-h-[36px] shrink-0 disabled:opacity-40"
            >
              {savingAll ? "Saving…" : "Log all"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: numSets }, (_, i) => {
          const last = lastSets.find(l => Number(l.set_number) === i + 1);
          const saved = Boolean(setData[i]?.id);
          return (
            <SetLine
              key={i}
              index={i}
              weight={setData[i]?.weight ?? ""}
              reps={setData[i]?.reps ?? ""}
              weightPrefilled={Boolean(setData[i]?.weightPrefilled)}
              repsPrefilled={Boolean(setData[i]?.repsPrefilled)}
              repsPlaceholder={last?.reps > 0 ? String(last.reps) : repsPlaceholder}
              weightPlaceholder={last?.weight > 0 ? String(last.weight) : "lbs"}
              saved={saved}
              saving={savingIndex === i}
              busy={savingAll}
              onWeight={val => updateField(i, "weight", val)}
              onReps={val => updateField(i, "reps", val)}
              onBlur={() => handleSave(i, { commitPrefill: false })}
              onSave={() => handleSave(i, { commitPrefill: true })}
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
  weightPrefilled,
  repsPrefilled,
  repsPlaceholder,
  weightPlaceholder,
  saved,
  saving,
  busy,
  onWeight,
  onReps,
  onBlur,
  onSave,
}) {
  const fieldClass = (prefilled, width) =>
    `h-11 text-[15px] bg-secondary border-0 font-mono px-2 ${width} ${prefilled ? "text-caption" : "text-ink"}`;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] text-caption tabular-nums w-5 shrink-0">{index + 1}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={weightPlaceholder}
        value={weight}
        onChange={e => onWeight(e.target.value)}
        onBlur={onBlur}
        title={weightPrefilled ? "From last session, not logged yet" : undefined}
        className={fieldClass(weightPrefilled, "flex-1")}
        aria-label={`Set ${index + 1} weight`}
      />
      <Input
        type="text"
        inputMode="decimal"
        placeholder={repsPlaceholder}
        value={reps}
        onChange={e => onReps(e.target.value)}
        onBlur={onBlur}
        title={repsPrefilled ? "From last session, not logged yet" : undefined}
        className={fieldClass(repsPrefilled, "w-[72px]")}
        aria-label={`Set ${index + 1} reps`}
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving || busy}
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

function cardioFromLog(log) {
  return {
    type: parseCardioType(log?.notes) || "",
    note: parseCardioNoteText(log?.notes),
    duration: formatDurationMinutes(log?.reps) || displayLoggedNumber(log?.reps),
    distance: displayLoggedNumber(log?.weight),
    id: log?.id || null,
  };
}

function findCardioLog(logs, name) {
  return getLog(logs, name, 1) || logs?.find(l => l.exercise === name);
}

function CardioRow({ exercise, weekStart, currentLogs, historyLogs, loadToken, onSaved }) {
  const existing = findCardioLog(currentLogs, exercise.name);
  const last = lastSessionSets(historyLogs, exercise.name, { excludeWeek: weekStart })[0]
    || getLog(historyLogs, exercise.name, 1)
    || historyLogs?.find(l => l.exercise === exercise.name && l.week_start !== weekStart);

  const initial = cardioFromLog(existing);
  const [type, setType] = useState(initial.type);
  const [noteText, setNoteText] = useState(initial.note);
  const [duration, setDuration] = useState(initial.duration);
  const [distance, setDistance] = useState(initial.distance);
  const [id, setId] = useState(initial.id);
  const [touched, setTouched] = useState(() => emptyCardioTouched());
  const draftRef = useRef(null);
  draftRef.current = { type, note: noteText, duration, distance, id, touched };
  const lastRef = useRef(last);
  lastRef.current = last;

  const mark = (key) => {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  useEffect(() => {
    const incoming = cardioFromLog(findCardioLog(currentLogs, exercise.name));
    const merged = mergeCardioDraft(draftRef.current, incoming);
    if (cardioDraftEqual(draftRef.current, merged)) return;
    setType(merged.type);
    setNoteText(merged.note);
    setDuration(merged.duration);
    setDistance(merged.distance);
    setId(merged.id);
    setTouched(merged.touched);
  }, [currentLogs, exercise.name]);

  const applyLast = () => {
    const cur = draftRef.current;
    const prev = lastRef.current;
    if (cur.id || cur.duration || cur.distance || cur.type) return;
    if (!prev) return;
    setType(parseCardioType(prev.notes) || "");
    setDuration(formatDurationMinutes(prev.reps) || displayLoggedNumber(prev.reps));
    setDistance(displayLoggedNumber(prev.weight));
  };

  useEffect(() => {
    if (!loadToken) return;
    applyLast();
  }, [loadToken]);

  const handleSave = async (overrides = {}) => {
    const cur = draftRef.current;
    const nextType = overrides.type !== undefined ? overrides.type : cur.type;
    const nextNote = overrides.note !== undefined ? overrides.note : cur.note;
    const nextDuration = overrides.duration !== undefined ? overrides.duration : cur.duration;
    const nextDistance = overrides.distance !== undefined ? overrides.distance : cur.distance;
    const minutes = parseDurationMinutes(nextDuration);
    const miles = parseOptionalNumber(nextDistance);
    const cardioType = nextType || "";
    const rowId = cur.id;

    try {
      if (minutes == null && miles == null && !cardioType && !String(nextNote || "").trim()) {
        if (rowId) {
          await base44.entities.WorkoutLog.delete(rowId);
          setId(null);
          onSaved?.();
          requestTrainingSheetSync();
        }
        return;
      }

      const payload = withPerformedDate({
        week_start: weekStart,
        day: exercise._day,
        exercise: exercise.name,
        set_number: 1,
        is_amrap: false,
        reps: emptyToNull(minutes),
        weight: emptyToNull(miles),
        notes: encodeCardioNotes(cardioType, nextNote),
      }, !rowId, weekStart);

      if (rowId) {
        await base44.entities.WorkoutLog.update(rowId, payload);
      } else {
        const created = await base44.entities.WorkoutLog.create(payload);
        setId(created.id);
      }

      setTouched(emptyCardioTouched());
      if (isCurrentWeekStart(weekStart)) {
        await awardSessionActivity(true);
      }
      onSaved?.();
      requestTrainingSheetSync();
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
                mark("type");
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
            onChange={e => {
              setDuration(e.target.value);
              mark("duration");
            }}
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
            onChange={e => {
              setDistance(e.target.value);
              mark("distance");
            }}
            onBlur={() => handleSave()}
            className="h-11 text-[15px] bg-secondary border-0 font-mono px-2"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1.5 block">Notes</label>
        <Input
          type="text"
          placeholder="optional"
          value={noteText}
          onChange={e => {
            setNoteText(e.target.value);
            mark("note");
          }}
          onBlur={() => handleSave()}
          className="h-11 text-[15px] bg-secondary border-0 px-2"
          aria-label="Run notes"
        />
      </div>
    </div>
  );
}
