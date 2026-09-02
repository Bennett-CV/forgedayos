import { format } from "date-fns";
import { cardioTypeLabel, parseCardioType, formatDurationMinutes, displayLoggedNumber } from "@/lib/workoutLog";

function loggedSet(log) {
  if (!log) return null;
  const weight = log.weight > 0 ? log.weight : null;
  const reps = log.reps > 0 ? log.reps : null;
  if (weight == null && reps == null) return null;
  return { weight, reps };
}

export default function ExerciseHistory({ exercise, allLogs, variant = "strength" }) {
  const weeks = [...new Set(
    allLogs
      .filter(l => l.exercise === exercise.name)
      .map(l => l.week_start)
  )].sort((a, b) => b.localeCompare(a));

  if (weeks.length === 0) return null;

  if (variant === "cardio" || exercise.isCardio) {
    return <CardioHistory exercise={exercise} allLogs={allLogs} weeks={weeks} />;
  }

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
              {Array.from({ length: exercise.sets || 3 }, (_, i) => (
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
                  {Array.from({ length: exercise.sets || 3 }, (_, i) => {
                    const set = loggedSet(getSetData(week, i + 1));
                    return (
                      <td key={i} className="py-1.5 px-2 text-center">
                        {set ? (
                          <span className="font-mono text-foreground">
                            {set.weight != null ? set.weight : ""}
                            {set.reps != null ? <span className="text-muted-foreground">×{set.reps}</span> : null}
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
                      <span className={`font-mono font-semibold ${delta > 0 ? "text-success" : delta < 0 ? "text-overbudget" : "text-caption"}`}>
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

function CardioHistory({ exercise, allLogs, weeks }) {
  const logForWeek = (weekStart) =>
    allLogs.find(l => l.exercise === exercise.name && l.week_start === weekStart);

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground mb-3">{exercise.name}</h4>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4 font-bold">Week</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 px-2 font-bold">Type</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-2 px-2 font-bold">Time</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-2 font-bold">Distance</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(week => {
              const log = logForWeek(week);
              const typeId = parseCardioType(log?.notes);
              const time = formatDurationMinutes(log?.reps) || displayLoggedNumber(log?.reps);
              const dist = displayLoggedNumber(log?.weight);
              if (!typeId && !time && !dist) return null;
              return (
                <tr key={week}>
                  <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap">
                    {format(new Date(week + "T00:00:00"), "MMM d")}
                  </td>
                  <td className="py-1.5 px-2 text-foreground">{typeId ? cardioTypeLabel(typeId) : "—"}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-foreground">{time ? `${time} min` : "—"}</td>
                  <td className="py-1.5 text-right font-mono text-foreground">{dist ? `${dist} mi` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
