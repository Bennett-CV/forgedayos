/**
 * Read-only Bennett cash feed builder.
 * Pure: entity arrays in → versioned JSON out. No Base44 I/O.
 *
 * Deno mirror of src/lib/bennettFeed.js — keep identical.
 * Self-contained (no date-fns) for Base44 function runtime.
 */

export const BENNETT_FEED_SCHEMA_VERSION = "1.0.0";

const DEFAULT_MONTHS = 6;
const MIN_MONTHS = 1;
const MAX_MONTHS = 24;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_ONLY = /^(\d{4})-(\d{2})$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0);
  }
  if (value == null || value === "") return new Date(NaN);
  const raw = String(value).trim();
  const dateOnly = raw.match(DATE_ONLY);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0);
  }
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return instant;
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate(), 12, 0, 0);
}

function normalizeDateKey(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (DATE_ONLY.test(raw)) return raw;
  return localDateKey(parseLocalDate(raw));
}

function monthKeyFromDate(value) {
  const key = normalizeDateKey(value);
  return key ? key.slice(0, 7) : "";
}

function currentMonthKey(now) {
  const today = now instanceof Date ? now : parseLocalDate(now);
  if (Number.isNaN(today.getTime())) return "";
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
}

function shiftMonthKey(month, delta) {
  const match = String(month || "").match(MONTH_ONLY);
  if (!match) return "";
  const d = new Date(Number(match[1]), Number(match[2]) - 1 + Number(delta || 0), 1, 12, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthsBetween(from, to) {
  const keys = [];
  if (!MONTH_ONLY.test(from) || !MONTH_ONLY.test(to) || from > to) return keys;
  let cursor = from;
  while (cursor && cursor <= to && keys.length < MAX_MONTHS + 1) {
    keys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
  }
  return keys;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Drop account-like digit runs and email addresses from free text.
 * Nine or more digits, with optional single spaces or dashes between them.
 */
function redactFeedText(value) {
  if (value == null) return "";
  const trimmed = String(value).trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .replace(/\d(?:[ \t-]?\d){8,}/g, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]");
}

function resolvedMonth(row) {
  const fromDate = monthKeyFromDate(row?.date);
  if (MONTH_ONLY.test(fromDate)) return fromDate;
  const month = String(row?.month || "").trim();
  return MONTH_ONLY.test(month) ? month : "";
}

function cleanTransaction(row) {
  const date = normalizeDateKey(row?.date);
  const month = resolvedMonth(row);
  const type = row?.type === "income" || row?.type === "expense" ? row.type : "";
  const amount = money(row?.amount);
  if (!date || !month || !type || amount == null || amount < 0) return null;
  const category = redactFeedText(row?.category_name);
  return {
    date,
    description: redactFeedText(row?.description),
    amount,
    type,
    category_name: category || "Uncategorized",
    month,
  };
}

function cleanBudget(row) {
  const name = redactFeedText(row?.name);
  const type = row?.type === "income" || row?.type === "expense" ? row.type : "";
  const budget_amount = money(row?.budget_amount);
  if (!name || !type || budget_amount == null || budget_amount < 0) return null;
  const color = row?.color != null && String(row.color).trim() ? String(row.color).trim() : null;
  const icon = row?.icon != null && String(row.icon).trim() ? String(row.icon).trim() : null;
  return { name, type, budget_amount, color, icon };
}

function sumAmount(rows, type) {
  return money(rows.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)) || 0;
}

function monthTotals(transactions, month) {
  const rows = transactions.filter((t) => t.month === month);
  const income = sumAmount(rows, "income");
  const expenses = sumAmount(rows, "expense");
  return {
    month,
    income,
    expenses,
    net: money(income - expenses) || 0,
    transaction_count: rows.length,
  };
}

function categoryActuals(transactions, budgets, month) {
  const rows = transactions.filter((t) => t.month === month);
  const byKey = new Map();

  const keyOf = (type, name) => `${type}|${name}`;

  for (const budget of budgets) {
    byKey.set(keyOf(budget.type, budget.name), {
      name: budget.name,
      type: budget.type,
      budget_amount: budget.budget_amount,
      actual: 0,
    });
  }

  for (const txn of rows) {
    const key = keyOf(txn.type, txn.category_name);
    if (!byKey.has(key)) {
      byKey.set(key, {
        name: txn.category_name,
        type: txn.type,
        budget_amount: null,
        actual: 0,
      });
    }
    const entry = byKey.get(key);
    entry.actual = money(entry.actual + txn.amount) || 0;
  }

  return [...byKey.values()]
    .map((entry) => ({
      ...entry,
      variance: entry.budget_amount == null ? null : money(entry.actual - entry.budget_amount),
    }))
    .sort((a, b) => {
      const type = (a.type === "expense" ? 0 : 1) - (b.type === "expense" ? 0 : 1);
      if (type !== 0) return type;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Build the Bennett cash feed.
 *
 * @param {object} opts
 * @param {Array} opts.transactions Transaction rows
 * @param {Array} opts.budgetCategories BudgetCategory rows
 * @param {number} [opts.months=6] trailing calendar months, including the current month (1–24)
 * @param {Date|string} [opts.now] reference instant for the window / generated_at
 * @param {string} [opts.generatedAt] override ISO timestamp (tests)
 */
export function buildBennettFeed({
  transactions = [],
  budgetCategories = [],
  months = DEFAULT_MONTHS,
  now = new Date(),
  generatedAt,
} = {}) {
  const monthsN = clampInt(months, MIN_MONTHS, MAX_MONTHS, DEFAULT_MONTHS);
  const current = currentMonthKey(now);
  const monthFrom = shiftMonthKey(current, -(monthsN - 1));
  const monthKeys = monthsBetween(monthFrom, current);

  const cleaned = (transactions || [])
    .map(cleanTransaction)
    .filter(Boolean)
    .filter((t) => monthKeys.includes(t.month))
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const byName = a.category_name.localeCompare(b.category_name);
      if (byName !== 0) return byName;
      return a.description.localeCompare(b.description);
    });

  const budgets = (budgetCategories || [])
    .map(cleanBudget)
    .filter(Boolean)
    .sort((a, b) => {
      const type = (a.type === "expense" ? 0 : 1) - (b.type === "expense" ? 0 : 1);
      if (type !== 0) return type;
      return a.name.localeCompare(b.name);
    });

  const budgetedExpenses = money(
    budgets.filter((b) => b.type === "expense").reduce((s, b) => s + b.budget_amount, 0)
  ) || 0;
  const budgetedIncome = money(
    budgets.filter((b) => b.type === "income").reduce((s, b) => s + b.budget_amount, 0)
  ) || 0;

  const generated_at = generatedAt
    || (now instanceof Date && !Number.isNaN(now.getTime())
      ? now.toISOString()
      : new Date().toISOString());

  return {
    schema_version: BENNETT_FEED_SCHEMA_VERSION,
    generated_at,
    window: {
      months: monthsN,
      month_from: monthFrom,
      current_month: current,
    },
    transactions: cleaned,
    budgets,
    stats: {
      months: monthKeys.map((month) => monthTotals(cleaned, month)),
      current: {
        ...monthTotals(cleaned, current),
        budgeted_income: budgetedIncome,
        budgeted_expenses: budgetedExpenses,
        by_category: categoryActuals(cleaned, budgets, current),
      },
    },
  };
}

export function parseBennettFeedArgs(input = {}) {
  return {
    months: clampInt(input.months, MIN_MONTHS, MAX_MONTHS, DEFAULT_MONTHS),
  };
}
