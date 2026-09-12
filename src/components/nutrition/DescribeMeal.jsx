import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { localToday, normalizeDateKey } from "@/lib/localDate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MEAL_DESCRIBE_PROMPT,
  draftsAreLoggable,
  mealPayloadFromDraft,
  newFoodDraft,
  parseMealDescription,
} from "@/lib/mealDescribe";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

async function invokeLLM(text) {
  return base44.integrations.Core.InvokeLLM({
    prompt: `${MEAL_DESCRIBE_PROMPT}\n\nMeal: "${text}"`,
    response_json_schema: {
      type: "object",
      properties: {
        foods: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              serving: { type: "string" },
            },
          },
        },
      },
    },
  });
}

async function analyzeFood(text) {
  const res = await base44.functions.invoke("analyzeFoodUSDA", { foodInput: text });
  return res?.data || res;
}

export default function DescribeMeal({ mealType: initialType, date, onLogged, compact }) {
  const [mealType, setMealType] = useState(initialType || "breakfast");
  const [text, setText] = useState("");
  const [foods, setFoods] = useState([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialType) setMealType(initialType);
  }, [initialType]);

  const readMeal = async () => {
    setReading(true);
    const result = await parseMealDescription(text, { invokeLLM, analyzeFood });
    setReading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFoods(result.foods);
  };

  const updateFood = (key, field, value) => {
    setFoods(prev => prev.map(f => (f.key === key ? { ...f, [field]: value } : f)));
  };

  const removeFood = (key) => {
    setFoods(prev => prev.filter(f => f.key !== key));
  };

  const logAll = async () => {
    if (!draftsAreLoggable(foods)) {
      toast.error("Each food needs a name and calories.");
      return;
    }
    setSaving(true);
    const mealDate = normalizeDateKey(date) || localToday();
    const toSave = foods.filter(f => String(f.name || "").trim() && Number(f.calories) > 0);
    try {
      for (const draft of toSave) {
        await base44.entities.Meal.create(mealPayloadFromDraft(draft, { mealType, date: mealDate }));
      }
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${mealType}: ${toSave.map(f => f.name).slice(0, 3).join(", ")}`,
        points: 2,
        date: mealDate,
      });
      toast.success(toSave.length === 1 ? "Food logged" : `${toSave.length} foods logged`);
      setText("");
      setFoods([]);
      onLogged?.();
    } catch {
      toast.error("Could not save those foods.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editorial-card p-4 space-y-3">
      <div>
        <p className="micro-label">Describe this meal</p>
        {!compact && (
          <p className="text-[12px] text-caption mt-1 leading-relaxed">
            Type what you ate. We’ll split it into foods you can edit before logging.
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {MEAL_TYPES.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMealType(m)}
            className={`capitalize text-[11px] font-semibold py-2 rounded-[4px] min-h-[40px] ${
              mealType === m ? "bg-clay text-clay-fg" : "bg-secondary text-caption"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="e.g. 2 eggs, sourdough toast, coffee with oat milk"
        rows={3}
        className="bg-secondary/50 border-border resize-none"
      />

      <Button
        type="button"
        onClick={readMeal}
        disabled={reading || !text.trim()}
        className="w-full min-h-[48px] bg-clay text-clay-fg hover:bg-clay-hover font-semibold"
      >
        {reading ? "Reading meal…" : "Read meal"}
      </Button>
      {foods.length === 0 && (
        <button
          type="button"
          onClick={() => setFoods([newFoodDraft({ name: text.trim() })])}
          className="w-full text-[12px] font-semibold text-caption min-h-[40px]"
        >
          Add one food by hand
        </button>
      )}

      {foods.length > 0 && (
        <div className="space-y-3 pt-1">
          <p className="micro-label">Detected · edit before saving</p>
          {foods.map(food => (
            <div key={food.key} className="rounded-[4px] border border-border p-3 space-y-2">
              <Input
                value={food.name}
                onChange={e => updateFood(food.key, "name", e.target.value)}
                placeholder="Food name"
                className="font-sans"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: "calories", label: "kcal" },
                  { key: "protein_g", label: "P" },
                  { key: "carbs_g", label: "C" },
                  { key: "fat_g", label: "F" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="micro-label mb-1 block">{field.label}</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={food[field.key]}
                      onChange={e => updateFood(food.key, field.key, e.target.value)}
                      className="font-mono h-9 px-2"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeFood(food.key)}
                className="text-[12px] font-semibold text-destructive min-h-[36px]"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFoods(prev => [...prev, newFoodDraft({ name: "" })])}
            className="text-[12px] font-semibold text-ink min-h-[40px]"
          >
            + Add another food
          </button>

          <Button
            type="button"
            onClick={logAll}
            disabled={saving || !draftsAreLoggable(foods)}
            className="w-full min-h-[48px] bg-clay text-clay-fg hover:bg-clay-hover font-semibold"
          >
            {saving ? "Logging…" : `Log ${foods.length} ${foods.length === 1 ? "food" : "foods"}`}
          </Button>
        </div>
      )}
    </div>
  );
}
