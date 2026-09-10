import { cn } from "@/lib/utils";

export default function MonthlyOverview({ totalIncome, totalExpenses, totalBudgeted }) {
  const net = totalIncome - totalExpenses;
  const budgetUsedPct = totalBudgeted > 0 ? Math.min((totalExpenses / totalBudgeted) * 100, 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="editorial-card p-4">
        <p className="micro-label mb-1">Income</p>
        <p className="text-[18px] font-semibold font-mono text-success">
          ${totalIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="editorial-card p-4">
        <p className="micro-label mb-1">Expenses</p>
        <p className="text-[18px] font-semibold font-mono text-overbudget">
          ${totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="editorial-card p-4">
        <p className="micro-label mb-1">Net</p>
        <p className={cn("text-[18px] font-semibold font-mono", net >= 0 ? "text-clay" : "text-overbudget")}>
          {net >= 0 ? "+" : ""}${net.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
      </div>

      {totalBudgeted > 0 && (
        <div className="col-span-3 editorial-card p-4 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Budget Used</span>
            <span className={budgetUsedPct >= 100 ? "text-destructive" : "text-foreground"}>
              {budgetUsedPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-[4px] bg-track rounded-[2px] overflow-hidden">
            <div
              className={cn("h-full rounded-[2px] transition-all duration-500", budgetUsedPct >= 100 ? "bg-overbudget" : "bg-clay")}
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            ${totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} of ${totalBudgeted.toLocaleString("en-US", { maximumFractionDigits: 0 })} budgeted
          </p>
        </div>
      )}
    </div>
  );
}