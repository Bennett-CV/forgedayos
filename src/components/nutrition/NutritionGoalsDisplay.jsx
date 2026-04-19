import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils, TrendingUp, Zap, Dumbbell, Pencil, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function NutritionGoalsDisplay({ goals, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    calories: goals?.calories || 0,
    protein_g: goals?.protein_g || 0,
    carbs_g: goals?.carbs_g || 0,
    fat_g: goals?.fat_g || 0
  });

  // Update edit values when goals change
  useEffect(() => {
    if (goals) {
      setEditValues({
        calories: goals.calories,
        protein_g: goals.protein_g,
        carbs_g: goals.carbs_g,
        fat_g: goals.fat_g
      });
    }
  }, [goals]);

  if (!goals || !goals.calories) return null;

  const totalMacros = (goals.protein_g || 0) + (goals.carbs_g || 0) + (goals.fat_g || 0);
  const proteinPct = Math.round(((goals.protein_g || 0) * 4 / goals.calories) * 100);
  const carbsPct = Math.round(((goals.carbs_g || 0) * 4 / goals.calories) * 100);
  const fatPct = Math.round(((goals.fat_g || 0) * 9 / goals.calories) * 100);

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({
        nutrition_goals: {
          calories: editValues.calories,
          protein_g: editValues.protein_g,
          carbs_g: editValues.carbs_g,
          fat_g: editValues.fat_g
        }
      });
      toast.success("Goals updated!");
      setEditing(false);
      if (onEdit) onEdit();
    } catch (error) {
      toast.error("Failed to update goals");
    }
  };

  const handleCancel = () => {
    setEditValues({
      calories: goals.calories,
      protein_g: goals.protein_g,
      carbs_g: goals.carbs_g,
      fat_g: goals.fat_g
    });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Calories Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Daily Calories
              </CardTitle>
              <CardDescription>{editing ? "Edit your target" : "Your personalized target"}</CardDescription>
            </div>
            {!editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-8"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-2">
              <Label htmlFor="edit-calories">Calories</Label>
              <Input
                id="edit-calories"
                type="number"
                value={editValues.calories}
                onChange={(e) => setEditValues({ ...editValues, calories: parseInt(e.target.value) || 0 })}
                className="text-2xl font-bold h-12"
              />
            </div>
          ) : (
            <div className="text-4xl font-bold text-primary">{goals.calories}</div>
          )}
          {!editing && <p className="text-sm text-muted-foreground mt-1">calories per day</p>}
        </CardContent>
      </Card>

      {/* Macros Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Protein */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-muted-foreground">Protein</span>
            </div>
            {editing ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={editValues.protein_g}
                  onChange={(e) => setEditValues({ ...editValues, protein_g: parseInt(e.target.value) || 0 })}
                  className="h-9 text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground">grams</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{goals.protein_g}g</div>
                <div className="text-xs text-muted-foreground">{proteinPct}% of calories</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Carbs */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold text-muted-foreground">Carbs</span>
            </div>
            {editing ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={editValues.carbs_g}
                  onChange={(e) => setEditValues({ ...editValues, carbs_g: parseInt(e.target.value) || 0 })}
                  className="h-9 text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground">grams</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{goals.carbs_g}g</div>
                <div className="text-xs text-muted-foreground">{carbsPct}% of calories</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fat */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold text-muted-foreground">Fat</span>
            </div>
            {editing ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={editValues.fat_g}
                  onChange={(e) => setEditValues({ ...editValues, fat_g: parseInt(e.target.value) || 0 })}
                  className="h-9 text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground">grams</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{goals.fat_g}g</div>
                <div className="text-xs text-muted-foreground">{fatPct}% of calories</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Actions */}
      {editing && (
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Goal Summary */}
      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Based on your profile</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              BMR + activity level + fitness goal
            </p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-primary hover:text-primary/80 font-semibold"
            >
              Edit Goals
            </button>
          )}
        </div>
      </div>
    </div>
  );
}