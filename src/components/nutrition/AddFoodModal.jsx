import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, ChevronLeft, Clock, PenLine } from "lucide-react";
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

// Scale per100g macros to grams
function scaleMacros(per100g, grams) {
  const s = grams / 100;
  return {
    calories: Math.round(per100g.calories * s),
    protein_g: Math.round(per100g.protein_g * s * 10) / 10,
    carbs_g: Math.round(per100g.carbs_g * s * 10) / 10,
    fat_g: Math.round(per100g.fat_g * s * 10) / 10,
    fiber_g: Math.round(per100g.fiber_g * s * 10) / 10,
    sugar_g: Math.round(per100g.sugar_g * s * 10) / 10,
  };
}

export default function AddFoodModal({ open, onClose, onAdded, defaultMealType, date, recentMeals = [] }) {
  const isMobile = useIsMobile();
  const [mealType, setMealType] = useState(defaultMealType || "breakfast");
  // view: "search" | "amount" | "manual"
  const [view, setView] = useState("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  // servingIndex = index into selected.servings; customGrams used when typing custom amount
  const [servingIndex, setServingIndex] = useState(0);
  const [customGrams, setCustomGrams] = useState("");
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef(null);

  // Manual entry state
  const [manual, setManual] = useState({ name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "", fiber_g: "" });

  useEffect(() => {
    if (open) {
      setMealType(defaultMealType || "breakfast");
      setView("search");
      setQuery("");
      setResults([]);
      setSelected(null);
      setCustomGrams("");
      setManual({ name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "", fiber_g: "" });
    }
  }, [open, defaultMealType]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(query.trim()), 450);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  async function doSearch(q) {
    setSearching(true);
    try {
      const res = await base44.functions.invoke("searchFoodOFF", { query: q });
      setResults(res.data.results || []);
    } catch {
      toast.error("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function pickFood(food) {
    setSelected(food);
    setServingIndex(0);
    setCustomGrams("");
    setView("amount");
  }

  function pickRecent(meal) {
    // Reconstruct a minimal "selected" from a recent meal record
    const per100g = meal.serving_size_g && meal.calories
      ? {
          calories: Math.round((meal.calories / meal.serving_size_g) * 100),
          protein_g: Math.round(((meal.protein_g || 0) / meal.serving_size_g) * 100 * 10) / 10,
          carbs_g: Math.round(((meal.carbs_g || 0) / meal.serving_size_g) * 100 * 10) / 10,
          fat_g: Math.round(((meal.fat_g || 0) / meal.serving_size_g) * 100 * 10) / 10,
          fiber_g: Math.round(((meal.fiber_g || 0) / meal.serving_size_g) * 100 * 10) / 10,
          sugar_g: Math.round(((meal.sugar_g || 0) / meal.serving_size_g) * 100 * 10) / 10,
        }
      : null;

    if (!per100g) {
      // Can't reconstruct, just use the saved values directly as a manual entry
      setManual({
        name: meal.food_name || meal.food_description || "",
        calories: meal.calories || "",
        protein_g: meal.protein_g || "",
        carbs_g: meal.carbs_g || "",
        fat_g: meal.fat_g || "",
        fiber_g: meal.fiber_g || "",
      });
      setView("manual");
      return;
    }

    const servingG = meal.serving_size_g || 100;
    pickFood({
      id: meal.id + "_recent",
      name: meal.food_name || meal.food_description,
      brand: null,
      per100g,
      servings: [
        { label: `${Math.round(servingG)}g (last used)`, grams: servingG },
        { label: "100g", grams: 100 },
      ],
    });
  }

  // Current grams from serving selection or custom
  function currentGrams() {
    if (customGrams && parseFloat(customGrams) > 0) return parseFloat(customGrams);
    if (selected && selected.servings[servingIndex]) return selected.servings[servingIndex].grams;
    return 100;
  }

  const macros = selected ? scaleMacros(selected.per100g, currentGrams()) : null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const mealDate = date || format(new Date(), "yyyy-MM-dd");
    try {
      if (view === "manual") {
        if (!manual.name || !manual.calories) { toast.error("Name and calories are required."); setSaving(false); return; }
        await base44.entities.Meal.create({
          date: mealDate,
          meal_type: mealType,
          food_description: manual.name,
          food_name: manual.name,
          quantity: 1,
          calories: parseFloat(manual.calories) || 0,
          protein_g: parseFloat(manual.protein_g) || 0,
          carbs_g: parseFloat(manual.carbs_g) || 0,
          fat_g: parseFloat(manual.fat_g) || 0,
          fiber_g: parseFloat(manual.fiber_g) || 0,
          serving_size: "custom",
          serving_size_g: null,
        });
      } else {
        if (!selected || !macros) { setSaving(false); return; }
        const grams = currentGrams();
        const servingLabel = customGrams ? `${Math.round(grams)}g (custom)` : selected.servings[servingIndex]?.label || `${Math.round(grams)}g`;
        await base44.entities.Meal.create({
          date: mealDate,
          meal_type: mealType,
          food_description: selected.name,
          food_name: selected.name,
          quantity: 1,
          calories: macros.calories,
          protein_g: macros.protein_g,
          carbs_g: macros.carbs_g,
          fat_g: macros.fat_g,
          fiber_g: macros.fiber_g || null,
          sugar_g: macros.sugar_g || null,
          serving_size: servingLabel,
          serving_size_g: Math.round(grams),
        });
      }
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${mealType}: ${view === "manual" ? manual.name : selected.name}`,
        points: 2,
        date: mealDate,
      });
      toast.success("Food logged!");
      onAdded?.();
      onClose?.();
    } catch {
      toast.error("Failed to save meal.");
    } finally {
      setSaving(false);
    }
  }

  // Deduplicate recents by food_name, most recent first, max 6
  const recentUnique = recentMeals
    .filter(m => m.food_name || m.food_description)
    .reduce((acc, m) => {
      const key = (m.food_name || m.food_description).toLowerCase();
      if (!acc.seen.has(key)) { acc.seen.add(key); acc.list.push(m); }
      return acc;
    }, { seen: new Set(), list: [] })
    .list.slice(0, 6);

  const content = (
    <div className="space-y-4 px-4 pb-6">
      {/* Meal type selector */}
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
                mealType === m ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH VIEW */}
      {view === "search" && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Search Food</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="e.g. Greek yogurt, chicken breast, banana..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="bg-secondary/50 border-border pl-9"
                autoFocus
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {results.map(food => (
                <button
                  key={food.id}
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => pickFood(food)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">{food.name}</p>
                      {food.brand && <p className="text-[10px] text-muted-foreground">{food.brand}</p>}
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {food.per100g.calories} kcal / 100g
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    P {food.per100g.protein_g}g · C {food.per100g.carbs_g}g · F {food.per100g.fat_g}g
                  </p>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No results. Try a simpler term or log manually below.</p>
          )}

          {/* Recents */}
          {recentUnique.length > 0 && results.length === 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent</label>
              </div>
              <div className="space-y-1">
                {recentUnique.map(meal => (
                  <button
                    key={meal.id}
                    type="button"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => pickRecent(meal)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{meal.food_name || meal.food_description}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0">{Math.round(meal.calories || 0)} kcal</p>
                    </div>
                    {meal.serving_size && <p className="text-[10px] text-muted-foreground">{meal.serving_size}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual entry fallback */}
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setView("manual")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[44px]"
          >
            <PenLine className="h-3.5 w-3.5" /> Enter macros manually
          </button>
        </div>
      )}

      {/* AMOUNT / SERVING VIEW */}
      {view === "amount" && selected && (
        <div className="space-y-4">
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { setSelected(null); setView("search"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Search again
          </button>

          {/* Selected food */}
          <div className="px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-semibold text-foreground leading-tight">{selected.name}</p>
            {selected.brand && <p className="text-[10px] text-muted-foreground">{selected.brand} · Open Food Facts</p>}
          </div>

          {/* Serving size picker */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Serving Size</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {selected.servings.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { setServingIndex(i); setCustomGrams(""); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors ${
                    servingIndex === i && !customGrams
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="Custom grams..."
                value={customGrams}
                onChange={e => setCustomGrams(e.target.value)}
                className="bg-secondary/50 border-border w-36 font-mono"
              />
              <span className="text-xs text-muted-foreground">g (custom)</span>
            </div>
          </div>

          {/* Macro preview */}
          {macros && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-[10px] text-muted-foreground mb-3">
                Macros for {customGrams ? `${customGrams}g` : selected.servings[servingIndex]?.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Calories", val: macros.calories, unit: "kcal", color: "text-chart-3" },
                  { label: "Protein", val: macros.protein_g, unit: "g", color: "text-chart-1" },
                  { label: "Carbs", val: macros.carbs_g, unit: "g", color: "text-chart-4" },
                  { label: "Fat", val: macros.fat_g, unit: "g", color: "text-chart-2" },
                  { label: "Fiber", val: macros.fiber_g, unit: "g", color: "text-muted-foreground" },
                  { label: "Sugar", val: macros.sugar_g, unit: "g", color: "text-muted-foreground" },
                ].map(({ label, val, unit, color }) => (
                  <div key={label} className="text-center bg-secondary/50 rounded-lg p-2">
                    <p className={`text-base font-black font-mono ${color}`}>
                      {val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            onPointerDown={e => e.stopPropagation()}
            disabled={saving || (customGrams && parseFloat(customGrams) <= 0)}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save to {mealType}
          </button>
        </div>
      )}

      {/* MANUAL ENTRY VIEW */}
      {view === "manual" && (
        <div className="space-y-3">
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setView("search")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to search
          </button>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Food Name *</label>
            <Input
              placeholder="e.g. Homemade pasta"
              value={manual.name}
              onChange={e => setManual(m => ({ ...m, name: e.target.value }))}
              className="bg-secondary/50 border-border"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "calories", label: "Calories (kcal) *", placeholder: "350" },
              { key: "protein_g", label: "Protein (g)", placeholder: "30" },
              { key: "carbs_g", label: "Carbs (g)", placeholder: "40" },
              { key: "fat_g", label: "Fat (g)", placeholder: "12" },
              { key: "fiber_g", label: "Fiber (g)", placeholder: "3" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">{label}</label>
                <Input
                  type="number"
                  min="0"
                  placeholder={placeholder}
                  value={manual[key]}
                  onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                  className="bg-secondary/50 border-border font-mono"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            onPointerDown={e => e.stopPropagation()}
            disabled={saving || !manual.name || !manual.calories}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save to {mealType}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onClose?.()}>
        <DrawerContent className="bg-card border-border max-h-[92dvh] flex flex-col">
          <DrawerHeader className="px-4 shrink-0">
            <DrawerTitle className="font-black">Log Food</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose?.()}>
      <DialogContent className="bg-card border-border max-w-md p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="font-black">Log Food</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}