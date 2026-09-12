import { summarizeLife } from '@/lib/lifeSummary';

export default function WeekOverview({ data, errors, loading, start, end, onRetry }) {
  const s = summarizeLife(data, start, end);
  const rows = [
    ['Training', `${s.trainingDays} ${s.trainingDays === 1 ? 'day' : 'days'}`, 'Days with a training activity', 'activities'],
    ['Nutrition', s.averageCalories === null ? 'No meals logged' : `${s.averageCalories.toLocaleString()} kcal / logged day`, `${s.mealDays} ${s.mealDays === 1 ? 'day' : 'days'} with meal entries; not a measure of adherence`, 'meals'],
    ['Reflection', `${s.journalDays} ${s.journalDays === 1 ? 'day' : 'days'}`, 'Morning or evening entries', 'journals'],
    ['Reading', `${s.pages} pages`, `${s.meditationMinutes} minutes of meditation also logged`, 'journals'],
    ['Weight', s.latestWeight === null ? 'No weigh-ins' : `${s.latestWeight} lbs`, s.weightChange === null ? 'Two distinct weigh-in days needed for change' : `${s.weightChange > 0 ? '+' : ''}${s.weightChange.toFixed(1)} lbs between first and last weigh-in`, 'weights'],
    ['Spending', `$${s.expenses.toFixed(2)}`, `${s.expenseCount} expense ${s.expenseCount === 1 ? 'entry' : 'entries'}; includes only logged spending`, 'transactions'],
  ];
  return <section className="editorial-card p-4" aria-label="Your week in numbers">
    <p className="micro-label mb-3">Your week in numbers</p>
    {loading ? <p role="status" className="text-sm text-caption py-4">Gathering your week…</p> : <>
      <div className="divide-y divide-border">{rows.map(([label, value, detail, source]) => <div key={label} className="py-3">
        <p className="text-xs text-caption">{label}</p><p className="font-mono text-[16px] font-semibold text-ink mt-1">{errors.includes(source) ? 'Unavailable' : value}</p><p className="text-[11px] text-caption mt-1">{errors.includes(source) ? 'This data could not load.' : detail}</p>
      </div>)}</div>
      {errors.length > 0 && <button onClick={onRetry} className="min-h-[44px] text-sm text-clay font-semibold">Retry missing data</button>}
    </>}
  </section>;
}
