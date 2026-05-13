import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// Common unit options with gram conversions
const UNITS = [
  { label: "g", toGrams: (v) => v },
  { label: "oz", toGrams: (v) => v * 28.35 },
  { label: "lbs", toGrams: (v) => v * 453.6 },
  { label: "cup", toGrams: null }, // requires context — kept for labeling
  { label: "serving (100g)", toGrams: () => 100 },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

export default function AddFoodModal({ open, onClose, onAdded, defaultMealType, date }) {
  const [mealType, setMealType] = useState(defaultMealType || "breakfast");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // the picked USDA food (per100g data)
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState("g");
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (open) {
      setMealType(defaultMealType || "breakfast");
    }
  }, [open, defaultMealType]);

  function resetAll() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setAmount("100");
    setUnit("g");
  }

  function handleClose() {
    resetAll();
    onClose?.();
  }

  // Auto-search with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(query.trim());
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  async function doSearch(q) {
    setSearching(true);
    try {
      const res = await base44.functions.invoke("searchFoodUSDA", { query: q });
      setResults(res.data.results || []);
    } catch {
      toast.error("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function toGrams(amountVal, unitLabel) {
    const val = parseFloat(amountVal) || 0;
    const unitDef = UNITS.find(u => u.label === unitLabel);
    if (unitDef?.toGrams) return unitDef.toGrams(val);
    // For "cup" — just treat as grams (user should use g/oz for best accuracy)
    return val;
  }

  function computedMacros() {
    if (!selected) return null;
    const grams = toGrams(amount, unit);
    const scale = grams / 100;
    const p = selected.per100g;
    return {
      calories: Math.round(p.calories * scale),
      protein_g: Math.round(p.protein_g * scale * 10) / 10,
      carbs_g: Math.round(p.carbs_g * scale * 10) / 10,
      fat_g: Math.round(p.fat_g * scale * 10) / 10,
      fiber_g: Math.round(p.fiber_g * scale * 10) / 10,
      sugar_g: Math.round(p.sugar_g * scale * 10) / 10,
    };
  }

  async function handleSave() {
    if (!selected || saving) return;
    const macros = computedMacros();
    setSaving(true);
    try {
      const mealDate = date || format(new Date(), "yyyy-MM-dd");
      const grams = toGrams(amount, unit);
      await base44.entities.Meal.create({
        date: mealDate,
        meal_type: mealType,
        food_description: `${amount}${unit} ${selected.description}`,
        quantity: 1,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g || null,
        sugar_g: macros.sugar_g || null,
        food_name: selected.description,
        serving_size: `${Math.round(grams)}g`,
      });
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${mealType}: ${selected.description}`,
        points: 2,
        date: mealDate,
      });
      toast.success("Food logged!");
      resetAll();
      onAdded?.();
      onClose?.();
    } catch {
      toast.error("Failed to save meal.");
    } finally {
      setSaving(false);
    }
  }

  const isMobile = useIsMobile();
  const macros = computedMacros();

  const content = (
    <div className="space-y-4 px-4 pb-6">
      {/* Meal type */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Meal</label>
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map(m => (
            <button
              key={m}
              type="button"
              onPointerDown={e => e.stopPropagation()}
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

      {/* Step 1: Search */}
      {!selected && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
            Search Food
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="e.g. chicken breast, ground beef, oats..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-secondary/50 border-border pl-9"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results list */}
          {results.length > 0 && (
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {results.map(food => (
                <button
                  key={food.fdcId}
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { setSelected(food); setAmount("100"); setUnit("g"); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-border"
                >
                  <p className="text-sm font-medium text-foreground leading-tight">{food.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    per 100g — {Math.round(food.per100g.calories)} kcal · {Math.round(food.per100g.protein_g)}g protein · {Math.round(food.per100g.carbs_g)}g carbs · {Math.round(food.per100g.fat_g)}g fat
                  </p>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center py-4">No results found. Try a different search term.</p>
          )}
        </div>
      )}

      {/* Step 2: Amount + macros preview */}
      {selected && (
        <>
          {/* Back + food name */}
          <div>
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 min-h-[44px]"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Search again
            </button>
            <div className="px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-semibold text-foreground leading-tight">{selected.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">USDA · {selected.dataType}</p>
            </div>
          </div>

          {/* Amount + unit */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
              Amount
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="bg-secondary/50 border-border w-28 font-mono"
                placeholder="100"
              />
              <div className="flex gap-1 flex-wrap">
                {UNITS.map(u => (
                  <button
                    key={u.label}
                    type="button"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => setUnit(u.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors ${
                      unit === u.label
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Macro preview */}
          {macros && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground">
                Based on {amount}{unit} ({Math.round(toGrams(amount, unit))}g)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Calories", val: macros.calories, unit: "kcal", color: "text-chart-3" },
                  { label: "Protein", val: macros.protein_g, unit: "g", color: "text-chart-1" },
                  { label: "Carbs", val: macros.carbs_g, unit: "g", color: "text-chart-4" },
                  { label: "Fat", val: macros.fat_g, unit: "g", color: "text-chart-2" },
                  { label: "Fiber", val: macros.fiber_g || "—", unit: "g", color: "text-muted-foreground" },
                  { label: "Sugar", val: macros.sugar_g || "—", unit: "g", color: "text-muted-foreground" },
                ].map(({ label, val, unit: u, color }) => (
                  <div key={label} className="text-center bg-secondary/50 rounded-lg p-2">
                    <p className={`text-base font-black font-mono ${color}`}>
                      {typeof val === "number"
                        ? <>{val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{u}</span></>
                        : val}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            onPointerDown={e => e.stopPropagation()}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save to {mealType}
          </button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && handleClose()}>
        <DrawerContent className="bg-card border-border max-h-[92dvh] flex flex-col">
          <DrawerHeader className="px-4 shrink-0">
            <DrawerTitle className="font-black">Log Food</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="font-black">Log Food</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}