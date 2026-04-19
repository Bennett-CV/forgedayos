import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

const FIELDS = [
  { key: "food_name", label: "Food Name", type: "text" },
  { key: "serving_size", label: "Serving Size", type: "text" },
  { key: "calories", label: "Calories (kcal)", type: "number" },
  { key: "protein_g", label: "Protein (g)", type: "number" },
  { key: "carbs_g", label: "Carbs (g)", type: "number" },
  { key: "fat_g", label: "Fat (g)", type: "number" },
  { key: "fiber_g", label: "Fiber (g)", type: "number" },
  { key: "sugar_g", label: "Sugar (g)", type: "number" },
];

function EditForm({ form, setForm, saving, handleSave }) {
  return (
    <div className="space-y-3 p-1">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, type }) => (
          <div key={key} className={key === "food_name" || key === "serving_size" ? "col-span-2" : ""}>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 block">{label}</label>
            <Input
              type={type}
              value={form[key] ?? ""}
              onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
              className="bg-secondary/50 border-border"
              style={{ userSelect: "text", WebkitUserSelect: "text" }}
            />
          </div>
        ))}
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 min-h-[44px]"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save Changes
      </Button>
    </div>
  );
}

export default function EditMealModal({ open, onClose, onSaved, meal }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (meal) {
      setForm({
        food_name: meal.food_name || "",
        serving_size: meal.serving_size || "",
        calories: meal.calories ?? 0,
        protein_g: meal.protein_g ?? 0,
        carbs_g: meal.carbs_g ?? 0,
        fat_g: meal.fat_g ?? 0,
        fiber_g: meal.fiber_g ?? 0,
        sugar_g: meal.sugar_g ?? 0,
      });
    }
  }, [meal]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Meal.update(meal.id, form);
    toast.success("Meal updated!");
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const formProps = { form, setForm, saving, handleSave };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-black">Edit Meal</DrawerTitle>
          </DrawerHeader>
          <EditForm {...formProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Edit Meal</DialogTitle>
        </DialogHeader>
        <EditForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}