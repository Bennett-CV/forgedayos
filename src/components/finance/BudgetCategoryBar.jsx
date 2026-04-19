import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Check, X, Pencil } from "lucide-react";
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
    if (isNaN(parsed) || parsed < 0) { toast.error("Enter a valid amount"); return; }
    await base44.entities.BudgetCategory.update(category.id, { budget_amount: parsed });
    toast.success("Budget updated");
    setEditing(false);
    onUpdated?.();
  };

  const handleCancel = () => {
    setValue(String(category.budget_amount || 0));
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">{category.icon || (category.type === "income" ? "💰" : "💸")}</span>
          <span className="font-semibold text-foreground">{category.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={cn("font-bold font-mono text-sm", over ? "text-destructive" : "text-foreground")}>
            ${spent.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground text-xs"> / </span>

          {editing ? (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs font-mono">$</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-20 bg-secondary border border-primary rounded px-1.5 py-0.5 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ userSelect: "text", WebkitUserSelect: "text" }}
              />
              <button onClick={handleSave} className="text-primary hover:text-primary/80 p-0.5">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 group text-muted-foreground hover:text-foreground transition-colors"
              title="Click to edit budget"
            >
              <span className="font-mono text-xs font-semibold">
                ${budget.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo
              </span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
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