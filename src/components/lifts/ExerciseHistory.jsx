import { format, startOfWeek } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ExerciseHistory({ exercise, allLogs }) {
  // Get all unique week_starts that have data for this exercise, sorted desc
  const weeks = [...new Set(
    allLogs
      .filter(l => l.exercise === exercise.name)
      .map(l => l.week_start)
  )].sort((a, b) => b.localeCompare(a));

  if (weeks.length === 0) return null;

  const getAvgWeight = (weekStart) => {
    const logs = allLogs.filter(l => l.exercise === exercise.name && l.week_start === weekStart && l.weight > 0);
    if (!logs.length) return null;
    return logs.reduce((s, l) => s + l.weight, 0) / logs.length;
  };

  const getSetData = (weekStart, setNum) => {
    return allLogs.find(l => l.exercise === exercise.name && l.week_start === weekStart && l.set_number === setNum);
  };

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground mb-3">{exercise.name}</h4>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4 font-bold">Week</th>
              {Array.from({ length: exercise.sets }, (_, i) => (
                <th key={i} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground pb-2 px-2 font-bold">
                  Set {i + 1}
                </th>
              ))}
              <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground pb-2 px-2 font-bold">Avg</th>
              <th className="text-center text-[10px] uppercase tracking-wider text-muted-foreground pb-2 font-bold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => {
              const avg = getAvgWeight(week);
              const prevAvg = wi < weeks.length - 1 ? getAvgWeight(weeks[wi + 1]) : null;
              const delta = avg != null && prevAvg != null ? avg - prevAvg : null;
              return (
                <tr key={week} className="hover:bg-secondary/30 rounded-lg">
                  <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap">
                    {format(new Date(week + "T00:00:00"), "MMM d")}
                  </td>
                  {Array.from({ length: exercise.sets }, (_, i) => {
                    const log = getSetData(week, i + 1);
                    return (
                      <td key={i} className="py-1.5 px-2 text-center">
                        {log ? (
                          <span className="font-mono text-foreground">
                            {log.weight > 0 ? `${log.weight}` : "BW"}
                            {log.reps > 0 ? <span className="text-muted-foreground">×{log.reps}</span> : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-2 text-center font-mono font-bold text-foreground">
                    {avg != null ? `${avg.toFixed(1)}` : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="py-1.5 text-center">
                    {delta != null ? (
                      <span className={`flex items-center justify-center gap-0.5 font-mono font-bold ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                    ) : <span className="text-muted-foreground/30">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}