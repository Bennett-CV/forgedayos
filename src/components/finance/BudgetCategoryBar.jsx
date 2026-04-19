import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BudgetCategoryBar({ category, spent, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(category.budget_amount || 0));

  const budget = category.budget_amount || 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await base44.entities.BudgetCategory.update(category.id, { budget_amount: parsed });
    toast.success("Budget updated");
    setEditing(false);
    onUpdated?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setValue(String(category.budget_amount || 0)); setEditing(false); }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">{category.icon || (category.type === "income" ? "💰" : "💸")}</span>
          <span className="font-semibold text-foreground">{category.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("font-bold font-mono text-sm", over ? "text-destructive" : "text-foreground")}>
            ${spent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground text-xs font-mono"> / $</span>
          {editing ? (
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-20 bg-secondary border border-primary rounded px-1.5 py-0.5 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground text-xs font-mono hover:text-primary hover:underline transition-colors"
              title="Click to edit budget"
            >
              {budget.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </button>
          )}
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