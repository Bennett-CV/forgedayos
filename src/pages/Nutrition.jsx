import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import AddFoodForm from "../components/nutrition/AddFoodForm";
import MealSection from "../components/nutrition/MealSection";
import DailyMacroSummary from "../components/nutrition/DailyMacroSummary";
import WeightTab from "../components/nutrition/WeightTab.jsx";
import GoalSetter from "../components/nutrition/GoalSetter";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

function addParamToMeal(add) {
  if (!add) return null;
  if (MEAL_ORDER.includes(add)) return add;
  if (add === "1" || add === "true" || add === "meal") return "breakfast";
  return null;
}

export default function Nutrition() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("nutrition");
  const [dateOffset, setDateOffset] = useState(0);
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingType, setAddingType] = useState(() => addParamToMeal(searchParams.get("add")));
  const [showGoals, setShowGoals] = useState(false);

  const currentDate = format(subDays(new Date(), dateOffset), "yyyy-MM-dd");
  const displayDate = format(subDays(new Date(), dateOffset), "EEEE, MMMM d");

  const load = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const [data, me] = await Promise.all([
        base44.entities.Meal.filter({ created_by: user.email }, "-created_date", 500),
        base44.auth.me(),
      ]);
      setMeals(data);
      setGoals(me?.nutrition_goals || null);
    } catch {
      // best-effort
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const next = addParamToMeal(searchParams.get("add"));
    if (next) {
      setActiveTab("nutrition");
      setAddingType(next);
    }
  }, [searchParams]);

  const dayMeals = meals.filter(m => m.date === currentDate);

  const handleAdd = (mealType) => {
    setActiveTab("nutrition");
    setAddingType(mealType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Nutrition</h1>
        <button
          onClick={() => setShowGoals(g => !g)}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-caption min-h-0"
        >
          {showGoals ? "Hide goals" : "Goals"}
        </button>
      </div>

      {showGoals && (
        <div className="editorial-card p-4">
          <GoalSetter onComplete={(data) => {
            if (data) {
              setGoals(data.goals);
              setMeals(data.meals);
            }
            setShowGoals(false);
          }} />
        </div>
      )}

      <div className="seg-track">
        {[
          { id: "nutrition", label: "Food & Macros" },
          { id: "weight", label: "Weight" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`seg-item ${activeTab === tab.id ? "seg-item-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "nutrition" && (
        <>
          <div className="flex items-center justify-between editorial-card px-3 py-2">
            <button onClick={() => setDateOffset(o => o + 1)} className="text-[13px] font-semibold text-caption min-w-[44px]">
              Prev
            </button>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-ink">
                {dateOffset === 0 ? "Today" : dateOffset === 1 ? "Yesterday" : displayDate}
              </p>
              <p className="text-[11px] text-caption">{format(subDays(new Date(), dateOffset), "MMM d")}</p>
            </div>
            <button
              onClick={() => setDateOffset(o => Math.max(0, o - 1))}
              disabled={dateOffset === 0}
              className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
            >
              Next
            </button>
          </div>

          <DailyMacroSummary meals={dayMeals} goals={goals} />

          {addingType && (
            <AddFoodForm
              mealType={addingType}
              date={currentDate}
              onAdded={() => { setAddingType(null); load(); }}
              onCancel={() => setAddingType(null)}
            />
          )}

          <motion.div
            key={currentDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {MEAL_ORDER.map(mealType => (
              <MealSection
                key={mealType}
                mealType={mealType}
                meals={dayMeals.filter(m => m.meal_type === mealType)}
                onAdd={handleAdd}
                onDeleted={load}
                adding={addingType === mealType}
              />
            ))}
          </motion.div>
        </>
      )}

      {activeTab === "weight" && <WeightTab />}
    </div>
  );
}
