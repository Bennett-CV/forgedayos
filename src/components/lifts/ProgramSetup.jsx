import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Dumbbell, Plus, Trash2, Activity, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORKOUT_PROGRAM } from "@/lib/workoutProgram";
import { toast } from "sonner";

const DEFAULT_DAYS = [
  { day: 1, label: "Day 1", type: "strength", exercises: [] },
  { day: 2, label: "Day 2", type: "cardio", exercises: [{ name: "Cardio", sets: 1, reps: null, isCardio: true }] },
  { day: 3, label: "Day 3", type: "strength", exercises: [] },
  { day: 4, label: "Day 4", type: "cardio", exercises: [{ name: "Cardio", sets: 1, reps: null, isCardio: true }] },
  { day: 5, label: "Day 5", type: "strength", exercises: [] },
];

export default function ProgramSetup({ onComplete }) {
  const [useTemplate, setUseTemplate] = useState(null); // null = not chosen yet
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState(1);

  const handleUseTemplate = () => {
    const templateDays = [1, 2, 3, 4, 5].map(d => ({
      day: d,
      label: WORKOUT_PROGRAM[d].label,
      type: WORKOUT_PROGRAM[d].type,
      exercises: WORKOUT_PROGRAM[d].exercises.map(e => ({ ...e })),
    }));
    setDays(templateDays);
    setUseTemplate(true);
  };

  const handleBuildOwn = () => {
    setUseTemplate(false);
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
      toast.success("Program saved!");
      onComplete();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  // Step 1: Choose path
  if (useTemplate === null) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Set Up Your Lifting Program</h1>
          <p className="text-sm text-muted-foreground mt-1">Build a 5-day program to track your lifts week over week.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={handleUseTemplate}
            className="rounded-2xl border border-primary/40 bg-primary/5 p-6 text-left hover:bg-primary/10 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <Copy className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">Use a starter template</span>
            </div>
            <p className="text-sm text-muted-foreground">Load a pre-built 5-day dumbbell program (strength + cardio days). You can customize it before saving.</p>
          </button>

          <button
            onClick={handleBuildOwn}
            className="rounded-2xl border border-border bg-card p-6 text-left hover:bg-secondary/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold text-foreground">Build my own program</span>
            </div>
            <p className="text-sm text-muted-foreground">Start from scratch and add your own exercises for each day.</p>
          </button>
        </div>
      </motion.div>
    );
  }

  // Step 2: Edit program
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {useTemplate ? "Customize Your Program" : "Build Your Program"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure each day's exercises, sets, and reps.</p>
      </div>

      {days.map((day, dayIdx) => (
        <div key={day.day} className="rounded-2xl border border-border bg-card overflow-hidden">
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
              {/* Type toggle */}
              <div className="flex items-center gap-2 pt-3">
                <span className="text-xs text-muted-foreground">Day type:</span>
                <button
                  onClick={() => toggleDayType(dayIdx)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors min-h-[36px]"
                >
                  Switch to {day.type === "strength" ? "Cardio" : "Strength"}
                </button>
              </div>

              {/* Exercises */}
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

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? "Saving..." : "Save My Program"}
      </Button>
    </motion.div>
  );
}