import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Scale, TrendingUp, Utensils } from "lucide-react";
import { toast } from "sonner";

export default function GoalSetter({ onComplete }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    weight_lbs: "",
    height_inches: "",
    age: "",
    gender: "",
    activity_level: "",
    fitness_goal: "",
    target_weight_lbs: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        weight_lbs: parseFloat(formData.weight_lbs),
        height_inches: parseFloat(formData.height_inches),
        age: parseInt(formData.age),
        gender: formData.gender,
        activity_level: formData.activity_level,
        fitness_goal: formData.fitness_goal,
        target_weight_lbs: formData.target_weight_lbs ? parseFloat(formData.target_weight_lbs) : undefined
      };

      const response = await base44.functions.invoke("calculateNutritionGoals", payload);
      
      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        toast.success("Goals calculated and saved!");
        queryClient.invalidateQueries({ queryKey: ['user'] });
        onComplete?.(response.data.nutrition_goals);
      }
    } catch (error) {
      toast.error("Failed to calculate goals");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Body Metrics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Body Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Current Weight (lbs)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="180"
              value={formData.weight_lbs}
              onChange={(e) => handleChange("weight_lbs", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (inches)</Label>
            <Input
              id="height"
              type="number"
              placeholder="70"
              value={formData.height_inches}
              onChange={(e) => handleChange("height_inches", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              placeholder="30"
              value={formData.age}
              onChange={(e) => handleChange("age", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Activity & Goals */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Activity & Goals
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity">Activity Level</Label>
            <Select value={formData.activity_level} onValueChange={(v) => handleChange("activity_level", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                <SelectItem value="light">Light (1-3 days/week exercise)</SelectItem>
                <SelectItem value="moderate">Moderate (3-5 days/week exercise)</SelectItem>
                <SelectItem value="active">Active (6-7 days/week exercise)</SelectItem>
                <SelectItem value="very_active">Very Active (physical job + training)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Fitness Goal</Label>
            <Select value={formData.fitness_goal} onValueChange={(v) => handleChange("fitness_goal", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lose_weight">Lose Weight</SelectItem>
                <SelectItem value="maintain">Maintain Weight</SelectItem>
                <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_weight">Target Weight (lbs) - Optional</Label>
            <Input
              id="target_weight"
              type="number"
              placeholder="165"
              value={formData.target_weight_lbs}
              onChange={(e) => handleChange("target_weight_lbs", e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Calculating..." : "Calculate My Goals"}
      </Button>
    </form>
  );
}