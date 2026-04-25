import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>${p.value?.toFixed(0)}</p>
      ))}
    </div>
  );
}

export default function SpendingTrends() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    loadTrends();
  }, [user]);

  const loadTrends = async () => {
    // Load last 4 months of transactions
    const months = [0, 1, 2, 3].map(i => subMonths(new Date(), i));
    const monthKeys = months.map(m => format(m, "yyyy-MM"));

    const allTxns = await base44.entities.Transaction.filter(
      { created_by: user.email },
      "-date",
      500
    );

    // Monthly totals
    const monthly = monthKeys.reverse().map(key => {
      const txns = allTxns.filter(t => t.month === key);
      const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return {
        month: format(new Date(key + "-01"), "MMM"),
        income: Math.round(income),
        expenses: Math.round(expenses),
      };
    });
    setMonthlyData(monthly);

    // Per-category trends: find categories with consistent overspending (3+ months)
    const expenseTxns = allTxns.filter(t => t.type === "expense" && t.category_name);
    const catMonthMap = {};
    expenseTxns.forEach(t => {
      if (!t.month || !monthKeys.includes(t.month)) return;
      const key = t.category_name;
      if (!catMonthMap[key]) catMonthMap[key] = {};
      catMonthMap[key][t.month] = (catMonthMap[key][t.month] || 0) + t.amount;
    });

    const trends = Object.entries(catMonthMap)
      .map(([cat, byMonth]) => {
        const vals = monthKeys.map(k => byMonth[k] || 0).filter(v => v > 0);
        if (vals.length < 2) return null;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const latest = byMonth[monthKeys[monthKeys.length - 1]] || 0;
        const trend = latest > avg * 1.1 ? "up" : latest < avg * 0.9 ? "down" : "flat";
        const consistent = vals.length >= 3;
        return { cat, avg: Math.round(avg), latest: Math.round(latest), trend, consistent, months: vals.length };
      })
      .filter(Boolean)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    setCategoryTrends(trends);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = monthlyData.some(m => m.expenses > 0 || m.income > 0);

  if (!hasData) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Add transactions for at least 2 months to see trends.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* 4-month bar chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">4-Month Overview</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
            <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-chart-2 inline-block" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-chart-5 inline-block" /> Expenses
          </span>
        </div>
      </div>

      {/* Category trends */}
      {categoryTrends.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Category Trends</p>
          <div className="space-y-3">
            {categoryTrends.map(({ cat, avg, latest, trend, consistent }) => {
              const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
              const color = trend === "up" ? "text-destructive" : trend === "down" ? "text-success" : "text-muted-foreground";
              const warn = trend === "up" && consistent;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${warn ? "bg-destructive/10" : "bg-secondary"}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">{cat}</p>
                      {warn && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">avg ${avg}/mo · this month ${latest}</p>
                  </div>
                  <span className={`text-xs font-bold ${color}`}>
                    {trend === "up" ? "↑ More" : trend === "down" ? "↓ Less" : "Stable"}
                  </span>
                </div>
              );
            })}
          </div>
          {categoryTrends.some(t => t.trend === "up" && t.consistent) && (
            <p className="text-xs text-warning mt-3 flex items-center gap-1.5 pt-3 border-t border-border">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Categories marked with ⚠ have been trending up for 3+ months.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}