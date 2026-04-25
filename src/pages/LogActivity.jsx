import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PILLARS, PILLAR_KEYS, ACTIVITY_PRESETS } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import PostLogMotivation from "../components/log/PostLogMotivation";
import { calculateMomentumScore, getStreak } from "../lib/momentum";

export default function LogActivity() {
  const navigate = useNavigate();
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [motivationActivity, setMotivationActivity] = useState(null);

  const presets = selectedPillar ? ACTIVITY_PRESETS[selectedPillar] : [];

  const handleSubmit = async () => {
    const title = selectedPreset?.title || customTitle;
    if (!title || !selectedPillar) return;

    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const earnedPoints = points ? parseInt(points) : (selectedPreset?.defaultPoints || 2);

    // Persist in background
    await base44.entities.Activity.create({
      pillar: selectedPillar,
      title,
      category: selectedPreset?.category || "custom",
      value: value ? parseFloat(value) : undefined,
      unit: selectedPreset?.unit || "",
      points: earnedPoints,
      date: today,
      notes: notes || undefined,
    });

    // Show AI motivation popup, then auto-navigate after a delay
    setMotivationActivity({ pillar: selectedPillar, title, points: earnedPoints });
    toast.success(`+${earnedPoints} pts earned 🔥`);
    setSaving(false);
    setTimeout(() => navigate("/"), 4000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Log Activity</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </div>

      {/* Pillar Selection */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Select Pillar</label>
        <div className="grid grid-cols-5 gap-2">
          {PILLAR_KEYS.map(key => {
            const p = PILLARS[key];
            const Icon = p.icon;
            const active = selectedPillar === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedPillar(key); setSelectedPreset(null); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? `${p.bgClass} ${p.borderClass} ${p.textClass}`
                    : "border-border hover:border-border/80 hover:bg-secondary/50"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? p.textClass : 'text-muted-foreground'}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? p.textClass : 'text-muted-foreground'}`}>
                  {p.label.slice(0, 6)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Selection */}
      <AnimatePresence mode="wait">
        {selectedPillar && (
          <motion.div
            key={selectedPillar}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Quick Select</label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(preset => {
                const active = selectedPreset?.title === preset.title;
                return (
                  <button
                    key={preset.title}
                    onClick={() => { setSelectedPreset(preset); setCustomTitle(""); setPoints(String(preset.defaultPoints)); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{preset.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">+{preset.defaultPoints} pts · {preset.unit}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <Input
                placeholder="Or type custom activity..."
                value={customTitle}
                onChange={e => { setCustomTitle(e.target.value); setSelectedPreset(null); }}
                className="bg-secondary/50 border-border"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Value + Points */}
      {(selectedPreset || customTitle) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
                Value {selectedPreset?.unit ? `(${selectedPreset.unit})` : ''}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Points</label>
              <Input
                type="number"
                placeholder={String(selectedPreset?.defaultPoints || 2)}
                value={points}
                onChange={e => setPoints(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Notes (optional)</label>
            <Textarea
              placeholder="Any details..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="bg-secondary/50 border-border resize-none"
            />
          </div>
        </motion.div>
      )}

      {/* Submit */}
      {(selectedPreset || customTitle) && selectedPillar && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            onClick={handleSubmit}
            disabled={saving || !!motivationActivity}
            className="w-full h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Log Activity
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* AI Coach motivation popup */}
      {motivationActivity && (
        <PostLogMotivation
          activity={motivationActivity}
          weekScore={0}
          streak={0}
          onClose={() => navigate("/")}
        />
      )}
    </div>
  );
}