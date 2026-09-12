import { startOfQuarter, subDays } from "date-fns";
import { localDateKey, localToday, normalizeDateKey, localDaysAgoKey, formatLocalDate } from "./localDate.js";

function inLocalDayRange(dateValue, startKey, endKey) {
  const key = normalizeDateKey(dateValue);
  if (!key) return false;
  return key >= startKey && key <= endKey;
}

export function calculateMomentumScore(activities, days = 7) {
  const endKey = localToday();
  const startKey = localDaysAgoKey(days);
  return activities
    .filter(a => inLocalDayRange(a.date, startKey, endKey))
    .reduce((sum, a) => sum + (a.points || 0), 0);
}

export function calculateVelocity(activities) {
  const thisWeekStart = localDaysAgoKey(7);
  const lastWeekStart = localDaysAgoKey(14);
  const today = localToday();

  const thisWeek = activities
    .filter(a => inLocalDayRange(a.date, thisWeekStart, today))
    .reduce((s, a) => s + (a.points || 0), 0);

  const lastWeek = activities
    .filter(a => {
      const key = normalizeDateKey(a.date);
      return key && key >= lastWeekStart && key < thisWeekStart;
    })
    .reduce((s, a) => s + (a.points || 0), 0);

  if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

export function getQTDScore(activities) {
  const startKey = localDateKey(startOfQuarter(new Date()));
  const today = localToday();
  return activities
    .filter(a => inLocalDayRange(a.date, startKey, today))
    .reduce((s, a) => s + (a.points || 0), 0);
}

export function getPillarBreakdown(activities, days = 7) {
  const startKey = localDaysAgoKey(days);
  const today = localToday();
  const filtered = activities.filter(a => inLocalDayRange(a.date, startKey, today));

  const breakdown = {};
  filtered.forEach(a => {
    if (!breakdown[a.pillar]) breakdown[a.pillar] = 0;
    breakdown[a.pillar] += a.points || 0;
  });
  return breakdown;
}

export function getDailyPoints(activities, days = 30) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStr = localDaysAgoKey(i);
    const label = formatLocalDate(dayStr, "MMM dd");
    const pts = activities
      .filter(a => normalizeDateKey(a.date) === dayStr)
      .reduce((s, a) => s + (a.points || 0), 0);
    data.push({ date: dayStr, label, points: pts });
  }
  return data;
}

export function getStreak(activities) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = localDaysAgoKey(i);
    const hasActivity = activities.some(a => normalizeDateKey(a.date) === day);
    if (hasActivity) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export { subDays };
