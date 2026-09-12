import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatLocalDate, localDaysAgoKey, isSameLocalDay } from "@/lib/localDate";
import { motion } from "framer-motion";
import AddFoodForm from "../components/nutrition/AddFoodForm";
import DescribeMeal from "../components/nutrition/DescribeMeal";
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
  const [activeTab, setActiveTab] = useState(() => (
    searchParams.get("tab") === "weight" ? "weight" : "nutrition"
  ));
  const [dateOffset, setDateOffset] = useState(0);
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingType, setAddingType] = useState(() => addParamToMeal(searchParams.get("add")));
  const [editingMeal, setEditingMeal] = useState(null);
  const [showGoals, setShowGoals] = useState(() => searchParams.get("goals") === "1");
  const formRef = useRef(null);

  const currentDate = localDaysAgoKey(dateOffset);
  const displayDate = formatLocalDate(currentDate, "EEEE, MMMM d");

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
      setEditingMeal(null);
      setAddingType(next);
    }
    if (searchParams.get("tab") === "weight") setActiveTab("weight");
    if (searchParams.get("goals") === "1") setShowGoals(true);
  }, [searchParams]);

  const dayMeals = meals.filter(m => isSameLocalDay(m.date, currentDate));

  const closeForm = () => {
    setAddingType(null);
    setEditingMeal(null);
  };

  const handleAdd = (mealType) => {
    setActiveTab("nutrition");
    setEditingMeal(null);
    setAddingType(mealType);
  };

  const handleEdit = (meal) => {
    setActiveTab("nutrition");
    setAddingType(null);
    setEditingMeal(prev => (prev?.id === meal.id ? null : meal));
  };

  const handleListDeleted = (id) => {
    setEditingMeal(prev => (prev?.id === id ? null : prev));
    load();
  };

  useEffect(() => {
    if (addingType || editingMeal) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [addingType, editingMeal]);

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
          <GoalSetter
            goals={goals}
            onComplete={(data) => {
              if (data?.goals) setGoals(data.goals);
              if (data?.meals) setMeals(data.meals);
              if (data?.close) setShowGoals(false);
            }}
          />
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
              <p className="text-[11px] text-caption">{formatLocalDate(currentDate, "MMM d")}</p>
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

          <div className="scroll-mt-[72px]">
            <DescribeMeal
              mealType={addingType}
              date={currentDate}
              onLogged={() => { closeForm(); load(); }}
            />
          </div>

          {(addingType || editingMeal) && (
            <div ref={formRef} className="scroll-mt-[72px]">
              <AddFoodForm
                key={editingMeal?.id || `add-${addingType}`}
                mealType={editingMeal?.meal_type || addingType}
                existingMeal={editingMeal}
                date={editingMeal?.date || currentDate}
                onAdded={() => { closeForm(); load(); }}
                onCancel={closeForm}
                onDeleted={() => { closeForm(); load(); }}
              />
            </div>
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
                onEdit={handleEdit}
                onDeleted={handleListDeleted}
                adding={addingType === mealType}
                editingId={editingMeal?.id}
              />
            ))}
          </motion.div>
        </>
      )}

      {activeTab === "weight" && <WeightTab />}
    </div>
  );
}
