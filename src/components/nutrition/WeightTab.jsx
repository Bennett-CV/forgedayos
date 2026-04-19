import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="font-bold text-foreground">{payload[0].value} lbs</p>
      <p className="text-muted-foreground">{payload[0].payload.label}</p>
    </div>
  );
};

export default function WeightTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const load = async () => {
    const data = await base44.entities.WeightLog.list("-date", 90);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  // Stats
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
      <div className="bg-secondary/50 rounded-xl p-3 text-center">
        <p className="text-lg font-black text-muted-foreground">—</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      </div>
    );
    const Icon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
    const color = delta < 0 ? "text-success" : delta > 0 ? "text-destructive" : "text-muted-foreground";
    return (
      <div className="bg-secondary/50 rounded-xl p-3 text-center">
        <div className={`flex items-center justify-center gap-1 font-black font-mono text-lg ${color}`}>
          <Icon className="h-4 w-4" />
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
        </div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Log Weight */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {todayLog ? `Today's weight: ${todayLog.weight_lbs} lbs — update?` : "Log today's weight"}
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder={todayLog ? String(todayLog.weight_lbs) : "e.g. 185.5"}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="bg-secondary/50 border-border font-mono"
          />
          <Button onClick={handleSave} disabled={saving || !weightInput} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            {todayLog ? "Update" : "Log"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <p className="text-lg font-black font-mono text-primary">{latest.weight_lbs}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Current (lbs)</p>
          </div>
          <DeltaBadge delta={delta7} label="7-day" />
          <DeltaBadge delta={delta30} label="30-day" />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Last 30 Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No weight logged yet. Start tracking above.</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Log at least 2 entries to see your trend chart.</p>
      )}

      {/* Log History */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">History</p>
          </div>
          <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
            {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-xs text-muted-foreground">{format(new Date(log.date + "T12:00:00"), "EEE, MMM d")}</p>
                <p className="text-sm font-bold font-mono text-foreground">{log.weight_lbs} lbs</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}