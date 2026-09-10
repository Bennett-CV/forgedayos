import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";

export default function WealthSnapshot() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    const monthKey = format(new Date(), "yyyy-MM");
    Promise.all([
      base44.entities.Transaction.filter({ month: monthKey, created_by: user.email }),
      base44.entities.BudgetCategory.filter({ type: "expense", created_by: user.email }),
    ]).then(([txns, cats]) => {
      const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalBudgeted = cats.reduce((s, c) => s + c.budget_amount, 0);
      const pct = totalBudgeted > 0 ? Math.min((totalExpenses / totalBudgeted) * 100, 100) : 0;
      const daily = {};
      txns.forEach(t => {
        const key = t.date || monthKey;
        daily[key] = (daily[key] || 0) + (t.type === "income" ? t.amount : -t.amount);
      });
      const spark = Object.keys(daily).sort().map(k => daily[k]);
      setData({ totalExpenses, totalIncome, totalBudgeted, pct, spark });
    });
  }, [user]);

  if (!data) return null;

  const net = data.totalIncome - data.totalExpenses;
  const changePct = data.totalIncome > 0
    ? ((net / data.totalIncome) * 100)
    : 0;
  const bars = (data.spark.length > 0 ? data.spark : [2, 4, 3, 5, 4, 6, 5]).slice(-8);
  const sparkMax = Math.max(1, ...bars.map(v => Math.abs(Number(v) || 0)));

  return (
    <div className="editorial-card p-5 overflow-hidden flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="micro-label">Net Worth</p>
        <p className="mt-1.5 font-serif text-[22px] font-semibold text-ink leading-none">
          ${net.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
        <p className={`mt-2 text-[12px] font-semibold ${net >= 0 ? "text-success" : "text-overbudget"}`}>
          {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% this month
        </p>
      </div>
      <div className="relative h-10 w-[72px] shrink-0 overflow-hidden flex items-end gap-[3px] self-center">
        {bars.map((v, i) => {
          const h = Math.min(40, Math.max(6, Math.round((Math.abs(Number(v) || 0) / sparkMax) * 40)));
          return (
            <div
              key={i}
              className="w-[5px] max-h-full rounded-[1px] bg-pillar-finance shrink-0"
              style={{ height: h, opacity: 0.85 }}
            />
          );
        })}
      </div>
    </div>
  );
}
