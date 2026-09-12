import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { formatLocalDate, localToday } from "@/lib/localDate";
import { detectHealthCapability, healthCapabilityCopy } from "@/lib/healthBridge";
import {
  HEALTH_KINDS,
  isHealthActivity,
  parseHealthText,
  planHealthWrites,
  sampleCsvTemplate,
  summarizeRecords,
} from "@/lib/healthImport";

const KINDS = [
  { id: HEALTH_KINDS.WEIGHT, label: "Weight", unit: "lb" },
  { id: HEALTH_KINDS.STEPS, label: "Steps", unit: "steps" },
  { id: HEALTH_KINDS.SLEEP, label: "Sleep", unit: "hr" },
];

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default function Health() {
  const { user } = useAuth();
  const capability = detectHealthCapability();
  const copy = healthCapabilityCopy(capability);

  const [weights, setWeights] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState(HEALTH_KINDS.WEIGHT);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    const [w, a] = await Promise.all([
      safe(base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 90), []),
      safe(base44.entities.Activity.filter({ created_by: user.email }, "-date", 200), []),
    ]);
    setWeights(w);
    setActivities(a);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const applyRecords = async (records) => {
    const plan = planHealthWrites({
      records,
      existingWeights: weights,
      existingActivities: activities,
    });
    for (const row of plan.weightCreates) {
      await base44.entities.WeightLog.create(row);
    }
    for (const row of plan.weightUpdates) {
      await base44.entities.WeightLog.update(row.id, {
        weight_lbs: row.weight_lbs,
        notes: row.notes,
      });
    }
    for (const row of plan.activityCreates) {
      await base44.entities.Activity.create(row);
    }
    const latestWeight = [...plan.weightCreates, ...plan.weightUpdates]
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    try {
      await base44.auth.updateMe({
        ...(latestWeight ? { weight_lbs: latestWeight.weight_lbs } : {}),
        health_import: {
          last_at: new Date().toISOString(),
          source: "web-import",
          counts: summarizeRecords(records).byKind,
        },
      });
    } catch {
      // metadata is optional
    }
    return plan;
  };

  const handleManual = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a value greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const records = parseHealthText(
        `date,kind,value,unit\n${localToday()},${kind},${n},${kind === "weight" ? "lb" : kind === "sleep" ? "hr" : "count"}`
      );
      const plan = await applyRecords(records);
      const wrote = plan.weightCreates.length + plan.weightUpdates.length + plan.activityCreates.length;
      toast.success(wrote ? "Logged." : "Already on file for today.");
      setValue("");
      await load();
    } catch {
      toast.error("Could not save that sample.");
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That export is larger than 8 MB. Export weight or steps as CSV instead.");
      return;
    }
    try {
      const text = await file.text();
      const records = parseHealthText(text, { filename: file.name });
      setFileName(file.name);
      setPreview({ records, summary: summarizeRecords(records) });
      if (!records.length) {
        toast.error("No weight, steps, sleep, or workouts found in that file.");
      }
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const handleImport = async () => {
    if (!preview?.records?.length) return;
    setImporting(true);
    try {
      const plan = await applyRecords(preview.records);
      const wrote = plan.weightCreates.length + plan.weightUpdates.length + plan.activityCreates.length;
      toast.success(
        wrote
          ? `Imported ${wrote} ${wrote === 1 ? "row" : "rows"}${plan.skipped ? ` · ${plan.skipped} already present` : ""}.`
          : "Everything in that file was already on file."
      );
      setPreview(null);
      setFileName("");
      await load();
    } catch {
      toast.error("Import failed. Try a smaller CSV of one metric.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forgeday-health-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const healthActs = (activities || [])
    .filter(isHealthActivity)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
  const recentWeights = [...weights]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Health</h1>
        <p className="text-sm text-caption mt-0.5">Import and glance — not a live HealthKit feed</p>
      </div>

      <div className="editorial-card p-5 space-y-2">
        <p className="micro-label">What this app can do</p>
        <p className="font-serif text-[18px] font-semibold tracking-tight text-ink leading-tight">
          {copy.headline}
        </p>
        <p className="text-[13px] text-caption leading-relaxed">{copy.body}</p>
      </div>

      <div className="editorial-card p-5 space-y-4">
        <p className="micro-label">Log a sample</p>
        <div className="seg-track">
          {KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`seg-item text-[12px] ${kind === k.id ? "seg-item-active" : ""}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            min="0.1"
            step="0.1"
            aria-label={KINDS.find(k => k.id === kind)?.label}
            placeholder={kind === "weight" ? "e.g. 185.5" : kind === "sleep" ? "e.g. 7.5" : "e.g. 8000"}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleManual()}
          />
          <button
            type="button"
            onClick={handleManual}
            disabled={saving || !value}
            className="shrink-0 min-h-[44px] px-4 rounded-[4px] bg-clay text-clay-fg text-[14px] font-semibold hover:bg-clay-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Log"}
          </button>
        </div>
        <p className="text-[12px] text-caption">
          Saved as {kind === "weight" ? "a weigh-in" : "a Health activity"} for {formatLocalDate(localToday(), "EEEE, MMM d")}.
        </p>
      </div>

      <div className="editorial-card p-5 space-y-4">
        <p className="micro-label">Import a file</p>
        <p className="text-[13px] text-caption leading-relaxed">
          Accepts a Forgeday CSV, a wide Health-style CSV (Date, Weight, Steps, Sleep),
          or a small Apple Health <span className="font-mono text-[12px]">export.xml</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center justify-center min-h-[48px] px-4 rounded-[4px] bg-clay text-clay-fg text-[14px] font-semibold hover:bg-clay-hover cursor-pointer">
            Choose file
            <input
              type="file"
              accept=".csv,.txt,.xml,text/csv,text/xml"
              className="sr-only"
              onChange={handleFile}
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="min-h-[48px] px-4 rounded-[4px] border border-border text-[14px] font-semibold text-ink"
          >
            Sample CSV
          </button>
        </div>

        {preview ? (
          <div className="space-y-3 pt-1">
            <p className="text-[13px] text-ink">
              {fileName || "File"} · {preview.summary.total} {preview.summary.total === 1 ? "row" : "rows"}
              {preview.summary.dateMin ? ` · ${preview.summary.dateMin} to ${preview.summary.dateMax}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Weight", preview.summary.byKind.weight],
                ["Steps", preview.summary.byKind.steps],
                ["Sleep", preview.summary.byKind.sleep],
                ["Workouts", preview.summary.byKind.workout],
              ].map(([label, count]) => (
                <div key={label} className="bg-secondary rounded-[4px] px-3 py-2">
                  <p className="text-[12px] text-caption">{label}</p>
                  <p className="font-mono text-[15px] font-semibold text-ink">{count}</p>
                </div>
              ))}
            </div>
            {preview.records.length === 0 ? (
              <p className="text-[13px] text-caption">Nothing to import from that file.</p>
            ) : (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import into Forgeday"}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {recentWeights.length === 0 && healthActs.length === 0 ? (
        <div className="editorial-card border-dashed px-5 py-8 text-center">
          <p className="text-sm text-caption leading-relaxed">
            No Health samples yet. Log a weigh-in or import a file — empty is honest.
          </p>
        </div>
      ) : (
        <div className="editorial-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="micro-label">On file</p>
          </div>
          {recentWeights.slice(0, 3).map((log, i) => (
            <div key={log.id || log.date} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
              <p className="text-[12px] text-caption">{formatLocalDate(log.date, "EEE, MMM d")}</p>
              <p className="text-[13px] font-semibold font-mono text-ink">{log.weight_lbs} lb</p>
            </div>
          ))}
          {healthActs.map(act => (
            <div key={act.id} className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <p className="text-[12px] text-caption">{formatLocalDate(act.date, "EEE, MMM d")}</p>
              <p className="text-[13px] font-semibold text-ink">{act.title}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-0.5">
        <Link to="/nutrition?tab=weight" className="text-[12px] font-bold uppercase tracking-[0.12em] text-caption min-h-[44px] inline-flex items-center">
          Weight
        </Link>
        <Link to="/settings" className="text-[12px] font-bold uppercase tracking-[0.12em] text-caption min-h-[44px] inline-flex items-center">
          Notifications
        </Link>
      </div>
    </div>
  );
}
