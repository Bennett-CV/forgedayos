import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WealthSnapshot() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const monthKey = format(new Date(), "yyyy-MM");
    Promise.all([
      base44.entities.Transaction.filter({ month: monthKey }),
      base44.entities.BudgetCategory.filter({ type: "expense" }),
    ]).then(([txns, cats]) => {
      const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalBudgeted = cats.reduce((s, c) => s + c.budget_amount, 0);
      const pct = totalBudgeted > 0 ? Math.min((totalExpenses / totalBudgeted) * 100, 100) : 0;
      setData({ totalExpenses, totalIncome, totalBudgeted, pct });
    });
  }, []);

  if (!data) return null;

  const net = data.totalIncome - data.totalExpenses;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Wealth · This Month</p>
        <Link to="/finance" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
          View <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Income</p>
          <p className="text-base font-black font-mono text-green-500">
            ${data.totalIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Spent</p>
          <p className="text-base font-black font-mono text-destructive">
            ${data.totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Net</p>
          <p className={cn("text-base font-black font-mono", net >= 0 ? "text-primary" : "text-destructive")}>
            {net >= 0 ? "+" : ""}${net.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {data.totalBudgeted > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Budget used</span>
            <span className={data.pct >= 100 ? "text-destructive" : ""}>{data.pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", data.pct >= 100 ? "bg-destructive" : "bg-primary")}
              style={{ width: `${data.pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}