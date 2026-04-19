import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function FoodForm({ mealType, setMealType, foodInput, setFoodInput, analyzing, handleAnalyze, preview, saving, handleSave }) {
  return (
    <div className="space-y-4 p-1">
      {/* Meal type — native button group instead of Select for mobile */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Meal</label>
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMealType(m)}
              className={`capitalize text-xs font-semibold py-2.5 rounded-lg transition-colors min-h-[44px] ${
                mealType === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Food + Quantity</label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 1 pound ground beef, 2 eggs"
            value={foodInput}
            onChange={e => setFoodInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAnalyze()}
            className="bg-secondary/50 border-border flex-1"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          />
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !foodInput.trim()}
            variant="outline"
            className="shrink-0 min-h-[44px] min-w-[44px]"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Press enter or tap ✦ to analyze macros</p>
      </div>

      {preview && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{preview.food_name}</p>
            <span className="text-[10px] text-muted-foreground">{preview.serving_size}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Calories", val: preview.calories, unit: "kcal", color: "text-chart-3" },
              { label: "Protein", val: preview.protein_g, unit: "g", color: "text-chart-1" },
              { label: "Carbs", val: preview.carbs_g, unit: "g", color: "text-chart-4" },
              { label: "Fat", val: preview.fat_g, unit: "g", color: "text-chart-2" },
              { label: "Fiber", val: preview.fiber_g ?? "—", unit: "g", color: "text-muted-foreground" },
              { label: "Sugar", val: preview.sugar_g ?? "—", unit: "g", color: "text-muted-foreground" },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="text-center bg-secondary/50 rounded-lg p-2">
                <p className={`text-base font-black font-mono ${color}`}>
                  {val}{typeof val === "number" ? <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span> : ""}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 min-h-[44px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save to {mealType}
        </Button>
      )}
    </div>
  );
}

export default function AddFoodModal({ open, onClose, onAdded, defaultMealType, date }) {
  const [foodInput, setFoodInput] = useState("");
  const [mealType, setMealType] = useState(defaultMealType || "breakfast");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) setMealType(defaultMealType || "breakfast");
  }, [open, defaultMealType]);

  const handleAnalyze = async () => {
    if (!foodInput.trim()) return;
    setAnalyzing(true);
    setPreview(null);
    const response = await base44.functions.invoke("analyzeFoodUSDA", { foodInput });
    setPreview(response.data);
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    await base44.entities.Meal.create({
      date: date || format(new Date(), "yyyy-MM-dd"),
      meal_type: mealType,
      food_description: foodInput,
      ...preview,
    });
    toast.success("Food logged!");
    setSaving(false);
    setFoodInput("");
    setPreview(null);
    onAdded?.();
    onClose?.();
  };

  const handleClose = () => {
    setFoodInput("");
    setPreview(null);
    onClose?.();
  };

  const formProps = { mealType, setMealType, foodInput, setFoodInput, analyzing, handleAnalyze, preview, saving, handleSave };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && handleClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-black">Log Food</DrawerTitle>
          </DrawerHeader>
          <FoodForm {...formProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Log Food</DialogTitle>
        </DialogHeader>
        <FoodForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}