import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, TrendingUp, Zap, Dumbbell } from "lucide-react";

export default function NutritionGoalsDisplay({ goals, onEdit }) {
  if (!goals || !goals.calories) return null;

  const totalMacros = (goals.protein_g || 0) + (goals.carbs_g || 0) + (goals.fat_g || 0);
  const proteinPct = Math.round(((goals.protein_g || 0) * 4 / goals.calories) * 100);
  const carbsPct = Math.round(((goals.carbs_g || 0) * 4 / goals.calories) * 100);
  const fatPct = Math.round(((goals.fat_g || 0) * 9 / goals.calories) * 100);

  return (
    <div className="space-y-4">
      {/* Calories Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Daily Calories
          </CardTitle>
          <CardDescription>Your personalized target</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{goals.calories}</div>
          <p className="text-sm text-muted-foreground mt-1">calories per day</p>
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
            <div className="text-2xl font-bold">{goals.protein_g}g</div>
            <div className="text-xs text-muted-foreground">{proteinPct}% of calories</div>
          </CardContent>
        </Card>

        {/* Carbs */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold text-muted-foreground">Carbs</span>
            </div>
            <div className="text-2xl font-bold">{goals.carbs_g}g</div>
            <div className="text-xs text-muted-foreground">{carbsPct}% of calories</div>
          </CardContent>
        </Card>

        {/* Fat */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold text-muted-foreground">Fat</span>
            </div>
            <div className="text-2xl font-bold">{goals.fat_g}g</div>
            <div className="text-xs text-muted-foreground">{fatPct}% of calories</div>
          </CardContent>
        </Card>
      </div>

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