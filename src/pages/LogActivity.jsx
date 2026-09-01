import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PILLARS, PILLAR_KEYS, ACTIVITY_PRESETS } from "../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CAPTURE_DESTINATIONS } from "../components/capture/CaptureChooser";

function initialPillar(searchParams) {
  const fromQuery = searchParams.get("pillar");
  if (fromQuery && PILLAR_KEYS.includes(fromQuery)) return fromQuery;
  return "career";
}

export default function LogActivity() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPillar, setSelectedPillar] = useState(() => initialPillar(searchParams));
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const presets = selectedPillar ? ACTIVITY_PRESETS[selectedPillar] : [];

  const handleSubmit = async () => {
    const title = selectedPreset?.title || customTitle;
    if (!title || !selectedPillar) return;

    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const earnedPoints = points ? parseInt(points) : (selectedPreset?.defaultPoints || 2);

    try {
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
      setSuccess({ pillar: selectedPillar, title, points: earnedPoints });
      toast.success(`+${earnedPoints} pts logged`);
    } catch {
      toast.error("Could not save activity. Try again.");
    }
    setSaving(false);
  };

  const reset = () => {
    setSelectedPillar(initialPillar(searchParams));
    setSelectedPreset(null);
    setCustomTitle("");
    setValue("");
    setNotes("");
    setPoints("");
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Logged</h1>
        <div className="editorial-card p-6 text-center space-y-3">
          <p className="font-mono text-[28px] font-semibold text-clay">+{success.points}</p>
          <p className="text-[16px] font-semibold text-ink">{success.title}</p>
          <p className="text-[12px] text-caption">{PILLARS[success.pillar]?.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={reset}
            className="min-h-[44px] rounded-[4px] border border-border bg-card text-[13px] font-semibold text-ink"
          >
            Log another
          </button>
          <button
            onClick={() => navigate("/")}
            className="min-h-[44px] rounded-[4px] bg-clay text-clay-fg text-[13px] font-semibold hover:bg-clay-hover"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Other activity</h1>

      <div>
        <p className="micro-label mb-2">Looking for a meal, lift, or note?</p>
        <div className="grid grid-cols-3 gap-1.5">
          {CAPTURE_DESTINATIONS.filter(d => d.key !== "other").map(dest => (
            <button
              key={dest.key}
              type="button"
              onClick={() => navigate(dest.to)}
              className="editorial-card py-2.5 px-2 text-[12px] font-semibold text-ink min-h-[44px]"
            >
              {dest.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="micro-label mb-2">Pillar</p>
        <div className="grid grid-cols-5 gap-1.5">
          {PILLAR_KEYS.map(key => {
            const p = PILLARS[key];
            const active = selectedPillar === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedPillar(key); setSelectedPreset(null); setCustomTitle(""); setPoints(""); }}
                className={`flex flex-col items-center gap-2 py-3 px-1 rounded-[4px] border bg-card min-h-[72px] ${
                  active ? "border-clay" : "border-border"
                }`}
              >
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: p.color }} />
                <span className={`text-[8px] font-bold uppercase tracking-[0.06em] text-center leading-tight ${active ? "text-ink" : "text-faint"}`}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedPillar && (
          <motion.div
            key={selectedPillar}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <p className="micro-label">Preset</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(preset => {
                const active = selectedPreset?.title === preset.title;
                return (
                  <button
                    key={preset.title}
                    onClick={() => { setSelectedPreset(preset); setCustomTitle(""); setPoints(String(preset.defaultPoints)); }}
                    className={`p-3 rounded-[4px] border text-left min-h-[64px] ${
                      active ? "border-clay bg-card" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-ink">{preset.title}</p>
                    <p className="text-[11px] text-caption mt-0.5 font-mono">+{preset.defaultPoints} · {preset.unit}</p>
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Or type a custom activity"
              value={customTitle}
              onChange={e => { setCustomTitle(e.target.value); setSelectedPreset(null); }}
              className="bg-secondary border-border font-sans"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {(selectedPreset || customTitle) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="micro-label mb-1.5 block">
                Value {selectedPreset?.unit ? `(${selectedPreset.unit})` : ""}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="micro-label mb-1.5 block">Points</label>
              <Input
                type="number"
                placeholder={String(selectedPreset?.defaultPoints || 2)}
                value={points}
                onChange={e => setPoints(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="micro-label mb-1.5 block">Notes</label>
            <Textarea
              placeholder="Optional details"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 bg-clay text-clay-fg hover:bg-clay-hover font-semibold text-[15px]"
          >
            {saving ? "Saving…" : "Log Activity"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
