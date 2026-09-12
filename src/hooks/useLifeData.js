import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { readDateRange } from '@/lib/lifeSummary';

// Summaries never need journal text, meal descriptions, or transaction descriptions.
const SOURCES = {
  meals: ['Meal', ['date', 'calories', 'protein_g']],
  journals: ['JournalEntry', ['date', 'type', 'pages_read', 'duration_minutes']],
  weights: ['WeightLog', ['date', 'weight_lbs']],
  transactions: ['Transaction', ['date', 'type', 'amount']],
  activities: ['Activity', ['date', 'pillar', 'category', 'points', 'title', 'value', 'unit']],
};

export function useLifeData(email, start, end) {
  const [state, setState] = useState({ key: '', data: {}, errors: [], loading: true });
  const version = useRef(0);
  const key = `${email}:${start}:${end}`;
  const refresh = useCallback(async () => {
    const request = ++version.current;
    if (!email) { setState({ key, data: {}, errors: [], loading: false }); return; }
    setState({ key, data: {}, errors: [], loading: true });
    const entries = Object.entries(SOURCES);
    const results = await Promise.allSettled(entries.map(([, [name, fields]]) => readDateRange(base44.entities[name], email, start, end, fields)));
    if (request !== version.current) return;
    const data = {};
    const errors = [];
    results.forEach((result, i) => {
      const name = entries[i][0];
      if (result.status === 'fulfilled') data[name] = result.value;
      else errors.push(name);
    });
    setState({ key, data, errors, loading: false });
  }, [email, start, end, key]);
  useEffect(() => { refresh(); return () => { version.current++; }; }, [refresh]);
  return { ...(state.key === key ? state : { data: {}, errors: [], loading: true }), refresh };
}
