import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { summarizeLife } from '@/lib/lifeSummary';

export default function TodayOverview({ user, data, errors = [], loading, today, weekStart, onRetry }) {
  const day = summarizeLife(data, today, today);
  const week = summarizeLife(data, weekStart, today);
  const selected = user?.focused_pillars?.length ? user.focused_pillars : ['lifts', 'nutrition', 'mindfulness', 'finance'];
  const goals = user?.nutrition_goals || {};
  const rows = [];
  if (selected.includes('lifts')) rows.push({ label: 'Training', value: errors.includes('activities') ? 'Unavailable' : day.trainingDays ? 'Logged today' : 'No session logged', detail: `${week.trainingDays}${user?.workout_days_per_week ? ` / ${user.workout_days_per_week}` : ''} training days this week`, to: '/lifts' });
  if (selected.includes('nutrition')) {
    rows.push({ label: 'Calories', value: errors.includes('meals') ? 'Unavailable' : `${Math.round(day.calories).toLocaleString()}${goals.calories ? ` / ${goals.calories.toLocaleString()}` : ''} kcal`, detail: day.mealCount ? `${day.mealCount} ${day.mealCount === 1 ? 'meal' : 'meals'} logged · totals may be incomplete` : 'Log a meal to start your day', to: '/nutrition' });
    rows.push({ label: 'Protein', value: errors.includes('meals') ? 'Unavailable' : `${Math.round(day.protein)}${goals.protein_g ? ` / ${goals.protein_g}` : ''} g`, detail: goals.protein_g ? `${Math.max(0, Math.round(goals.protein_g - day.protein))} g remaining to your target` : 'Set your daily target in Food', to: '/nutrition' });
  }
  if (selected.includes('mindfulness')) {
    rows.push({ label: 'Reflection', value: errors.includes('journals') ? 'Unavailable' : day.journalDays ? 'Logged today' : 'A moment for yourself', detail: 'Capture a win or an intention', to: '/mindfulness?compose=evening' });
    rows.push({ label: 'Reading', value: errors.includes('journals') ? 'Unavailable' : `${day.pages} pages`, detail: 'Every page adds up', to: '/mindfulness?compose=reading' });
  }
  if (selected.includes('finance')) rows.push({ label: 'Spending', value: errors.includes('transactions') ? 'Unavailable' : `$${day.expenses.toFixed(2)}`, detail: 'Logged expenses today', to: '/finance' });
  if (selected.includes('career')) rows.push({ label: 'Projects', value: 'Make progress', detail: 'Choose your next milestone', to: '/projects' });
  const next = errors.length ? 'Some records could not load. Retry to see an accurate picture.' : selected.includes('nutrition') && !day.mealCount ? 'Start with your next meal. A small log makes today clearer.' : selected.includes('mindfulness') && !day.journalDays ? 'Take a moment to capture one thing that matters today.' : 'Review your week and choose one focus to carry forward.';
  return <section className="editorial-card overflow-hidden" aria-label="Today at a glance">
    <div className="p-4 border-b border-border"><p className="micro-label">Today at a glance</p><h2 className="font-serif text-[22px] text-ink mt-1">Make the day count.</h2></div>
    {loading ? <p role="status" className="p-5 text-sm text-caption">Loading your day…</p> : <>
      <div className="grid grid-cols-2">{rows.map(row => <Link key={row.label} to={row.to} className="relative p-4 border-b border-border odd:border-r min-h-[110px] hover:bg-secondary">
        <div className="min-w-0"><p className="text-xs text-caption">{row.label}</p><p className="text-[14px] font-semibold font-mono text-ink mt-1">{row.value}</p><p className="text-[11px] text-caption mt-1">{row.value === 'Unavailable' ? 'Please retry loading your data' : row.detail}</p></div><ArrowUpRight className="absolute top-3 right-3 h-3 w-3 text-caption" aria-hidden="true" />
      </Link>)}</div>
      <div className="p-4 bg-secondary"><p className="micro-label mb-2">Next</p><p className="text-sm text-ink leading-relaxed">{next}</p>{errors.length > 0 && <button onClick={onRetry} className="text-clay font-semibold text-sm min-h-[44px]">Retry</button>}</div>
    </>}
  </section>;
}
