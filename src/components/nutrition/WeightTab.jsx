import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatLocalDate, localToday, localDaysAgoKey, normalizeDateKey } from "@/lib/localDate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-[4px] px-3 py-2 text-xs">
      <p className="font-semibold font-mono text-ink">{payload[0].value} lbs</p>
      <p className="text-caption">{payload[0].payload.label}</p>
    </div>
  );
};

export default function WeightTab() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const today = localToday();

  const load = async () => {
    if (!user?.email) { setLoading(false); return; }
    try {
      const data = await base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 90);
      setLogs(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const todayLog = logs.find(l => normalizeDateKey(l.date) === today);

  const handleSave = async () => {
    if (saving || loadError || !user?.email) return;
    const weight = Number(weightInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Enter a weight greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const saveDate = localToday();
      const existingLog = logs.find(log => normalizeDateKey(log.date) === saveDate);
      if (existingLog) {
        await base44.entities.WeightLog.update(existingLog.id, { weight_lbs: weight });
      } else {
        await base44.entities.WeightLog.create({ date: saveDate, weight_lbs: weight });
      }
      toast.success("Weight logged!");
      setWeightInput("");
      await load();
    } catch {
      toast.error("Couldn't save your weight. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await base44.entities.WeightLog.delete(id);
      toast.success("Removed");
      setPendingDeleteId(null);
      await load();
    } catch {
      toast.error("Could not delete weight entry.");
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...logs].sort((a, b) => normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date)));
  const latest = sorted[sorted.length - 1];
  const weekCutoff = localDaysAgoKey(7);
  const monthCutoff = localDaysAgoKey(30);
  const weekAgo = [...sorted].reverse().find(l => normalizeDateKey(l.date) <= weekCutoff);
  const monthAgo = [...sorted].reverse().find(l => normalizeDateKey(l.date) <= monthCutoff);

  const delta7 = latest && weekAgo ? latest.weight_lbs - weekAgo.weight_lbs : null;
  const delta30 = latest && monthAgo ? latest.weight_lbs - monthAgo.weight_lbs : null;

  const chartData = sorted.slice(-30).map(l => ({
    date: normalizeDateKey(l.date),
    weight: l.weight_lbs,
    label: formatLocalDate(l.date, "MMM d"),
  }));

  const DeltaBadge = ({ delta, label }) => {
    if (delta === null) return (
      <div className="bg-secondary rounded-[4px] p-3 text-center">
        <p className="font-mono text-[16px] font-semibold text-caption">—</p>
        <p className="micro-label mt-1">{label}</p>
      </div>
    );
    const color = delta < 0 ? "text-success" : delta > 0 ? "text-overbudget" : "text-caption";
    return (
      <div className="bg-secondary rounded-[4px] p-3 text-center">
        <p className={`font-mono text-[16px] font-semibold ${color}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
        </p>
        <p className="micro-label mt-1">{label}</p>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-4 border-border border-t-clay rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {loadError && (
        <div role="alert" className="editorial-card p-4 text-sm text-caption">
          <p>Couldn't load your weight history. Retry before logging to avoid duplicate entries.</p>
          <Button variant="outline" onClick={load} className="mt-2">Retry</Button>
        </div>
      )}
      <div className="editorial-card p-4 space-y-3">
        <p className="micro-label">
          {todayLog ? `Today: ${todayLog.weight_lbs} lbs` : "Log today's weight"}
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            aria-label="Weight in pounds"
            min="0.1"
            step="0.1"
            placeholder={todayLog ? String(todayLog.weight_lbs) : "e.g. 185.5"}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
          />
          <Button onClick={handleSave} disabled={saving || loadError || !user?.email || !weightInput} className="shrink-0 bg-clay text-clay-fg hover:bg-clay-hover">
            {saving ? "Saving…" : todayLog ? "Update" : "Log"}
          </Button>
        </div>
      </div>

      {latest && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary rounded-[4px] p-3 text-center">
            <p className="font-mono text-[16px] font-semibold text-ink">{latest.weight_lbs}</p>
            <p className="micro-label mt-1">Current</p>
          </div>
          <DeltaBadge delta={delta7} label="7-day" />
          <DeltaBadge delta={delta30} label="30-day" />
        </div>
      )}

      {chartData.length > 1 ? (
        <div className="editorial-card p-4">
          <p className="micro-label mb-4">Last 30 Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(var(--caption))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "oklch(var(--caption))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="oklch(var(--clay))"
                strokeWidth={2}
                dot={{ fill: "oklch(var(--clay))", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 editorial-card border-dashed">
          <p className="text-sm text-caption">No weight logged yet.</p>
        </div>
      ) : (
        <p className="text-xs text-caption text-center py-4">Log at least 2 entries to see the trend.</p>
      )}

      {logs.length > 0 && (
        <div className="editorial-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="micro-label">History</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {[...logs].sort((a, b) => normalizeDateKey(b.date).localeCompare(normalizeDateKey(a.date))).map((log, i) => {
              const pendingDelete = pendingDeleteId === log.id;
              return (
                <div key={log.id} className={`${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <p className="text-[12px] text-caption">{formatLocalDate(log.date, "EEE, MMM d")}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[13px] font-semibold font-mono text-ink">{log.weight_lbs} lbs</p>
                      {!pendingDelete && (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(log.id)}
                          className="text-[11px] font-semibold text-destructive min-h-0 min-w-0"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {pendingDelete && (
                    <div className="flex items-center justify-end gap-2 px-4 pb-3">
                      <p className="text-[12px] text-caption mr-auto">Remove this entry?</p>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        disabled={deleting}
                        className="text-[12px] font-semibold text-ink min-h-[40px] px-3 rounded-[4px] border border-border"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        disabled={deleting}
                        className="text-[12px] font-semibold text-destructive-foreground min-h-[40px] px-3 rounded-[4px] bg-destructive"
                      >
                        {deleting ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
