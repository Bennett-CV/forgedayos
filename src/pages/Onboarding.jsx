import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PILLARS, PILLAR_KEYS } from "@/lib/constants";

const STEPS = ["Welcome", "Pillars", "Profile", "Goals"];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1–3 days/week" },
  { value: "moderate", label: "Moderate", desc: "3–5 days/week" },
  { value: "active", label: "Active", desc: "6–7 days/week" },
  { value: "very_active", label: "Very Active", desc: "Hard training daily" },
];

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [pillars, setPillars] = useState([]);
  const [profile, setProfile] = useState({ age: "", gender: "", weight_lbs: "", height_ft: "", height_in: "" });
  const [goals, setGoals] = useState({ calories: "", protein_g: "", carbs_g: "", fat_g: "", workout_days: 4, activity_level: "moderate" });

  const togglePillar = (key) => {
    setPillars(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updateData = {
        onboarding_completed: true,
        focused_pillars: pillars,
        profile: {
          age: profile.age ? parseInt(profile.age) : null,
          gender: profile.gender || null,
          weight_lbs: profile.weight_lbs ? parseFloat(profile.weight_lbs) : null,
          height_ft: profile.height_ft ? parseInt(profile.height_ft) : null,
          height_in: profile.height_in ? parseInt(profile.height_in) : null,
          activity_level: goals.activity_level,
        },
        nutrition_goals: {
          calories: goals.calories ? parseFloat(goals.calories) : null,
          protein_g: goals.protein_g ? parseFloat(goals.protein_g) : null,
          carbs_g: goals.carbs_g ? parseFloat(goals.carbs_g) : null,
          fat_g: goals.fat_g ? parseFloat(goals.fat_g) : null,
        },
        workout_days_per_week: goals.workout_days,
      };
      await base44.auth.updateMe(updateData);

      // Log starting weight if provided
      if (profile.weight_lbs) {
        const today = new Date().toISOString().split("T")[0];
        await base44.entities.WeightLog.create({ date: today, weight_lbs: parseFloat(profile.weight_lbs), notes: "Starting weight" });
      }

      toast.success("You're all set! Welcome to Forgeday.");
      onComplete?.();
      navigate("/");
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return pillars.length > 0;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-black text-sm tracking-tight">Forgeday</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? "w-5 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/50" : "w-2 h-2 bg-border"
              }`}
            />
          ))}
        </div>
        {step > 0 && step < 4 && (
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground underline min-h-[44px] min-w-[44px] flex items-center justify-end">
            Skip
          </button>
        )}
        {step === 0 && <div className="w-16" />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepPillars pillars={pillars} togglePillar={togglePillar} />}
            {step === 2 && <StepProfile profile={profile} setProfile={setProfile} />}
            {step === 3 && <StepGoals goals={goals} setGoals={setGoals} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="px-6 pb-safe pb-8 pt-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1 min-h-[48px]">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}

        {step < 3 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="gap-1 min-h-[48px] flex-1 max-w-xs ml-auto"
          >
            {step === 0 ? "Get Started" : "Continue"} <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="gap-1 min-h-[48px] flex-1 max-w-xs ml-auto"
          >
            {saving ? "Saving..." : <><Check className="h-4 w-4" /> Finish Setup</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center pt-8 max-w-sm mx-auto">
      <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
        <Zap className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-black tracking-tight mb-3">Welcome to Forgeday</h1>
      <p className="text-muted-foreground text-base leading-relaxed">
        Your personal operating system for fitness, nutrition, finance, and growth.
      </p>
      <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
        Let's take 2 minutes to set up your profile and goals so the app is personalized to you.
      </p>
    </div>
  );
}

function StepPillars({ pillars, togglePillar }) {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-black tracking-tight mb-1">Choose your pillars</h2>
      <p className="text-muted-foreground text-sm mb-6">Select the areas you want to focus on. You can always change this later.</p>
      <div className="space-y-3">
        {PILLAR_KEYS.map(key => {
          const p = PILLARS[key];
          const Icon = p.icon;
          const selected = pillars.includes(key);
          return (
            <button
              key={key}
              onClick={() => togglePillar(key)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-all text-left min-h-[64px] ${
                selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className={`h-10 w-10 rounded-lg ${p.bgClass} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${p.textClass}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.description || p.label}</p>
              </div>
              {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepProfile({ profile, setProfile }) {
  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-black tracking-tight mb-1">Your profile</h2>
      <p className="text-muted-foreground text-sm mb-6">Used to personalize your nutrition targets and goals.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Age</label>
            <Input type="number" placeholder="e.g. 28" value={profile.age} onChange={e => set("age", e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Weight (lbs)</label>
            <Input type="number" placeholder="e.g. 185" value={profile.weight_lbs} onChange={e => set("weight_lbs", e.target.value)} className="bg-secondary/50 border-border" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Height</label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Feet (e.g. 5)" value={profile.height_ft} onChange={e => set("height_ft", e.target.value)} className="bg-secondary/50 border-border" />
            <Input type="number" placeholder="Inches (e.g. 11)" value={profile.height_in} onChange={e => set("height_in", e.target.value)} className="bg-secondary/50 border-border" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {["male", "female", "other"].map(g => (
              <button
                key={g}
                onClick={() => set("gender", g)}
                className={`capitalize text-sm font-semibold py-3 rounded-lg border-2 transition-all min-h-[44px] ${
                  profile.gender === g ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepGoals({ goals, setGoals }) {
  const set = (key, val) => setGoals(g => ({ ...g, [key]: val }));
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-black tracking-tight mb-1">Your goals</h2>
      <p className="text-muted-foreground text-sm mb-6">Set your daily nutrition targets and workout frequency.</p>
      <div className="space-y-5">
        {/* Activity level */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Activity Level</label>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.value}
                onClick={() => set("activity_level", a.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all min-h-[52px] text-left ${
                  goals.activity_level === a.value ? "border-primary bg-primary/10" : "border-border bg-secondary/30"
                }`}
              >
                <span className="font-semibold text-sm text-foreground">{a.label}</span>
                <span className="text-xs text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workout days */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Workout Days / Week</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button
                key={d}
                onClick={() => set("workout_days", d)}
                className={`flex-1 py-3 rounded-lg font-bold text-sm border-2 transition-all min-h-[44px] ${
                  goals.workout_days === d ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Nutrition goals */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Daily Nutrition Targets (optional)</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "calories", label: "Calories", placeholder: "e.g. 2500" },
              { key: "protein_g", label: "Protein (g)", placeholder: "e.g. 180" },
              { key: "carbs_g", label: "Carbs (g)", placeholder: "e.g. 250" },
              { key: "fat_g", label: "Fat (g)", placeholder: "e.g. 80" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
                <Input
                  type="number"
                  placeholder={placeholder}
                  value={goals[key]}
                  onChange={e => set(key, e.target.value)}
                  className="bg-secondary/50 border-border font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}