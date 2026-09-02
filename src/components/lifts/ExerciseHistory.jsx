import { format } from "date-fns";
import {
  cardioTypeLabel,
  parseCardioType,
  formatDurationMinutes,
  displayLoggedNumber,
  bestSetForWeek,
  cardioProgressForWeek,
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
  return format(new Date(week + "T00:00:00"), "MMM d");
}

function sparseIndexes(n) {
  if (n <= 4) return Array.from({ length: n }, (_, i) => i);
  return [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
}

function WeekLineChart({ points, caption }) {
  if (!points || points.length < 2) return null;

  const W = 320;
  const H = 76;
  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 16;
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yMin = min - span * 0.15;
  const yMax = max + span * 0.15;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xAt = (i) => padL + (i / (points.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const labels = sparseIndexes(points.length);

  return (
    <div className="mb-3">
      {caption && <p className="micro-label mb-2">{caption}</p>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[76px] overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={path}
          fill="none"
          stroke="oklch(var(--clay))"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={p.week}
            cx={xAt(i)}
            cy={yAt(p.value)}
            r="2.25"
            fill="oklch(var(--clay))"
          />
        ))}
        {labels.map(i => {
          const p = points[i];
          const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
          return (
            <text
              key={`lbl-${p.week}`}
              x={xAt(i)}
              y={H - 2}
              textAnchor={anchor}
              fill="oklch(var(--caption))"
              style={{ fontSize: 8, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
            >
              {weekLabel(p.week)}
            </text>
          );
        })}
      </svg>
    </div>
  );
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

  const logsFor = (weekStart) =>
    allLogs.filter(l => l.exercise === exercise.name && l.week_start === weekStart);

  const getAvgWeight = (weekStart) => {
    const logs = logsFor(weekStart).filter(l => l.weight > 0);
    if (!logs.length) return null;
    return logs.reduce((s, l) => s + l.weight, 0) / logs.length;
  };

  const getSetData = (weekStart, setNum) =>
    allLogs.find(l => l.exercise === exercise.name && l.week_start === weekStart && l.set_number === setNum);

  const chartPoints = [...weeks].reverse().flatMap(week => {
    const best = bestSetForWeek(logsFor(week));
    return best ? [{ week, value: best.weight }] : [];
  });

  const tableWeeks = weeks.slice(0, TABLE_WEEKS);

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground mb-3">{exercise.name}</h4>
      {chartPoints.length >= 2 && (
        <WeekLineChart points={chartPoints} caption="Best set · lbs" />
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
                <tr key={week} className="hover:bg-secondary/30 rounded-lg">
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
  const logForWeek = (weekStart) =>
    allLogs.find(l => l.exercise === exercise.name && l.week_start === weekStart);

  const durationPoints = [...weeks].reverse().flatMap(week => {
    const { minutes } = cardioProgressForWeek(logForWeek(week));
    return minutes != null ? [{ week, value: minutes }] : [];
  });
  const distancePoints = [...weeks].reverse().flatMap(week => {
    const { miles } = cardioProgressForWeek(logForWeek(week));
    return miles != null ? [{ week, value: miles }] : [];
  });
  const useDuration = durationPoints.length >= 2;
  const chartPoints = useDuration ? durationPoints : distancePoints;
  const chartCaption = useDuration ? "Time · min" : chartPoints.length >= 2 ? "Distance · mi" : null;

  const tableWeeks = weeks.slice(0, TABLE_WEEKS);

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <h4 className="text-sm font-semibold text-foreground mb-3">{exercise.name}</h4>
      {chartPoints.length >= 2 && (
        <WeekLineChart points={chartPoints} caption={chartCaption} />
      )}
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
