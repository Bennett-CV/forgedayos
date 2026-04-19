import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function TransactionRow({ t, onDeleted, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(t.amount));

  const handleDelete = async () => {
    await base44.entities.Transaction.delete(t.id);
    toast.success("Deleted");
    onDeleted?.();
  };

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await base44.entities.Transaction.update(t.id, { amount: parsed });
    toast.success("Updated");
    setEditing(false);
    onUpdated?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setValue(String(t.amount)); setEditing(false); }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0",
          t.type === "income" ? "bg-green-500/15" : "bg-destructive/10"
        )}>
          {t.type === "income" ? "💰" : "💸"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t.description}</p>
          <p className="text-[10px] text-muted-foreground">
            {t.category_name || "Uncategorized"} · {t.date}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <div className="flex items-center gap-1">
              <span className={cn("font-mono text-sm font-bold", t.type === "income" ? "text-green-500" : "text-destructive")}>
                {t.type === "income" ? "+" : "-"}$
              </span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-20 bg-secondary border border-primary rounded-md px-2 py-1 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button onClick={handleSave} className="text-primary hover:text-primary/80 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setValue(String(t.amount)); setEditing(false); }} className="text-muted-foreground hover:text-foreground p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className={cn("font-bold font-mono text-sm hover:underline cursor-pointer", t.type === "income" ? "text-green-500" : "text-destructive")}
              title="Click to edit amount"
            >
              {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
            <button
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, onDeleted }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 rounded-2xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No transactions this month.</p>
        <p className="text-xs text-muted-foreground mt-1">Tap "+ Add" to log one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {transactions.map(t => (
        <TransactionRow key={t.id} t={t} onDeleted={onDeleted} onUpdated={onDeleted} />
      ))}
    </div>
  );
}