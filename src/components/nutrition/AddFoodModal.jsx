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

function FoodForm({ mealType, setMealType, foodInput, setFoodInput, quantity, setQuantity, analyzing, handleAnalyze, preview, saving, handleSave }) {
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
            onClick={() => handleAnalyze()}
            disabled={analyzing || !foodInput.trim()}
            variant="outline"
            className="shrink-0 min-h-[44px] min-w-[44px]"
            type="button"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Press enter or tap ✦ to analyze macros</p>
      </div>

      {preview && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Quantity</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="How many servings?"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="bg-secondary/50 border-border"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          />
          <p className="text-[10px] text-muted-foreground mt-1">Default is 1 serving ({preview.serving_size})</p>
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{preview.food_name}</p>
            <span className="text-[10px] text-muted-foreground">{preview.serving_size}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Calories", val: Math.round((preview.calories || 0) * (quantity || 1)), unit: "kcal", color: "text-chart-3" },
              { label: "Protein", val: Math.round((preview.protein_g || 0) * (quantity || 1)), unit: "g", color: "text-chart-1" },
              { label: "Carbs", val: Math.round((preview.carbs_g || 0) * (quantity || 1)), unit: "g", color: "text-chart-4" },
              { label: "Fat", val: Math.round((preview.fat_g || 0) * (quantity || 1)), unit: "g", color: "text-chart-2" },
              { label: "Fiber", val: preview.fiber_g ? Math.round(preview.fiber_g * (quantity || 1)) : "—", unit: "g", color: "text-muted-foreground" },
              { label: "Sugar", val: preview.sugar_g ? Math.round(preview.sugar_g * (quantity || 1)) : "—", unit: "g", color: "text-muted-foreground" },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="text-center bg-secondary/50 rounded-lg p-2">
                <p className={`text-base font-black font-mono ${color}`}>
                  {val}{typeof val === "number" ? <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span> : ""}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
              </div>
            ))}
          </div>
          {quantity && quantity !== "1" && (
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Totals for {quantity} serving{quantity !== "1" ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {preview && (
        <Button
          onClick={handleSave}
          disabled={saving || !quantity || quantity === "0"}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
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
  const [quantity, setQuantity] = useState("1");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setMealType(defaultMealType || "breakfast");
      setQuantity("1");
    }
  }, [open, defaultMealType]);

  const handleAnalyze = async () => {
    if (!foodInput.trim()) return;
    setAnalyzing(true);
    setPreview(null);
    try {
      const response = await base44.functions.invoke("analyzeFoodUSDA", { foodInput });
      setPreview(response.data);
    } catch (error) {
      toast.error("Failed to analyze food. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!preview || saving) return;
    const qty = Math.max(0.1, parseFloat(quantity) || 1);
    setSaving(true);
    try {
      const mealDate = date || format(new Date(), "yyyy-MM-dd");
      await base44.entities.Meal.create({
        date: mealDate,
        meal_type: mealType,
        food_description: foodInput,
        quantity: qty,
        calories: (preview.calories || 0) * qty,
        protein_g: (preview.protein_g || 0) * qty,
        carbs_g: (preview.carbs_g || 0) * qty,
        fat_g: (preview.fat_g || 0) * qty,
        fiber_g: preview.fiber_g ? preview.fiber_g * qty : null,
        sugar_g: preview.sugar_g ? preview.sugar_g * qty : null,
        food_name: preview.food_name,
        serving_size: preview.serving_size,
      });

      // Roll up into Activity for dashboard scoring (one per meal logged)
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${mealType}: ${preview.food_name || foodInput}`,
        points: 2,
        date: mealDate,
      });

      toast.success("Food logged!");
      setFoodInput("");
      setPreview(null);
      setQuantity("1");
      onAdded?.();
      onClose?.();
    } catch (error) {
      toast.error("Failed to save meal. Please try again.");
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFoodInput("");
    setPreview(null);
    setQuantity("1");
    onClose?.();
  };

  const formProps = { mealType, setMealType, foodInput, setFoodInput, quantity, setQuantity, analyzing, handleAnalyze, preview, saving, handleSave };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && handleClose()}>
        <DrawerContent className="bg-card border-border px-4 pb-6 max-h-[85vh] flex flex-col">
          <DrawerHeader className="px-0 shrink-0">
            <DrawerTitle className="font-black">Log Food</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <FoodForm {...formProps} />
          </div>
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