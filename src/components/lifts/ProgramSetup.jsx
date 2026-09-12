import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Dumbbell, Plus, Trash2, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  WORKOUT_PRESETS,
  CUSTOM_DAY_COUNTS,
  blankProgram,
  clonePresetDays,
} from "@/lib/workoutPresets";

export default function ProgramSetup({ onComplete }) {
  const [presetId, setPresetId] = useState(null);
  const [days, setDays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState(1);
  const [customCount, setCustomCount] = useState(4);

  const choosePreset = (id) => {
    const preset = WORKOUT_PRESETS.find(p => p.id === id);
    setPresetId(id);
    setDays(clonePresetDays(preset));
    setExpandedDay(preset?.days?.[0]?.day || 1);
  };

  const chooseCustom = () => {
    setPresetId("custom");
    const next = blankProgram(customCount);
    setDays(next);
    setExpandedDay(1);
  };

  const applyCustomCount = (n) => {
    setCustomCount(n);
    if (presetId === "custom") {
      const next = blankProgram(n);
      setDays(next);
      setExpandedDay(1);
    }
  };

  const toggleDayType = (dayIdx) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const newType = d.type === "strength" ? "cardio" : "strength";
      return {
        ...d,
        type: newType,
        exercises: newType === "cardio"
          ? [{ name: "Cardio", sets: 1, reps: null, isCardio: true }]
          : d.exercises.filter(e => !e.isCardio),
      };
    }));
  };

  const addExercise = (dayIdx) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, exercises: [...d.exercises, { name: "", sets: 3, reps: 8, isAmrap: false, isCardio: false }] };
    }));
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const exs = d.exercises.map((e, j) => j === exIdx ? { ...e, [field]: value } : e);
      return { ...d, exercises: exs };
    }));
  };

  const removeExercise = (dayIdx, exIdx) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(days.map(d =>
        base44.entities.WorkoutProgram.create({
          day: d.day,
          label: d.label,
          type: d.type,
          exercises: d.exercises.filter(e => e.name?.trim()),
        })
      ));
      toast.success("Program saved.");
      onComplete();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  if (presetId === null) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="page-title">Set up training</h1>
          <p className="text-[14px] text-caption mt-1">Start from a split, then edit anything.</p>
        </div>

        <div className="space-y-2">
          {WORKOUT_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset.id)}
              className="w-full editorial-card p-4 text-left min-h-0"
            >
              <p className="text-[15px] font-semibold text-ink">{preset.name}</p>
              <p className="text-[12px] text-caption mt-1">{preset.caption}</p>
            </button>
          ))}
        </div>

        <div className="editorial-card p-4 space-y-3">
          <div>
            <p className="text-[15px] font-semibold text-ink">Build your own</p>
            <p className="text-[12px] text-caption mt-1">Blank days. Add the lifts you already do.</p>
          </div>
          <div className="flex gap-2">
            {CUSTOM_DAY_COUNTS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCustomCount(n)}
                className={`flex-1 py-2.5 rounded-[4px] text-[13px] font-semibold border min-h-[44px] ${
                  customCount === n ? "border-clay text-ink bg-card" : "border-border text-caption bg-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={chooseCustom}
            className="w-full min-h-[44px] rounded-[4px] border border-border text-[14px] font-semibold text-ink"
          >
            Start with {customCount} days
          </button>
        </div>
      </motion.div>
    );
  }

  const title = presetId === "custom"
    ? "Build your program"
    : WORKOUT_PRESETS.find(p => p.id === presetId)?.name || "Customize";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <button
          type="button"
          onClick={() => { setPresetId(null); setDays([]); }}
          className="text-[12px] font-semibold text-caption min-h-0 min-w-0"
        >
          All presets
        </button>
        <h1 className="page-title mt-2">{title}</h1>
        <p className="text-[13px] text-caption mt-1">Edit names, sets, and reps before you save.</p>
      </div>

      {presetId === "custom" && (
        <div className="flex gap-2">
          {CUSTOM_DAY_COUNTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => applyCustomCount(n)}
              className={`flex-1 py-2.5 rounded-[4px] text-[13px] font-semibold border min-h-[44px] ${
                days.length === n ? "border-clay text-ink bg-card" : "border-border text-caption bg-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {days.map((day, dayIdx) => (
        <div key={day.day} className="editorial-card overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4"
            onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
          >
            <div className="flex items-center gap-3 min-w-0">
              {day.type === "cardio"
                ? <Activity className="h-4 w-4 text-caption shrink-0" />
                : <Dumbbell className="h-4 w-4 text-ink shrink-0" />
              }
              <span className="font-semibold text-[14px] text-ink truncate">{day.label}</span>
              <span className="text-[11px] text-caption capitalize">{day.type}</span>
            </div>
            {expandedDay === day.day ? <ChevronUp className="h-4 w-4 text-caption" /> : <ChevronDown className="h-4 w-4 text-caption" />}
          </button>

          {expandedDay === day.day && (
            <div className="px-4 pb-4 space-y-3 border-t border-border">
              <div className="flex items-center gap-2 pt-3">
                <Input
                  value={day.label}
                  onChange={e => setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, label: e.target.value } : d))}
                  className="h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleDayType(dayIdx)}
                  className="text-[12px] font-semibold px-3 py-2 rounded-[4px] bg-secondary text-ink min-h-[36px] min-w-0 shrink-0"
                >
                  {day.type === "strength" ? "Cardio" : "Strength"}
                </button>
              </div>

              {day.type === "strength" && (
                <>
                  {day.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="flex items-center gap-2">
                      <Input
                        placeholder="Exercise name"
                        value={ex.name}
                        onChange={e => updateExercise(dayIdx, exIdx, "name", e.target.value)}
                        className="flex-1 bg-secondary border-border text-sm h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Sets"
                        value={ex.sets || ""}
                        onChange={e => updateExercise(dayIdx, exIdx, "sets", parseInt(e.target.value, 10) || 3)}
                        className="w-16 bg-secondary border-border text-xs text-center font-mono h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Reps"
                        value={ex.reps || ""}
                        onChange={e => updateExercise(dayIdx, exIdx, "reps", parseInt(e.target.value, 10) || null)}
                        className="w-16 bg-secondary border-border text-xs text-center font-mono h-9"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(dayIdx, exIdx)}
                        className="p-2 rounded-[4px] text-caption hover:text-destructive min-h-[36px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addExercise(dayIdx)}
                    className="flex items-center gap-2 text-[12px] font-semibold text-clay min-h-[36px] min-w-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add exercise
                  </button>
                </>
              )}
              {day.type === "cardio" && (
                <p className="text-[12px] text-caption py-2">Cardio day — log type, time, and distance.</p>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save program"}
      </button>
    </motion.div>
  );
}
