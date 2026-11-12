import { formatLocalDate, localToday, normalizeDateKey } from "./localDate.js";

/**
 * Recent meals for the food log.
 *
 * Each saved food is its own Meal row. There is no grouped-meal record.
 * A slot is every food logged on one local calendar day for the same
 * meal_type (breakfast, lunch, dinner, snack). Identical foods and identical
 * slots collapse so a repeated breakfast shows up once.
 *
 * Copying builds new Meal payloads for the target day. The original row is
 * not part of that payload: no id, no created_date, no original date.
 *
 * Day keys stay on the local civil calendar (YYYY-MM-DD). Do not derive them
 * with toISOString(), which shifts the evening in timezones west of UTC.
 */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

/** Extra logs beyond the first buy this many days of recency, then stop. */
export const RECENT_FREQUENCY_CAP = 7;

const COPY_KEYS = [
  "quantity",
  "serving_size",
  "serving_size_g",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "sugar_g",
  "notes",
];

const GENERIC_SERVINGS = new Set(["", "custom", "described"]);

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round1(value) {
  return Math.round(num(value) * 10) / 10;
}

function cleanLabel(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function mealDisplayName(meal) {
  return cleanLabel(meal?.food_name) || cleanLabel(meal?.food_description);
}

function mealTypeOf(meal) {
  return String(meal?.meal_type || "").trim().toLowerCase();
}

function mealDay(meal) {
  return normalizeDateKey(meal?.date) || normalizeDateKey(meal?.created_date);
}

function servingText(meal) {
  return cleanLabel(meal?.serving_size);
}

function servingKey(meal) {
  const raw = servingText(meal).toLowerCase();
  return GENERIC_SERVINGS.has(raw) ? "" : raw;
}

function labelSlot(mealType) {
  const slot = mealTypeOf({ meal_type: mealType });
  if (!slot) return "Meal";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * Whole local calendar days from `fromKey` to `toKey`.
 * Uses UTC midnight of each civil day so DST cannot add or drop a day.
 */
export function calendarDaysBetween(fromKey, toKey) {
  const from = normalizeDateKey(fromKey);
  const to = normalizeDateKey(toKey);
  if (!from || !to) return null;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function recentWhenLabel(date, today) {
  const days = calendarDaysBetween(date, today);
  if (days == null || days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return formatLocalDate(date, "EEEE");
  return formatLocalDate(date, "MMM d");
}

export function slotTitle(mealType, lastDate, today) {
  const slot = labelSlot(mealType);
  const days = calendarDaysBetween(lastDate, today);
  if (days == null || days <= 0) return `Today's ${mealTypeOf({ meal_type: mealType })}`;
  if (days === 1) return `${slot} from yesterday`;
  return `${slot} from ${recentWhenLabel(lastDate, today)}`;
}

/** Where a copy will land, in plain language. */
export function logDayLabel(logDate, today) {
  const todayKey = normalizeDateKey(today) || localToday();
  const key = normalizeDateKey(logDate) || todayKey;
  const days = calendarDaysBetween(key, todayKey);
  if (days == null || days <= 0) return "today";
  if (days === 1) return "yesterday";
  return formatLocalDate(key, "MMM d");
}

export function formatMacros(item) {
  const protein = Math.round(num(item?.protein_g));
  const carbs = Math.round(num(item?.carbs_g));
  const fat = Math.round(num(item?.fat_g));
  return `P ${protein}g · C ${carbs}g · F ${fat}g`;
}

/**
 * Higher is better.
 * Recency is whole local days before `today`. Each earlier log is worth
 * half a day, capped, so a repeated meal stays near the top. A slot gets a
 * small bump so the whole breakfast sits above its individual foods when
 * they were last eaten together.
 */
export function recentScore(candidate, today) {
  const daysAgo = Math.max(0, calendarDaysBetween(candidate?.lastDate, today) ?? 0);
  const repeats = Math.max(0, (Number(candidate?.count) || 1) - 1);
  const bonus = Math.min(RECENT_FREQUENCY_CAP, repeats) * 0.5;
  const slotBump = candidate?.kind === "slot" ? 0.25 : 0;
  return bonus - daysAgo + slotBump;
}

export function foodSignature(meal) {
  return [
    mealTypeOf(meal),
    mealDisplayName(meal).toLowerCase(),
    Math.round(num(meal?.calories)),
    round1(meal?.protein_g),
    round1(meal?.carbs_g),
    round1(meal?.fat_g),
    servingKey(meal),
  ].join("|");
}

function slotSignature(mealType, items) {
  return JSON.stringify([mealType, items.map(foodSignature).sort()]);
}

function byTime(a, b) {
  const day = mealDay(a).localeCompare(mealDay(b));
  if (day) return day;
  const stamp = String(a?.created_date || "").localeCompare(String(b?.created_date || ""));
  if (stamp) return stamp;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function isNewer(meal, other) {
  if (!other) return true;
  return byTime(meal, other) > 0;
}

function foodSubtitle(meal, { lastDate, today, count }) {
  const parts = [labelSlot(meal?.meal_type)];
  const serving = servingKey(meal) ? servingText(meal) : "";
  if (serving) parts.push(serving);
  parts.push(recentWhenLabel(lastDate, today));
  if (count > 1) parts.push(`${count}×`);
  return parts.join(" · ");
}

function slotSubtitle(sources, count) {
  const names = sources.map(mealDisplayName).filter(Boolean);
  const shown = names.slice(0, 3).join(", ");
  const extra = names.length > 3 ? ` +${names.length - 3}` : "";
  const times = count > 1 ? ` · ${count}×` : "";
  return `${shown}${extra}${times}`;
}

function sumField(items, key) {
  return items.reduce((total, meal) => total + num(meal?.[key]), 0);
}

function finishFood(group, today) {
  const meal = group.source;
  const title = mealDisplayName(meal);
  const subtitle = foodSubtitle(meal, { lastDate: group.lastDate, today, count: group.count });
  const macros = {
    calories: num(meal?.calories),
    protein_g: num(meal?.protein_g),
    carbs_g: num(meal?.carbs_g),
    fat_g: num(meal?.fat_g),
  };
  return {
    kind: "food",
    id: `food:${group.signature}`,
    title,
    subtitle,
    macrosLabel: formatMacros(macros),
    meal_type: mealTypeOf(meal),
    ...macros,
    count: group.count,
    lastDate: group.lastDate,
    searchText: [title, subtitle, mealTypeOf(meal), servingText(meal)].join(" ").toLowerCase(),
    source: meal,
  };
}

function finishSlot(group, today) {
  const sources = group.sources.slice().sort(byTime);
  const macros = {
    calories: sumField(sources, "calories"),
    protein_g: sumField(sources, "protein_g"),
    carbs_g: sumField(sources, "carbs_g"),
    fat_g: sumField(sources, "fat_g"),
  };
  const title = slotTitle(group.meal_type, group.lastDate, today);
  const subtitle = slotSubtitle(sources, group.count);
  const names = sources.map(mealDisplayName);
  return {
    kind: "slot",
    id: `slot:${group.signature}`,
    title,
    subtitle,
    macrosLabel: formatMacros(macros),
    meal_type: group.meal_type,
    ...macros,
    count: group.count,
    lastDate: group.lastDate,
    searchText: [title, subtitle, group.meal_type, ...names].join(" ").toLowerCase(),
    sources,
  };
}

function compareRecent(a, b, today) {
  const delta = recentScore(b, today) - recentScore(a, today);
  if (delta) return delta > 0 ? 1 : -1;
  if (b.count !== a.count) return b.count - a.count;
  if (a.kind !== b.kind) return a.kind === "slot" ? -1 : 1;
  return a.title.localeCompare(b.title);
}

function usableMeal(meal) {
  if (!meal || typeof meal !== "object") return false;
  if (!MEAL_TYPES.includes(mealTypeOf(meal))) return false;
  if (!mealDisplayName(meal)) return false;
  if (!mealDay(meal)) return false;
  return true;
}

/**
 * Deduped foods and multi-item slots, most recent and most frequent first.
 * `today` is the local calendar day used for labels and ranking.
 * `mealType` and `query` filter after dedupe. `limit` applies last.
 */
export function buildRecentMeals(meals, { today, query = "", mealType = "", limit = 40 } = {}) {
  const todayKey = normalizeDateKey(today) || localToday();
  const wantedType = mealTypeOf({ meal_type: mealType });
  const tokens = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = Array.isArray(meals) ? meals : [];

  const foods = new Map();
  const bySlot = new Map();

  for (const meal of list) {
    if (!usableMeal(meal)) continue;
    const day = mealDay(meal);
    const type = mealTypeOf(meal);
    const signature = foodSignature(meal);

    let food = foods.get(signature);
    if (!food) {
      food = { signature, count: 0, lastDate: day, source: meal };
      foods.set(signature, food);
    }
    food.count += 1;
    if (day > food.lastDate || (day === food.lastDate && isNewer(meal, food.source))) {
      food.lastDate = day;
      food.source = meal;
    }

    const slotKey = `${day}|${type}`;
    if (!bySlot.has(slotKey)) bySlot.set(slotKey, []);
    bySlot.get(slotKey).push(meal);
  }

  const slots = new Map();
  for (const [slotKey, items] of bySlot) {
    if (items.length < 2) continue;
    const [day, type] = slotKey.split("|");
    const signature = slotSignature(type, items);
    let slot = slots.get(signature);
    if (!slot) {
      slot = { signature, meal_type: type, count: 0, lastDate: "", sources: [] };
      slots.set(signature, slot);
    }
    slot.count += 1;
    if (!slot.lastDate || day >= slot.lastDate) {
      slot.lastDate = day;
      slot.sources = items.slice();
    }
  }

  let rows = [
    ...[...foods.values()].map(group => finishFood(group, todayKey)),
    ...[...slots.values()].map(group => finishSlot(group, todayKey)),
  ];

  if (wantedType && MEAL_TYPES.includes(wantedType)) {
    rows = rows.filter(row => row.meal_type === wantedType);
  }
  if (tokens.length) {
    rows = rows.filter(row => tokens.every(token => row.searchText.includes(token)));
  }

  rows.sort((a, b) => compareRecent(a, b, todayKey));
  const cap = Number.isFinite(limit) ? limit : 40;
  return cap >= 0 ? rows.slice(0, cap) : rows;
}

function shouldCopy(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

/** New Meal fields for one food. Omits identity fields from the original. */
export function copyMealPayload(meal, { date, mealType } = {}) {
  const name = mealDisplayName(meal);
  const description = cleanLabel(meal?.food_description) || name;
  const payload = {
    date: normalizeDateKey(date) || localToday(),
    meal_type: mealTypeOf({ meal_type: mealType || meal?.meal_type }),
    food_name: name,
    food_description: description,
  };
  for (const key of COPY_KEYS) {
    if (shouldCopy(meal?.[key])) payload[key] = meal[key];
  }
  return payload;
}

/** Payloads for a food (one) or a slot (every item), oldest item first. */
export function copyPayloads(candidate, { date, mealType } = {}) {
  if (!candidate) return [];
  const sources = candidate.kind === "slot"
    ? (Array.isArray(candidate.sources) ? candidate.sources : [])
    : (candidate.source ? [candidate.source] : []);
  return sources.map(meal => copyMealPayload(meal, {
    date,
    mealType: mealType || meal?.meal_type,
  }));
}

/**
 * Meal row to drop into the on-screen log after create.
 * Keeps the payload's civil date and macros even if the server echoes a
 * different timestamp. `id` is the new row's id.
 */
export function loggedMealRecord(result, payload) {
  const row = result && typeof result === "object" ? result : {};
  const record = copyMealPayload(payload, {
    date: payload?.date,
    mealType: payload?.meal_type,
  });
  const id = row.id != null ? row.id : row._id;
  if (id != null) record.id = id;
  return record;
}

/** Prepend created rows that are not already in `existing`. Same ids are not duplicated. */
export function mergeLoggedMeals(existing, created) {
  const rows = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(rows.filter(meal => meal?.id != null).map(meal => String(meal.id)));
  const fresh = [];
  for (const meal of created || []) {
    if (!meal || meal.id == null) continue;
    const key = String(meal.id);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(meal);
  }
  return fresh.length ? [...fresh, ...rows] : rows;
}
