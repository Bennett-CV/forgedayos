import { startOfWeek, endOfWeek, subDays, subWeeks, format, isWithinInterval, startOfQuarter } from 'date-fns';

export function calculateMomentumScore(activities, days = 7) {
  const now = new Date();
  const start = subDays(now, days);
  const filtered = activities.filter(a => {
    const d = new Date(a.date);
    return d >= start && d <= now;
  });
  return filtered.reduce((sum, a) => sum + (a.points || 0), 0);
}

export function calculateVelocity(activities) {
  const now = new Date();
  const thisWeekStart = subDays(now, 7);
  const lastWeekStart = subDays(now, 14);

  const thisWeek = activities
    .filter(a => new Date(a.date) >= thisWeekStart)
    .reduce((s, a) => s + (a.points || 0), 0);

  const lastWeek = activities
    .filter(a => {
      const d = new Date(a.date);
      return d >= lastWeekStart && d < thisWeekStart;
    })
    .reduce((s, a) => s + (a.points || 0), 0);

  if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

export function getQTDScore(activities) {
  const qStart = startOfQuarter(new Date());
  return activities
    .filter(a => new Date(a.date) >= qStart)
    .reduce((s, a) => s + (a.points || 0), 0);
}

export function getPillarBreakdown(activities, days = 7) {
  const now = new Date();
  const start = subDays(now, days);
  const filtered = activities.filter(a => new Date(a.date) >= start && new Date(a.date) <= now);

  const breakdown = {};
  filtered.forEach(a => {
    if (!breakdown[a.pillar]) breakdown[a.pillar] = 0;
    breakdown[a.pillar] += a.points || 0;
  });
  return breakdown;
}

export function getDailyPoints(activities, days = 30) {
  const now = new Date();
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const label = format(day, 'MMM dd');
    const pts = activities
      .filter(a => a.date === dayStr)
      .reduce((s, a) => s + (a.points || 0), 0);
    data.push({ date: dayStr, label, points: pts });
  }
  return data;
}

export function getStreak(activities) {
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = format(subDays(now, i), 'yyyy-MM-dd');
    const hasActivity = activities.some(a => a.date === day);
    if (hasActivity) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}