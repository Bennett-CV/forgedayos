import { buildTodayCommand } from "./todayCommand.js";
import { buildWeekDigest } from "./weekSummary.js";

export function fixtureTodayView(now = new Date("2026-09-12T09:15:00")) {
  return buildTodayCommand({
    user: {
      full_name: "Bennett Cole",
      focused_pillars: ["lifts", "nutrition", "mindfulness", "finance"],
      nutrition_goals: { calories: 2400, protein_g: 180 },
    },
    now,
    meals: [
      { date: "2026-09-12", calories: 420, protein_g: 28, meal_type: "breakfast" },
    ],
    goals: { calories: 2400, protein_g: 180 },
    workoutLogs: [],
    weekWorkoutLogs: [{ week_start: "2026-09-07", day: 1 }],
    program: [
      { day: 1, label: "Full Body A" },
      { day: 2, label: "Full Body B" },
      { day: 3, label: "Full Body C" },
    ],
    journalEntries: [],
    transactions: [],
    hasFinanceData: true,
    reviewExists: false,
    weekHasData: true,
    weekSessions: 1,
  });
}

export function fixtureWeekDigest() {
  return buildWeekDigest({
    weekStart: "2026-09-07",
    weekEnd: "2026-09-13",
    workoutLogs: [
      { week_start: "2026-09-07", day: 1, exercise: "Goblet Squat", set_number: 1 },
      { week_start: "2026-09-07", day: 1, exercise: "Goblet Squat", set_number: 2 },
      { week_start: "2026-09-07", day: 1, exercise: "Goblet Squat", set_number: 3 },
      { week_start: "2026-09-07", day: 2, exercise: "Row", set_number: 1 },
    ],
    meals: [
      { date: "2026-09-08", calories: 2280, protein_g: 172 },
      { date: "2026-09-09", calories: 2110, protein_g: 154 },
      { date: "2026-09-10", calories: 2340, protein_g: 181 },
      { date: "2026-09-11", calories: 1980, protein_g: 141 },
    ],
    weights: [
      { date: "2026-09-07", weight_lbs: 184.2 },
      { date: "2026-09-12", weight_lbs: 183.5 },
    ],
    journalEntries: [
      { date: "2026-09-08", type: "morning" },
      { date: "2026-09-08", type: "meditation", duration_minutes: 12 },
      { date: "2026-09-10", type: "reading", pages_read: 24 },
      { date: "2026-09-11", type: "evening" },
    ],
    transactions: [
      { date: "2026-09-09", type: "expense", amount: 38.4 },
      { date: "2026-09-11", type: "expense", amount: 64 },
    ],
    goals: { calories: 2400, protein_g: 180 },
  });
}
