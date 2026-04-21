import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { PILLARS, PILLAR_KEYS } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Settings, Utensils, UserX, Zap, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nutritionGoals, setNutritionGoals] = useState({ calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [savingGoals, setSavingGoals] = useState(false);

  const load = async () => {
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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your pillar targets & KPIs</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate("/onboarding")} className="gap-2">
            <Zap className="h-4 w-4 text-primary" /> Setup Wizard
          </Button>
          <Button variant="outline" onClick={() => base44.auth.logout()} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>

      {/* Nutrition Goals */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Utensils className="h-4 w-4 text-chart-3" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Nutrition Goals</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { key: "calories", label: "Calories", unit: "kcal", placeholder: "e.g. 2500" },
            { key: "protein_g", label: "Protein", unit: "g", placeholder: "e.g. 180" },
            { key: "carbs_g", label: "Carbs", unit: "g", placeholder: "e.g. 250" },
            { key: "fat_g", label: "Fat", unit: "g", placeholder: "e.g. 80" },
          ].map(({ key, label, unit, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">{label} ({unit})</label>
              <Input
                type="number"
                placeholder={placeholder}
                value={nutritionGoals[key]}
                onChange={e => setNutritionGoals(g => ({ ...g, [key]: e.target.value }))}
                className="bg-secondary/50 border-border font-mono"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSaveGoals} disabled={savingGoals} className="gap-2">
          Save Goals
        </Button>
      </div>

      {/* Add New Target */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Add Target</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Pillar</label>
              <Select value={newTarget.pillar} onValueChange={v => setNewTarget(t => ({ ...t, pillar: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {PILLAR_KEYS.map(k => <SelectItem key={k} value={k}>{PILLARS[k].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Period</label>
              <Select value={newTarget.period} onValueChange={v => setNewTarget(t => ({ ...t, period: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
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
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Metric Name</label>
              <Input
                value={newTarget.metric_name}
                onChange={e => setNewTarget(t => ({ ...t, metric_name: e.target.value }))}
                placeholder="e.g., Miles Run"
                className="bg-secondary/50 border-border"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Target</label>
              <Input
                type="number"
                value={newTarget.target_value}
                onChange={e => setNewTarget(t => ({ ...t, target_value: e.target.value }))}
                placeholder="20"
                className="bg-secondary/50 border-border font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Unit</label>
              <Input
                value={newTarget.unit}
                onChange={e => setNewTarget(t => ({ ...t, unit: e.target.value }))}
                placeholder="miles"
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Target
          </Button>
        </div>
      </div>

      {/* Existing Targets */}
      {PILLAR_KEYS.map(pillarKey => {
        const pillarTargets = targets.filter(t => t.pillar === pillarKey);
        if (pillarTargets.length === 0) return null;
        const p = PILLARS[pillarKey];
        const Icon = p.icon;

        return (
          <div key={pillarKey} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-8 w-8 rounded-lg ${p.bgClass} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${p.textClass}`} />
              </div>
              <h3 className="text-sm font-bold text-foreground">{p.label}</h3>
            </div>
            <div className="space-y-2">
              {pillarTargets.map(target => (
                <div key={target.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/30">
                  <div>
                    <span className="text-sm font-medium text-foreground">{target.metric_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {target.target_value} {target.unit} / {target.period}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(target.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {targets.length === 0 && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <Settings className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No targets set yet. Add your first KPI above.</p>
        </div>
      )}

      {/* Delete Account */}
      <div className="rounded-2xl border border-destructive/30 bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <UserX className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">Danger Zone</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2 min-h-[44px]">
              <UserX className="h-4 w-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
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