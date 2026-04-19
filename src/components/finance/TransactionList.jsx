import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TransactionList({ transactions, onDeleted }) {
  const handleDelete = async (id) => {
    await base44.entities.Transaction.delete(id);
    toast.success("Deleted");
    onDeleted?.();
  };

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
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
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
          <div className="flex items-center gap-3 shrink-0">
            <span className={cn("font-bold font-mono text-sm", t.type === "income" ? "text-green-500" : "text-destructive")}>
              {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              onClick={() => handleDelete(t.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}