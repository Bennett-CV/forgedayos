import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PILLARS, PILLAR_KEYS } from "@/lib/constants";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingState";

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
  const { user } = useAuth();
  const [draft, setDraft] = useState(() => loadOnboardingDraft());
  const [saving, setSaving] = useState(false);
  const [savingPillars, setSavingPillars] = useState(false);

  const { step, pillars, profile, goals } = draft;

  useEffect(() => {
    saveOnboardingDraft(draft);
  }, [draft]);

  const updateDraft = (patch) => {
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const togglePillar = (key) => {
    updateDraft({
      pillars: pillars.includes(key) ? pillars.filter(k => k !== key) : [...pillars, key],
    });
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

      if (profile.weight_lbs) {
        const today = new Date().toISOString().split("T")[0];
        await base44.entities.WeightLog.create({ date: today, weight_lbs: parseFloat(profile.weight_lbs), notes: "Starting weight" });
      }

      clearOnboardingDraft();
      toast.success("You're all set! Welcome to Forgeday.");
      onComplete?.();
      window.location.href = "/";
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const persistPillars = async () => {
    setSavingPillars(true);
    try {
      await base44.auth.updateMe({ focused_pillars: pillars });
    } catch {
      toast.error("Couldn't save pillars yet. They'll be saved when you finish setup.");
    } finally {
      setSavingPillars(false);
    }
  };

  const handleGetStarted = () => {
    updateDraft({ step: 1 });
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (pillars.length === 0) return;
      await persistPillars();
      updateDraft({ step: 2 });
      return;
    }
    if (step === 2) {
      updateDraft({ step: 3 });
    }
  };

  const handleBack = () => {
    if (step <= 0) return;
    updateDraft({ step: step - 1 });
  };

  const canContinue = step !== 1 || pillars.length > 0;
  const alreadyCompleted = Boolean(user?.onboarding_completed);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`rounded-full transition-all duration-300 ${
                i === step ? "w-5 h-2 bg-clay" : i < step ? "w-2 h-2 bg-clay/50" : "w-2 h-2 bg-border"
              }`}
            />
          ))}
        </div>
        {step > 0 && alreadyCompleted && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[12px] font-semibold text-caption underline min-h-[44px] min-w-[44px] flex items-center justify-end"
          >
            Skip
          </button>
        )}
      </div>

      <div>
        {step === 0 && <StepWelcome />}
        {step === 1 && <StepPillars pillars={pillars} togglePillar={togglePillar} />}
        {step === 2 && <StepProfile profile={profile} setProfile={next => updateDraft({ profile: typeof next === "function" ? next(profile) : next })} />}
        {step === 3 && <StepGoals goals={goals} setGoals={next => updateDraft({ goals: typeof next === "function" ? next(goals) : next })} />}
      </div>

      <div className="mt-8 pt-4 border-t border-border flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center min-h-[48px] px-4 rounded-[4px] border border-border text-[14px] font-semibold text-ink"
          >
            Back
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            type="button"
            onClick={step === 0 ? handleGetStarted : handleContinue}
            disabled={!canContinue || savingPillars}
            className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover disabled:opacity-50 disabled:pointer-events-none flex-1 max-w-xs ml-auto"
          >
            {savingPillars ? "Saving..." : step === 0 ? "Get Started" : "Continue"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover disabled:opacity-50 disabled:pointer-events-none flex-1 max-w-xs ml-auto"
          >
            {saving ? "Saving..." : "Finish Setup"}
          </button>
        )}
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="pt-2">
      <h1 className="font-serif text-[28px] font-semibold tracking-tight text-ink leading-tight">Welcome to Forgeday</h1>
      <p className="mt-3 text-[15px] text-caption leading-relaxed">
        Your personal operating system for fitness, nutrition, finance, and growth.
      </p>
      <p className="mt-3 text-[14px] text-faint leading-relaxed">
        Let's take 2 minutes to set up your profile and goals so the app is personalized to you.
      </p>
    </div>
  );
}

function StepPillars({ pillars, togglePillar }) {
  return (
    <div>
      <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink">Choose your pillars</h2>
      <p className="mt-1 text-[14px] text-caption mb-5">Select the areas you want to focus on. You can always change this later.</p>
      <div className="space-y-2">
        {PILLAR_KEYS.map(key => {
          const p = PILLARS[key];
          const Icon = p.icon;
          const selected = pillars.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => togglePillar(key)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-[4px] border transition-colors text-left min-h-[64px] ${
                selected ? "border-clay bg-card" : "border-border bg-card"
              }`}
            >
              <div className="h-10 w-10 rounded-[4px] bg-secondary flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-ink" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[14px] text-ink">{p.label}</p>
                <p className="text-[12px] text-caption">{p.description || p.label}</p>
              </div>
              {selected && <Check className="h-5 w-5 text-clay shrink-0" />}
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
    <div>
      <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink">Your profile</h2>
      <p className="mt-1 text-[14px] text-caption mb-5">Used to personalize your nutrition targets and goals.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="micro-label mb-1.5 block">Age</label>
            <Input type="number" placeholder="e.g. 28" value={profile.age} onChange={e => set("age", e.target.value)} />
          </div>
          <div>
            <label className="micro-label mb-1.5 block">Weight (lbs)</label>
            <Input type="number" placeholder="e.g. 185" value={profile.weight_lbs} onChange={e => set("weight_lbs", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="micro-label mb-1.5 block">Height</label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Feet (e.g. 5)" value={profile.height_ft} onChange={e => set("height_ft", e.target.value)} />
            <Input type="number" placeholder="Inches (e.g. 11)" value={profile.height_in} onChange={e => set("height_in", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="micro-label mb-1.5 block">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {["male", "female", "other"].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => set("gender", g)}
                className={`capitalize text-sm font-semibold py-3 rounded-[4px] border transition-colors min-h-[44px] ${
                  profile.gender === g ? "border-clay bg-card text-ink" : "border-border bg-secondary text-caption"
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
    <div>
      <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink">Your goals</h2>
      <p className="mt-1 text-[14px] text-caption mb-5">Set your daily nutrition targets and workout frequency.</p>
      <div className="space-y-5">
        <div>
          <label className="micro-label mb-2 block">Activity Level</label>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => set("activity_level", a.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-[4px] border transition-colors min-h-[52px] text-left ${
                  goals.activity_level === a.value ? "border-clay bg-card" : "border-border bg-secondary"
                }`}
              >
                <span className="font-semibold text-sm text-ink">{a.label}</span>
                <span className="text-xs text-caption">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="micro-label mb-2 block">Workout Days / Week</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => set("workout_days", d)}
                className={`flex-1 py-3 rounded-[4px] font-bold text-sm border transition-colors min-h-[44px] ${
                  goals.workout_days === d ? "border-clay bg-card text-ink" : "border-border bg-secondary text-caption"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="micro-label mb-2 block">Daily Nutrition Targets (optional)</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "calories", label: "Calories", placeholder: "e.g. 2500" },
              { key: "protein_g", label: "Protein (g)", placeholder: "e.g. 180" },
              { key: "carbs_g", label: "Carbs (g)", placeholder: "e.g. 250" },
              { key: "fat_g", label: "Fat (g)", placeholder: "e.g. 80" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-caption mb-1 block">{label}</label>
                <Input
                  type="number"
                  placeholder={placeholder}
                  value={goals[key]}
                  onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
