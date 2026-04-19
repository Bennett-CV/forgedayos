export default function DailyMacroSummary({ meals, goals }) {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0),
      fiber_g: acc.fiber_g + (m.fiber_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  const stats = [
    { label: "Calories", key: "calories", value: Math.round(totals.calories), unit: "kcal", color: "text-chart-3", barColor: "bg-chart-3", goal: goals?.calories },
    { label: "Protein", key: "protein_g", value: totals.protein_g.toFixed(1), unit: "g", color: "text-chart-1", barColor: "bg-chart-1", goal: goals?.protein_g },
    { label: "Carbs", key: "carbs_g", value: totals.carbs_g.toFixed(1), unit: "g", color: "text-chart-4", barColor: "bg-chart-4", goal: goals?.carbs_g },
    { label: "Fat", key: "fat_g", value: totals.fat_g.toFixed(1), unit: "g", color: "text-chart-2", barColor: "bg-chart-2", goal: goals?.fat_g },
    { label: "Fiber", key: "fiber_g", value: totals.fiber_g.toFixed(1), unit: "g", color: "text-muted-foreground", barColor: "bg-muted-foreground", goal: null },
  ];

  // Macro split %
  const totalMacroKcal = totals.protein_g * 4 + totals.carbs_g * 4 + totals.fat_g * 9;
  const pct = (val, mult) => totalMacroKcal > 0 ? Math.round((val * mult / totalMacroKcal) * 100) : 0;

  const hasGoals = goals && (goals.calories || goals.protein_g || goals.carbs_g || goals.fat_g);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Daily Totals</h2>
      <div className="grid grid-cols-5 gap-3 mb-4">
        {stats.map(({ label, value, unit, color }) => (
          <div key={label} className="text-center">
            <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground font-medium">{unit}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Goal progress bars */}
      {hasGoals && (
        <div className="space-y-2 mb-4 pt-3 border-t border-border/50">
          {stats.filter(s => s.goal).map(({ label, key, goal, barColor, color }) => {
            const raw = key === "calories" ? totals[key] : totals[key];
            const pctOfGoal = Math.min(100, Math.round((raw / goal) * 100));
            const over = raw > goal;
            return (
              <div key={key}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <span className={`font-mono font-bold ${over ? "text-destructive" : color}`}>
                    {key === "calories" ? Math.round(raw) : raw.toFixed(0)} / {goal} {key === "calories" ? "kcal" : "g"} ({pctOfGoal}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? "bg-destructive" : barColor}`}
                    style={{ width: `${pctOfGoal}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalMacroKcal > 0 && (
        <div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-chart-1 rounded-full transition-all" style={{ width: `${pct(totals.protein_g, 4)}%` }} />
            <div className="bg-chart-4 rounded-full transition-all" style={{ width: `${pct(totals.carbs_g, 4)}%` }} />
            <div className="bg-chart-2 rounded-full transition-all" style={{ width: `${pct(totals.fat_g, 9)}%` }} />
          </div>
          <div className="flex gap-4 mt-1.5">
            <span className="text-[9px] text-chart-1 font-bold">P {pct(totals.protein_g, 4)}%</span>
            <span className="text-[9px] text-chart-4 font-bold">C {pct(totals.carbs_g, 4)}%</span>
            <span className="text-[9px] text-chart-2 font-bold">F {pct(totals.fat_g, 9)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}