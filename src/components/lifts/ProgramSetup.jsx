import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Dumbbell, Plus, Trash2, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROGRAM_PRESETS,
  clonePresetDays,
  emptyCustomDays,
  getProgramPreset,
} from "@/lib/workoutProgram";
import { toast } from "sonner";
import { clearProgramSetupDraft, loadProgramSetupDraft, saveProgramSetupDraft } from "@/lib/programSetupState";

function migrateDraft(saved) {
  if (!saved) return { presetId: null, days: emptyCustomDays(3), expandedDay: 1 };
  let presetId = saved.presetId ?? null;
  if (presetId == null && saved.useTemplate === true) presetId = "starter_5";
  if (presetId == null && saved.useTemplate === false) presetId = "custom";
  return {
    presetId,
    days: saved.days?.length ? saved.days : emptyCustomDays(3),
    expandedDay: saved.expandedDay ?? 1,
  };
}

export default function ProgramSetup({ onComplete }) {
  const saved = migrateDraft(loadProgramSetupDraft());
  const [presetId, setPresetId] = useState(saved.presetId);
  const [days, setDays] = useState(saved.days);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState(saved.expandedDay);

  useEffect(() => {
    saveProgramSetupDraft({ presetId, days, expandedDay });
  }, [presetId, days, expandedDay]);

  const choosePreset = (id) => {
    const preset = getProgramPreset(id);
    if (!preset) return;
    const next = clonePresetDays(preset);
    setDays(next);
    setExpandedDay(next[0]?.day || 1);
    setPresetId(id);
  };

  const chooseCustom = () => {
    setDays(emptyCustomDays(3));
    setExpandedDay(1);
    setPresetId("custom");
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

  const addDay = () => {
    if (days.length >= 6) return;
    const nextDay = days.length + 1;
    setDays(prev => [...prev, { day: nextDay, label: `Day ${nextDay}`, type: "strength", exercises: [] }]);
    setExpandedDay(nextDay);
  };

  const removeDay = (dayIdx) => {
    if (days.length <= 1) return;
    const next = days.filter((_, i) => i !== dayIdx).map((d, i) => ({
      ...d,
      day: i + 1,
      label: /^Day\s+\d+$/i.test(d.label) ? `Day ${i + 1}` : d.label,
    }));
    setDays(next);
    setExpandedDay(next[0]?.day || 1);
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
      toast.success("Program saved!");
      clearProgramSetupDraft();
      onComplete();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  if (presetId === null) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="page-title">Set up your program</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick a starter, then edit before you save.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {PROGRAM_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => choosePreset(preset.id)}
              className="editorial-card p-5 text-left hover:border-clay transition-all"
            >
              <span className="font-semibold text-ink">{preset.name}</span>
              <p className="text-sm text-muted-foreground mt-1">{preset.blurb}</p>
            </button>
          ))}
          <button
            onClick={chooseCustom}
            className="editorial-card p-5 text-left"
          >
            <span className="font-semibold text-ink">Build your own</span>
            <p className="text-sm text-muted-foreground mt-1">Start with three empty days. Add or remove as you like.</p>
          </button>
        </div>
      </motion.div>
    );
  }

  const preset = getProgramPreset(presetId);
  const title = presetId === "custom" ? "Build your program" : `Customize ${preset?.name || "program"}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => setPresetId(null)}
          className="text-[12px] font-bold uppercase tracking-[0.12em] text-caption min-h-[44px]"
        >
          All presets
        </button>
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure each day’s exercises, sets, and reps.</p>
      </div>

      {days.map((day, dayIdx) => (
        <div key={day.day} className="editorial-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
          >
            <div className="flex items-center gap-3">
              {day.type === "cardio"
                ? <Activity className="h-4 w-4 text-chart-3" />
                : <Dumbbell className="h-4 w-4 text-primary" />
              }
              <span className="font-bold text-sm">{day.label}</span>
              <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                {day.type}
              </span>
              {day.type === "strength" && (
                <span className="text-xs text-muted-foreground">{day.exercises.filter(e => !e.isCardio).length} exercises</span>
              )}
            </div>
            {expandedDay === day.day ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedDay === day.day && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/50">
              <div className="flex items-center justify-between gap-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Day type:</span>
                  <button
                    onClick={() => toggleDayType(dayIdx)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors min-h-[36px]"
                  >
                    Switch to {day.type === "strength" ? "Cardio" : "Strength"}
                  </button>
                </div>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(dayIdx)}
                    className="text-xs font-semibold text-caption min-h-[36px]"
                  >
                    Remove day
                  </button>
                )}
              </div>

              {day.type === "strength" && (
                <>
                  {day.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="flex items-center gap-2">
                      <Input
                        placeholder="Exercise name"
                        value={ex.name}
                        onChange={e => updateExercise(dayIdx, exIdx, "name", e.target.value)}
                        className="flex-1 bg-secondary/50 border-border text-sm h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Sets"
                        value={ex.sets || ""}
                        onChange={e => updateExercise(dayIdx, exIdx, "sets", parseInt(e.target.value) || 3)}
                        className="w-16 bg-secondary/50 border-border text-xs text-center font-mono h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Reps"
                        value={ex.reps || ""}
                        onChange={e => updateExercise(dayIdx, exIdx, "reps", parseInt(e.target.value) || null)}
                        className="w-16 bg-secondary/50 border-border text-xs text-center font-mono h-9"
                      />
                      <button
                        onClick={() => removeExercise(dayIdx, exIdx)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors min-h-[36px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addExercise(dayIdx)}
                    className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 min-h-[36px]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add exercise
                  </button>
                </>
              )}
              {day.type === "cardio" && (
                <p className="text-xs text-muted-foreground py-2">Cardio day — duration will be logged.</p>
              )}
            </div>
          )}
        </div>
      ))}

      {days.length < 6 && (
        <button
          type="button"
          onClick={addDay}
          className="flex items-center gap-2 text-[13px] font-semibold text-ink min-h-[44px]"
        >
          <Plus className="h-3.5 w-3.5" /> Add a day
        </button>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? "Saving..." : "Save my program"}
      </Button>
    </motion.div>
  );
}
