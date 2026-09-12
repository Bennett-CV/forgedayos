const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const total = (rows, key) => rows.reduce((sum, row) => sum + number(row[key]), 0);
const dates = rows => new Set(rows.map(row => row.date));

export function summarizeLife({ activities = [], meals = [], journals = [], weights = [], transactions = [] }, start, end) {
  const within = rows => rows.filter(row => row.date >= start && row.date <= end);
  const acts = within(activities);
  const food = within(meals);
  const mind = within(journals);
  const weight = within(weights).sort((a, b) => a.date.localeCompare(b.date));
  const money = within(transactions).filter(row => row.type === 'expense');
  const mealDays = dates(food).size;
  return {
    activityDays: dates(acts).size,
    trainingDays: dates(acts.filter(row => row.pillar === 'lifts')).size,
    mealCount: food.length,
    mealDays,
    calories: total(food, 'calories'),
    protein: total(food, 'protein_g'),
    averageCalories: mealDays ? Math.round(total(food, 'calories') / mealDays) : null,
    journalDays: dates(mind.filter(row => ['morning', 'evening'].includes(row.type))).size,
    pages: total(mind.filter(row => row.type === 'reading'), 'pages_read'),
    meditationMinutes: total(mind.filter(row => row.type === 'meditation'), 'duration_minutes'),
    latestWeight: weight.length ? weight[weight.length - 1].weight_lbs : null,
    weightChange: dates(weight).size > 1 ? Number(weight[weight.length - 1].weight_lbs) - Number(weight[0].weight_lbs) : null,
    expenses: total(money, 'amount'),
    expenseCount: money.length,
  };
}

export async function readDateRange(entity, email, start, end, fields) {
  const rows = [];
  const pageSize = 200;
  for (let skip = 0; ; skip += pageSize) {
    const page = await entity.filter({ created_by: email, date: { $gte: start, $lte: end } }, 'date', pageSize, skip, fields);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
