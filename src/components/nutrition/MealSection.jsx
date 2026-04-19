import { useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import EditMealModal from "./EditMealModal";

const MEAL_COLORS = {
  breakfast: { bg: "bg-chart-3/10", text: "text-chart-3", border: "border-chart-3/30" },
  lunch: { bg: "bg-chart-2/10", text: "text-chart-2", border: "border-chart-2/30" },
  dinner: { bg: "bg-chart-1/10", text: "text-chart-1", border: "border-chart-1/30" },
  snack: { bg: "bg-chart-4/10", text: "text-chart-4", border: "border-chart-4/30" },
};

export default function MealSection({ mealType, meals, onAdd, onDeleted }) {
  const [editingMeal, setEditingMeal] = useState(null);
  const c = MEAL_COLORS[mealType] || MEAL_COLORS.snack;
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const handleDelete = async (id) => {
    await base44.entities.Meal.delete(id);
    toast.success("Removed");
    onDeleted?.();
  };

  return (
    <div className={`rounded-2xl border ${c.border} bg-card overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3 ${c.bg}`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${c.text}`}>{mealType}</h3>
        <div className="flex items-center gap-3">
          {meals.length > 0 && (
            <span className={`text-xs font-mono font-bold ${c.text}`}>
              {Math.round(totals.calories)} kcal · {totals.protein_g.toFixed(0)}g P · {totals.carbs_g.toFixed(0)}g C · {totals.fat_g.toFixed(0)}g F
            </span>
          )}
          <button
            onClick={() => onAdd(mealType)}
            className={`flex items-center gap-1 text-xs font-semibold ${c.text} hover:opacity-70 transition-opacity`}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Foods table */}
      {meals.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground px-5 py-2 font-bold">Food</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">Cal</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">Protein</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">Carbs</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">Fat</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">Fiber</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {meals.map((meal) => (
                <tr key={meal.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-foreground">{meal.food_name || meal.food_description}</p>
                    {meal.serving_size && <p className="text-[10px] text-muted-foreground">{meal.serving_size}</p>}
                  </td>
                  <td className="text-center px-3 py-2.5 font-mono font-bold text-chart-3">{Math.round(meal.calories ?? 0)}</td>
                  <td className="text-center px-3 py-2.5 font-mono text-foreground">{(meal.protein_g ?? 0).toFixed(1)}g</td>
                  <td className="text-center px-3 py-2.5 font-mono text-foreground">{(meal.carbs_g ?? 0).toFixed(1)}g</td>
                  <td className="text-center px-3 py-2.5 font-mono text-foreground">{(meal.fat_g ?? 0).toFixed(1)}g</td>
                  <td className="text-center px-3 py-2.5 font-mono text-muted-foreground">{(meal.fiber_g ?? 0).toFixed(1)}g</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingMeal(meal)} className="p-1 rounded hover:bg-secondary transition-colors">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button onClick={() => handleDelete(meal.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-4 text-xs text-muted-foreground">Nothing logged yet.</div>
      )}

      <EditMealModal
        open={!!editingMeal}
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaved={() => { setEditingMeal(null); onDeleted?.(); }}
      />
    </div>
  );
}