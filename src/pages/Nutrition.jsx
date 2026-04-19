import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import AddFoodModal from "../components/nutrition/AddFoodModal";
import MealSection from "../components/nutrition/MealSection";
import DailyMacroSummary from "../components/nutrition/DailyMacroSummary";
import WeightTab from "../components/nutrition/WeightTab.jsx";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export default function Nutrition() {
  const [activeTab, setActiveTab] = useState("nutrition");
  const [dateOffset, setDateOffset] = useState(0);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState("breakfast");

  const currentDate = format(subDays(new Date(), dateOffset), "yyyy-MM-dd");
  const displayDate = format(subDays(new Date(), dateOffset), "EEEE, MMMM d");

  const load = async () => {
    const data = await base44.entities.Meal.list("-created_date", 500);
    setMeals(data);
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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Nutrition</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your food and weight</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 border border-border">
        {[
          { id: "nutrition", label: "Food & Macros" },
          { id: "weight", label: "Weight" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Nutrition Tab */}
      {activeTab === "nutrition" && (
        <>
          {/* Date Navigator */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <button onClick={() => setDateOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold">{dateOffset === 0 ? "Today" : dateOffset === 1 ? "Yesterday" : displayDate}</p>
              <p className="text-xs text-muted-foreground">{format(subDays(new Date(), dateOffset), "MMM d, yyyy")}</p>
            </div>
            <button
              onClick={() => setDateOffset(o => Math.max(0, o - 1))}
              disabled={dateOffset === 0}
              className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {dayMeals.length > 0 && <DailyMacroSummary meals={dayMeals} />}

          <motion.div
            key={currentDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
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

          {dayMeals.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border">
              <Utensils className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Nothing logged for {dateOffset === 0 ? "today" : "this day"} yet.</p>
              <p className="text-xs text-muted-foreground">Click "Add" on any meal to get started.</p>
            </div>
          )}

          <AddFoodModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onAdded={load}
            defaultMealType={activeMealType}
            date={currentDate}
          />
        </>
      )}

      {/* Weight Tab */}
      {activeTab === "weight" && <WeightTab />}
    </div>
  );
}