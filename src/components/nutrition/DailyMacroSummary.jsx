export default function DailyMacroSummary({ meals, goals }) {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const calorieGoal = goals?.calories || 0;
  const pct = calorieGoal > 0 ? Math.min(100, (totals.calories / calorieGoal) * 100) : 0;
  const over = calorieGoal > 0 && totals.calories > calorieGoal;

  return (
    <div className="editorial-card p-5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-semibold text-ink">
          {Math.round(totals.calories).toLocaleString()}
        </span>
        {calorieGoal > 0 && (
          <span className="text-[13px] text-caption font-mono">
            / {calorieGoal.toLocaleString()} kcal
          </span>
        )}
        {calorieGoal === 0 && (
          <span className="text-[13px] text-caption">kcal</span>
        )}
      </div>
      <div className="mt-3 h-[4px] rounded-[2px] bg-track overflow-hidden">
        <div
          className="h-full rounded-[2px]"
          style={{
            width: `${calorieGoal > 0 ? pct : Math.min(100, totals.calories > 0 ? 40 : 0)}%`,
            background: over ? "oklch(var(--overbudget))" : "oklch(var(--clay))",
          }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Protein", value: totals.protein_g },
          { label: "Carbs", value: totals.carbs_g },
          { label: "Fat", value: totals.fat_g },
        ].map(m => (
          <div key={m.label} className="text-center">
            <p className="font-mono text-[15px] font-semibold text-ink">{Math.round(m.value)}g</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-faint mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
