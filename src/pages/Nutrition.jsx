import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import AddFoodModal from "../components/nutrition/AddFoodModal";
import MealSection from "../components/nutrition/MealSection";
import DailyMacroSummary from "../components/nutrition/DailyMacroSummary";
import WeightTab from "../components/nutrition/WeightTab.jsx";
import GoalSetter from "../components/nutrition/GoalSetter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export default function Nutrition() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("nutrition");
  const [dateOffset, setDateOffset] = useState(0);
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState("breakfast");
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const currentDate = format(subDays(new Date(), dateOffset), "yyyy-MM-dd");
  const displayDate = format(subDays(new Date(), dateOffset), "EEEE, MMMM d");

  const load = async () => {
    if (!user?.email) return;
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

  const dayMeals = meals.filter(m => m.date === currentDate);

  const handleAdd = (mealType) => {
    setActiveMealType(mealType);
    setModalOpen(true);
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
          onClick={() => setGoalModalOpen(true)}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-caption min-h-0"
        >
          Goals
        </button>
      </div>

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
              />
            ))}
          </motion.div>

          <AddFoodModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onAdded={load}
            defaultMealType={activeMealType}
            date={currentDate}
            recentMeals={meals}
          />
        </>
      )}

      {activeTab === "weight" && <WeightTab />}

      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Set Your Fitness Goals</DialogTitle>
            <DialogDescription>
              Enter your body metrics and goals to get personalized nutrition recommendations.
            </DialogDescription>
          </DialogHeader>
          <GoalSetter onComplete={(data) => {
            if (data) {
              setGoals(data.goals);
              setMeals(data.meals);
            }
            setGoalModalOpen(false);
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
