import { cn } from "@/lib/utils";

export default function BudgetCategoryBar({ category, spent }) {
  const budget = category.budget_amount || 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">{category.icon || (category.type === "income" ? "💰" : "💸")}</span>
          <span className="font-semibold text-foreground">{category.name}</span>
        </div>
        <div className="text-right">
          <span className={cn("font-bold font-mono text-sm", over ? "text-destructive" : "text-foreground")}>
            ${spent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground text-xs font-mono">
            {" / $"}{budget.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("text-[10px] font-semibold", over ? "text-destructive" : "text-muted-foreground")}>
        {over
          ? `$${Math.abs(remaining).toLocaleString("en-US", { maximumFractionDigits: 0 })} over budget`
          : `$${remaining.toLocaleString("en-US", { maximumFractionDigits: 0 })} remaining`}
      </p>
    </div>
  );
}