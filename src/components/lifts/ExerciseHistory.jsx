import { format } from "date-fns";
import {
  cardioTypeLabel,
  parseCardioType,
  formatDurationMinutes,
  displayLoggedNumber,
  bestSetAllTime,
  bestCardioAllTime,
} from "@/lib/workoutLog";

const TABLE_WEEKS = 8;

function loggedSet(log) {
  if (!log) return null;
  const weight = log.weight > 0 ? log.weight : null;
  const reps = log.reps > 0 ? log.reps : null;
  if (weight == null && reps == null) return null;
  return { weight, reps };
}

function weekLabel(week) {
  if (!week) return "";
  return format(new Date(week + "T00:00:00"), "MMM d");
}

export default function ExerciseHistory({ exercise, allLogs, variant = "strength" }) {
  const exerciseLogs = allLogs.filter(l => l.exercise === exercise.name);
  const weeks = [...new Set(exerciseLogs.map(l => l.week_start))].sort((a, b) => b.localeCompare(a));

  if (weeks.length === 0) return null;

  if (variant === "cardio" || exercise.isCardio) {
    return <CardioHistory exercise={exercise} allLogs={exerciseLogs} weeks={weeks} />;
  }

  const logsFor = (weekStart) => exerciseLogs.filter(l => l.week_start === weekStart);

  const getAvgWeight = (weekStart) => {
    const logs = logsFor(weekStart).filter(l => l.weight > 0);
    if (!logs.length) return null;
    return logs.reduce((s, l) => s + l.weight, 0) / logs.length;
  };

  const getSetData = (weekStart, setNum) =>
    exerciseLogs.find(l => l.week_start === weekStart && l.set_number === setNum);

  const best = bestSetAllTime(exerciseLogs);
  const tableWeeks = weeks.slice(0, TABLE_WEEKS);

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground">{exercise.name}</h4>
      {best && (
        <p className="text-[12px] text-caption mt-1 mb-3">
          Best {best.weight}{best.reps > 0 ? `×${best.reps}` : ""}
          {best.week ? ` · ${weekLabel(best.week)}` : ""}
        </p>
      )}
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
            {tableWeeks.map((week) => {
              const wi = weeks.indexOf(week);
              const avg = getAvgWeight(week);
              const prevAvg = wi < weeks.length - 1 ? getAvgWeight(weeks[wi + 1]) : null;
              const delta = avg != null && prevAvg != null ? avg - prevAvg : null;
              return (
                <tr key={week}>
                  <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap">
                    {weekLabel(week)}
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
  const logForWeek = (weekStart) => allLogs.find(l => l.week_start === weekStart);
  const best = bestCardioAllTime(allLogs);
  const tableWeeks = weeks.slice(0, TABLE_WEEKS);

  let bestLine = "";
  if (best?.kind === "duration") {
    const time = formatDurationMinutes(best.value) || String(best.value);
    bestLine = `Best ${time} min${best.week ? ` · ${weekLabel(best.week)}` : ""}`;
  } else if (best?.kind === "distance") {
    bestLine = `Best ${best.value} mi${best.week ? ` · ${weekLabel(best.week)}` : ""}`;
  }

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground">{exercise.name}</h4>
      {bestLine && <p className="text-[12px] text-caption mt-1 mb-3">{bestLine}</p>}
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
            {tableWeeks.map(week => {
              const log = logForWeek(week);
              const typeId = parseCardioType(log?.notes);
              const time = formatDurationMinutes(log?.reps) || displayLoggedNumber(log?.reps);
              const dist = displayLoggedNumber(log?.weight);
              if (!typeId && !time && !dist) return null;
              return (
                <tr key={week}>
                  <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap">
                    {weekLabel(week)}
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
