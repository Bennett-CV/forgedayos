import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { PILLARS, PILLAR_KEYS } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.PillarTarget.list("-created_date", 100);
    setTargets(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your pillar targets & KPIs</p>
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
    </div>
  );
}