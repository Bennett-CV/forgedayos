import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PILLARS, PILLAR_KEYS } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const APP_VERSION = "2.1.0";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nutritionGoals, setNutritionGoals] = useState({ calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [savingGoals, setSavingGoals] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "midnight") return "midnight";
    return "paper";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "midnight") {
      root.classList.add("midnight");
      localStorage.setItem("theme", "midnight");
    } else {
      root.classList.remove("midnight");
      localStorage.setItem("theme", "paper");
    }
  }, [theme]);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const data = await base44.entities.PillarTarget.filter({ created_by: me?.email }, "-created_date", 100);
      setTargets(data);
      const g = me?.nutrition_goals || {};
      setNutritionGoals({
        calories: g.calories || "",
        protein_g: g.protein_g || "",
        carbs_g: g.carbs_g || "",
        fat_g: g.fat_g || "",
      });
    } catch {
      // Best-effort: show empty settings rather than error
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    const goals = {};
    if (nutritionGoals.calories) goals.calories = parseFloat(nutritionGoals.calories);
    if (nutritionGoals.protein_g) goals.protein_g = parseFloat(nutritionGoals.protein_g);
    if (nutritionGoals.carbs_g) goals.carbs_g = parseFloat(nutritionGoals.carbs_g);
    if (nutritionGoals.fat_g) goals.fat_g = parseFloat(nutritionGoals.fat_g);
    await base44.auth.updateMe({ nutrition_goals: goals });
    toast.success("Nutrition goals saved!");
    setSavingGoals(false);
  };

  const [newTarget, setNewTarget] = useState({
    pillar: "",
    metric_name: "",
    target_value: "",
    period: "weekly",
    unit: "",
  });

  const handleAdd = async () => {
    if (!newTarget.pillar || !newTarget.metric_name || !newTarget.target_value) return;
    await base44.entities.PillarTarget.create({
      ...newTarget,
      target_value: parseFloat(newTarget.target_value),
    });
    setNewTarget({ pillar: "", metric_name: "", target_value: "", period: "weekly", unit: "" });
    toast.success("Target added!");
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.PillarTarget.delete(id);
    toast.success("Target removed");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  const name = user?.full_name || "Account";
  const email = user?.email || "";
  const initial = name.charAt(0).toUpperCase();
  const focused = (user?.focused_pillars || []).map(k => PILLARS[k]?.label).filter(Boolean);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Settings</h1>

      <div className="editorial-card p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center text-[16px] font-semibold text-ink shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink truncate">{name}</p>
          <p className="text-[12px] text-caption truncate">{email}</p>
        </div>
      </div>

      <div className="editorial-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[14px] text-ink">Theme</span>
          <div className="seg-track w-[168px]">
            <button
              onClick={() => setTheme("paper")}
              className={`seg-item text-[11px] ${theme === "paper" ? "seg-item-active" : ""}`}
            >
              Paper
            </button>
            <button
              onClick={() => setTheme("midnight")}
              className={`seg-item text-[11px] ${theme === "midnight" ? "seg-item-active" : ""}`}
            >
              Midnight
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
          <span className="text-[14px] text-ink">Focused Pillars</span>
          <span className="text-[13px] text-caption text-right max-w-[55%]">
            {focused.length ? focused.join(", ") : "All"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
          <span className="text-[14px] text-ink">App Version</span>
          <span className="font-mono text-[13px] text-caption">{APP_VERSION}</span>
        </div>
      </div>

      <button
        onClick={() => base44.auth.logout()}
        className="w-full min-h-[48px] rounded-[4px] border text-[14px] font-semibold"
        style={{ borderColor: "oklch(var(--destructive-border))", color: "oklch(var(--destructive-text))" }}
      >
        Sign Out
      </button>

      <div className="pt-2">
        <button
          onClick={() => navigate("/onboarding")}
          className="text-[12px] font-semibold text-clay min-h-0"
        >
          Setup wizard
        </button>
      </div>

      <div className="editorial-card p-5">
        <p className="micro-label mb-4">Daily Nutrition Goals</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { key: "calories", label: "Calories", unit: "kcal", placeholder: "e.g. 2500" },
            { key: "protein_g", label: "Protein", unit: "g", placeholder: "e.g. 180" },
            { key: "carbs_g", label: "Carbs", unit: "g", placeholder: "e.g. 250" },
            { key: "fat_g", label: "Fat", unit: "g", placeholder: "e.g. 80" },
          ].map(({ key, label, unit, placeholder }) => (
            <div key={key}>
              <label className="micro-label mb-1.5 block">{label} ({unit})</label>
              <Input
                type="number"
                placeholder={placeholder}
                value={nutritionGoals[key]}
                onChange={e => setNutritionGoals(g => ({ ...g, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSaveGoals} disabled={savingGoals} className="bg-clay text-clay-fg hover:bg-clay-hover">
          Save Goals
        </Button>
      </div>

      <div className="editorial-card p-5">
        <p className="micro-label mb-4">Add Target</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="micro-label mb-1.5 block">Pillar</label>
              <Select value={newTarget.pillar} onValueChange={v => setNewTarget(t => ({ ...t, pillar: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {PILLAR_KEYS.map(k => <SelectItem key={k} value={k}>{PILLARS[k].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="micro-label mb-1.5 block">Period</label>
              <Select value={newTarget.period} onValueChange={v => setNewTarget(t => ({ ...t, period: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="micro-label mb-1.5 block">Metric</label>
              <Input
                value={newTarget.metric_name}
                onChange={e => setNewTarget(t => ({ ...t, metric_name: e.target.value }))}
                placeholder="Miles Run"
                className="font-sans"
              />
            </div>
            <div>
              <label className="micro-label mb-1.5 block">Target</label>
              <Input
                type="number"
                value={newTarget.target_value}
                onChange={e => setNewTarget(t => ({ ...t, target_value: e.target.value }))}
                placeholder="20"
              />
            </div>
            <div>
              <label className="micro-label mb-1.5 block">Unit</label>
              <Input
                value={newTarget.unit}
                onChange={e => setNewTarget(t => ({ ...t, unit: e.target.value }))}
                placeholder="miles"
                className="font-sans"
              />
            </div>
          </div>
          <Button onClick={handleAdd} className="bg-clay text-clay-fg hover:bg-clay-hover">
            Add Target
          </Button>
        </div>
      </div>

      {PILLAR_KEYS.map(pillarKey => {
        const pillarTargets = targets.filter(t => t.pillar === pillarKey);
        if (pillarTargets.length === 0) return null;
        const p = PILLARS[pillarKey];

        return (
          <div key={pillarKey} className="editorial-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: p.color }} />
              <h3 className="text-[14px] font-semibold text-ink">{p.label}</h3>
            </div>
            <div className="space-y-2">
              {pillarTargets.map(target => (
                <div key={target.id} className="flex items-center justify-between px-3 py-2.5 rounded-[4px] bg-secondary">
                  <div>
                    <span className="text-sm font-medium text-ink">{target.metric_name}</span>
                    <span className="text-xs text-caption ml-2">
                      {target.target_value} {target.unit} / {target.period}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(target.id)} className="text-[12px] font-semibold text-destructive min-h-0 min-w-0">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="editorial-card p-5" style={{ borderColor: "oklch(var(--destructive-border))" }}>
        <p className="micro-label mb-2" style={{ color: "oklch(var(--destructive-text))" }}>Danger Zone</p>
        <p className="text-xs text-caption mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="min-h-[44px]">
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all your data — activities, projects, meals, workouts, and reviews. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
                onClick={async () => {
                  try {
                    await base44.auth.deleteMe();
                    toast.success("Account deleted successfully");
                    window.location.reload();
                  } catch (error) {
                    toast.error("Failed to delete account: " + error.message);
                  }
                }}
              >
                Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
