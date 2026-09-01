import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subDays } from "date-fns";
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

  const today = format(new Date(), "yyyy-MM-dd");

  const load = async () => {
    if (!user?.email) return;
    const data = await base44.entities.WeightLog.filter({ created_by: user.email }, "-date", 90);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const todayLog = logs.find(l => l.date === today);

  const handleSave = async () => {
    if (!weightInput) return;
    setSaving(true);
    if (todayLog) {
      await base44.entities.WeightLog.update(todayLog.id, { weight_lbs: parseFloat(weightInput) });
    } else {
      await base44.entities.WeightLog.create({ date: today, weight_lbs: parseFloat(weightInput) });
    }
    toast.success("Weight logged!");
    setWeightInput("");
    await load();
    setSaving(false);
  };

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const weekAgo = sorted.find(l => l.date <= format(subDays(new Date(), 7), "yyyy-MM-dd") &&
    sorted.indexOf(l) === sorted.filter(x => x.date <= format(subDays(new Date(), 7), "yyyy-MM-dd")).length - 1);
  const monthAgo = sorted.find(l => l.date <= format(subDays(new Date(), 30), "yyyy-MM-dd") &&
    sorted.indexOf(l) === sorted.filter(x => x.date <= format(subDays(new Date(), 30), "yyyy-MM-dd")).length - 1);

  const delta7 = latest && weekAgo ? latest.weight_lbs - weekAgo.weight_lbs : null;
  const delta30 = latest && monthAgo ? latest.weight_lbs - monthAgo.weight_lbs : null;

  const chartData = sorted.slice(-30).map(l => ({
    date: l.date,
    weight: l.weight_lbs,
    label: format(new Date(l.date + "T12:00:00"), "MMM d"),
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
      <div className="editorial-card p-4 space-y-3">
        <p className="micro-label">
          {todayLog ? `Today: ${todayLog.weight_lbs} lbs` : "Log today's weight"}
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder={todayLog ? String(todayLog.weight_lbs) : "e.g. 185.5"}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
          />
          <Button onClick={handleSave} disabled={saving || !weightInput} className="shrink-0 bg-clay text-clay-fg hover:bg-clay-hover">
            {todayLog ? "Update" : "Log"}
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
            {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map((log, i) => (
              <div key={log.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
                <p className="text-[12px] text-caption">{format(new Date(log.date + "T12:00:00"), "EEE, MMM d")}</p>
                <p className="text-[13px] font-semibold font-mono text-ink">{log.weight_lbs} lbs</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
