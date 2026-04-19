import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function TransactionForm({ categories, onSave, saving }) {
  const [type, setType] = useState("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const filtered = categories.filter(c => c.type === type);

  const handleSubmit = () => {
    if (!description.trim() || !amount || isNaN(Number(amount))) return;
    const cat = categories.find(c => c.id === categoryId);
    onSave({
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category_id: categoryId || null,
      category_name: cat?.name || null,
      month: date.slice(0, 7),
    });
  };

  return (
    <div className="space-y-4 p-1">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-1.5">
        {["expense", "income"].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setCategoryId(""); }}
            className={`capitalize text-sm font-bold py-3 rounded-xl transition-colors min-h-[44px] ${
              type === t
                ? t === "expense" ? "bg-destructive/20 text-destructive" : "bg-success/20 text-green-500"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {t === "expense" ? "💸 Expense" : "💰 Income"}
          </button>
        ))}
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Description</label>
        <Input
          placeholder="e.g. Grocery run, Paycheck"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="bg-secondary/50 border-border"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>

      {/* Amount */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Amount ($)</label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-secondary/50 border-border font-mono"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>

      {/* Category */}
      {filtered.length > 0 && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Category</label>
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id === categoryId ? "" : c.id)}
                className={`text-xs font-semibold py-2.5 px-3 rounded-lg text-left transition-colors min-h-[44px] flex items-center gap-2 ${
                  categoryId === c.id ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                <span>{c.icon || "📦"}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Date</label>
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-secondary/50 border-border"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={saving || !description.trim() || !amount}
        className="w-full font-bold gap-2 min-h-[44px]"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save Transaction
      </Button>
    </div>
  );
}

export default function AddTransactionDrawer({ open, onClose, onAdded, categories }) {
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  const handleSave = async (data) => {
    setSaving(true);
    await base44.entities.Transaction.create(data);
    toast.success("Transaction saved!");
    setSaving(false);
    onAdded?.();
    onClose?.();
  };

  const formProps = { categories, onSave: handleSave, saving };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-black">Add Transaction</DrawerTitle>
          </DrawerHeader>
          <TransactionForm {...formProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Add Transaction</DialogTitle>
        </DialogHeader>
        <TransactionForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}