import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MealSection({ mealType, meals, onAdd, onEdit, onDeleted, adding, editingId }) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await base44.entities.Meal.delete(id);
      toast.success("Removed");
      setPendingDeleteId(null);
      onDeleted?.(id);
    } catch {
      toast.error("Could not delete meal.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="micro-label">{mealType}</h3>
        <button
          onClick={() => onAdd(mealType)}
          className="text-[12px] font-semibold text-clay min-h-0 min-w-0"
        >
          {adding ? "Adding" : "+ Add"}
        </button>
      </div>

      <div className="editorial-card overflow-hidden">
        {meals.length > 0 ? (
          meals.map((meal, i) => {
            const isEditing = editingId === meal.id;
            const pendingDelete = pendingDeleteId === meal.id;
            return (
              <div
                key={meal.id}
                className={`${i > 0 ? "border-t border-border" : ""} ${isEditing ? "bg-secondary/60" : ""}`}
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDeleteId(null);
                      onEdit?.(meal);
                    }}
                    className="flex-1 min-w-0 min-h-[52px] px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 pr-2">
                        <p className="text-[14px] font-medium text-ink truncate">
                          {meal.food_name || meal.food_description}
                        </p>
                        <p className={`text-[11px] ${isEditing ? "font-semibold text-clay" : "text-caption"}`}>
                          {isEditing
                            ? "Editing"
                            : meal.serving_size && meal.serving_size !== "custom"
                              ? meal.serving_size
                              : "Tap to edit"}
                        </p>
                      </div>
                      <span className="font-mono text-[13px] text-caption shrink-0">
                        {Math.round(meal.calories ?? 0)} kcal
                      </span>
                    </div>
                  </button>
                  {!pendingDelete && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(meal.id)}
                      className="px-3 text-[11px] font-semibold text-destructive shrink-0 self-stretch"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {pendingDelete && (
                  <div className="flex items-center justify-end gap-2 px-4 pb-3">
                    <p className="text-[12px] text-caption mr-auto">Remove this entry?</p>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      disabled={deleting}
                      className="text-[12px] font-semibold text-ink min-h-[40px] px-3 rounded-[4px] border border-border"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(meal.id)}
                      disabled={deleting}
                      className="text-[12px] font-semibold text-destructive-foreground min-h-[40px] px-3 rounded-[4px] bg-destructive"
                    >
                      {deleting ? "Removing…" : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-4 text-[13px] text-caption">Nothing logged yet.</div>
        )}
      </div>
    </div>
  );
}
