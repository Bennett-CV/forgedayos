export default function DailyMacroSummary({ meals }) {
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
    { label: "Calories", value: Math.round(totals.calories), unit: "kcal", color: "text-chart-3" },
    { label: "Protein", value: totals.protein_g.toFixed(1), unit: "g", color: "text-chart-1" },
    { label: "Carbs", value: totals.carbs_g.toFixed(1), unit: "g", color: "text-chart-4" },
    { label: "Fat", value: totals.fat_g.toFixed(1), unit: "g", color: "text-chart-2" },
    { label: "Fiber", value: totals.fiber_g.toFixed(1), unit: "g", color: "text-muted-foreground" },
  ];

  // Macro split %
  const totalMacroKcal = totals.protein_g * 4 + totals.carbs_g * 4 + totals.fat_g * 9;
  const pct = (val, mult) => totalMacroKcal > 0 ? Math.round((val * mult / totalMacroKcal) * 100) : 0;

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