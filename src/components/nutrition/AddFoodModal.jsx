import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function AddFoodModal({ open, onClose, onAdded, defaultMealType, date }) {
  const [foodInput, setFoodInput] = useState("");
  const [mealType, setMealType] = useState(defaultMealType || "breakfast");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!foodInput.trim()) return;
    setAnalyzing(true);
    setPreview(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the following food and return accurate nutritional macros for exactly the quantity described.

Food: "${foodInput}"

Be precise with the quantity given. For example, "1 pound ground beef (80/20)" = ~910 calories, ~81g protein, 0g carbs, 64g fat.
Return a clean food name and all macros rounded to 1 decimal place.`,
      response_json_schema: {
        type: "object",
        properties: {
          food_name: { type: "string" },
          serving_size: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          fiber_g: { type: "number" },
          sugar_g: { type: "number" },
        },
        required: ["food_name", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    });
    setPreview(result);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Log Food</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Meal</label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger className="bg-secondary/50 border-border capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map(m => (
                  <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Food + Quantity</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 1 pound ground beef, 2 eggs, 1 cup oats"
                value={foodInput}
                onChange={e => setFoodInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                className="bg-secondary/50 border-border flex-1"
              />
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !foodInput.trim()}
                variant="outline"
                className="shrink-0"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Press enter or click ✦ to analyze macros</p>
          </div>

          {/* Macro Preview */}
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
                    <p className={`text-base font-black font-mono ${color}`}>{val}{typeof val === "number" ? <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span> : ""}</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview && (
            <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save to {mealType}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}