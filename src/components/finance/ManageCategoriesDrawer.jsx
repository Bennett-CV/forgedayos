import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["🏠","🚗","🛒","🍔","💊","🎮","👕","✈️","📱","💡","🎓","💰","💼","📈","🏋️","🎵"];

function useIsMobile() {
  const [mobile] = useState(() => window.innerWidth < 1024);
  return mobile;
}

function CategoryForm({ onAdded }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [budget, setBudget] = useState("");
  const [icon, setIcon] = useState("📦");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !budget) return;
    setSaving(true);
    await base44.entities.BudgetCategory.create({
      name: name.trim(),
      type,
      budget_amount: parseFloat(budget),
      icon,
    });
    toast.success("Category added!");
    setName(""); setBudget(""); setIcon("📦");
    setSaving(false);
    onAdded?.();
  };

  return (
    <div className="space-y-3 border border-border rounded-xl p-4 bg-secondary/20">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Category</p>

      <div className="grid grid-cols-2 gap-1.5">
        {["expense", "income"].map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`capitalize text-xs font-bold py-2.5 rounded-lg min-h-[44px] transition-colors ${
              type === t ? t === "expense" ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-500" : "bg-secondary/50 text-muted-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input placeholder="Category name" value={name} onChange={e => setName(e.target.value)}
          className="bg-secondary/50 border-border flex-1" style={{ userSelect: "text", WebkitUserSelect: "text" }} />
        <Input type="number" placeholder="Budget $" value={budget} onChange={e => setBudget(e.target.value)}
          className="bg-secondary/50 border-border w-28 font-mono" style={{ userSelect: "text", WebkitUserSelect: "text" }} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => setIcon(e)}
            className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${icon === e ? "bg-primary/20" : "hover:bg-secondary"}`}>
            {e}
          </button>
        ))}
      </div>

      <Button onClick={handleAdd} disabled={saving || !name.trim() || !budget} className="w-full gap-2 min-h-[44px]">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add Category
      </Button>
    </div>
  );
}

function CategoryRow({ c, onDelete, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(c.budget_amount || 0));

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) { toast.error("Enter a valid amount"); return; }
    await base44.entities.BudgetCategory.update(c.id, { budget_amount: parsed });
    toast.success("Budget updated");
    setEditing(false);
    onChanged?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setValue(String(c.budget_amount || 0)); setEditing(false); }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-card">
      <div className="flex items-center gap-3">
        <span className="text-lg">{c.icon || "📦"}</span>
        <div>
          <p className="text-sm font-semibold">{c.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {c.type} · $
            {editing ? (
              <input
                autoFocus
                type="number"
                min="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="inline w-20 bg-secondary border border-primary rounded px-1 py-0 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ userSelect: "text", WebkitUserSelect: "text" }}
              />
            ) : (
              <button onClick={() => setEditing(true)} className="hover:text-primary hover:underline transition-colors font-mono">
                {c.budget_amount?.toLocaleString()}
              </button>
            )}
            /mo
          </p>
        </div>
      </div>
      <button onClick={() => onDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ManageCategoriesDrawer({ open, onClose, categories, onChanged }) {
  const isMobile = useIsMobile();

  const handleDelete = async (id) => {
    await base44.entities.BudgetCategory.delete(id);
    toast.success("Deleted");
    onChanged?.();
  };

  const content = (
    <div className="space-y-4 pb-2">
      <CategoryForm onAdded={onChanged} />
      <div className="space-y-2">
        {categories.map(c => (
          <CategoryRow key={c.id} c={c} onDelete={handleDelete} onChanged={onChanged} />
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Add one above.</p>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-6 max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="px-0"><DrawerTitle className="font-black">Budget Categories</DrawerTitle></DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-black">Budget Categories</DialogTitle></DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}