import { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { localToday, normalizeDateKey } from "@/lib/localDate";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { requestTrainingSheetSync } from "@/lib/requestTrainingSheetSync";
import {
  buildRecentMeals,
  copyPayloads,
  logDayLabel,
  loggedMealRecord,
} from "@/lib/recentMeals";

const FILTERS = [
  { id: "", label: "All" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

export default function RecentMeals({
  meals,
  logDate,
  today,
  open,
  mealType = "",
  focusToken = 0,
  onMealType,
  onOpen,
  onClose,
  onLogged,
}) {
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState(null);
  const rootRef = useRef(null);
  const todayKey = normalizeDateKey(today) || localToday();
  const targetDate = normalizeDateKey(logDate) || todayKey;
  const targetLabel = logDayLabel(targetDate, todayKey);
  const activeType = mealType || "";

  const items = useMemo(
    () => buildRecentMeals(meals, {
      today: todayKey,
      query,
      mealType: activeType,
      limit: 40,
    }),
    [meals, todayKey, query, activeType]
  );

  const hasHistory = useMemo(
    () => buildRecentMeals(meals, { today: todayKey, limit: 1 }).length > 0,
    [meals, todayKey]
  );

  useEffect(() => {
    if (!open) return;
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open, focusToken]);

  const add = async (item) => {
    if (savingId) return;
    const payloads = copyPayloads(item, { date: targetDate });
    if (!payloads.length) return;

    setSavingId(item.id);
    const created = [];
    try {
      for (const payload of payloads) {
        const result = await base44.entities.Meal.create(payload);
        created.push(loggedMealRecord(result, payload));
      }
    } catch {
      if (created.length) {
        onLogged?.(created.slice().reverse());
        requestTrainingSheetSync();
        toast.error(`Added ${created.length} of ${payloads.length}. The rest did not save.`);
      } else {
        toast.error("Could not add that meal.");
      }
      setSavingId(null);
      return;
    }

    try {
      const names = payloads.map(payload => payload.food_name).filter(Boolean);
      const slot = payloads[0]?.meal_type || "meal";
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${slot}: ${names.slice(0, 3).join(", ")}`,
        points: 2,
        date: targetDate,
      });
    } catch {
      // Foods are already saved. The activity points are best-effort.
    }

    const label = created.length === 1
      ? `Added ${created[0].food_name}`
      : `Added ${created.length} foods`;
    toast.success(label);
    onLogged?.(created.slice().reverse());
    requestTrainingSheetSync();
    setSavingId(null);
  };

  return (
    <div ref={rootRef} className="space-y-3 scroll-mt-[72px]">
      <button
        type="button"
        onClick={() => (open ? onClose?.() : onOpen?.())}
        className="editorial-card w-full px-4 py-3 flex items-center justify-between gap-3 text-left min-h-[52px]"
        aria-expanded={open ? "true" : "false"}
      >
        <span className="min-w-0">
          <span className="micro-label block">Repeat a meal</span>
          <span className="text-[14px] font-medium text-ink">Recent meals</span>
        </span>
        <span className="text-[12px] font-semibold text-clay shrink-0">
          {open ? "Close" : "Open"}
        </span>
      </button>

      {open && (
        <div className="editorial-card p-4 space-y-3">
          <div>
            <p className="micro-label">Recent meals</p>
            <p className="text-[12px] text-caption mt-1 leading-relaxed">
              Adds a copy to {targetLabel}. The original stays as it was.
            </p>
          </div>

          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search meals"
            className="font-sans"
            aria-label="Search meals"
          />

          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map(filter => {
              const selected = activeType === filter.id;
              return (
                <button
                  key={filter.id || "all"}
                  type="button"
                  onClick={() => onMealType?.(filter.id)}
                  className={`shrink-0 px-3 rounded-[4px] text-[11px] font-semibold min-h-[40px] ${
                    selected ? "bg-clay text-clay-fg" : "bg-secondary text-caption"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {items.length > 0 ? (
            <div className="max-h-[min(60vh,420px)] overflow-y-auto">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => add(item)}
                  disabled={Boolean(savingId)}
                  className="w-full min-h-[52px] py-3 text-left border-b border-border last:border-b-0 disabled:opacity-60"
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="min-w-0 text-[14px] font-medium text-ink truncate">
                      {item.title}
                    </span>
                    <span className="font-mono text-[13px] text-caption shrink-0">
                      {savingId === item.id ? "Adding…" : `${Math.round(item.calories)} kcal`}
                    </span>
                  </span>
                  <span className="block text-[11px] text-caption mt-0.5">{item.macrosLabel}</span>
                  {item.subtitle && (
                    <span className="block text-[11px] text-caption mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-caption py-2">
              {hasHistory ? "No matches." : "Meals you log will show up here."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
