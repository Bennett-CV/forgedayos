import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBennettFeed,
  parseBennettFeedArgs,
  BENNETT_FEED_SCHEMA_VERSION,
} from "./bennettFeed.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const NOW = "2026-09-17";

const FIXTURE_TRANSACTIONS = [
  { date: "2026-09-02", description: "Paycheck", amount: 4200, type: "income", category_name: "Salary", month: "2026-09" },
  { date: "2026-09-04", description: "Market", amount: 86.4, type: "expense", category_name: "Groceries", month: "2026-09" },
  { date: "2026-09-11", description: "September rent", amount: 1800, type: "expense", category_name: "Rent", month: "2026-09" },
  { date: "2026-08-03", description: "Paycheck", amount: 4200, type: "income", category_name: "Salary", month: "2026-08" },
  { date: "2026-08-15", description: "Market", amount: 92.1, type: "expense", category_name: "Groceries", month: "2026-08" },
  { date: "2026-07-20", description: "Coffee", amount: 4.5, type: "expense", category_name: "Dining", month: "2026-07" },
  // Outside a 3-month window ending 2026-09
  { date: "2026-06-01", description: "Old bill", amount: 10, type: "expense", category_name: "Utilities", month: "2026-06" },
];

const FIXTURE_BUDGETS = [
  { name: "Rent", type: "expense", budget_amount: 1800, color: "#c4a484", icon: "🏠" },
  { name: "Groceries", type: "expense", budget_amount: 400, color: "#8a9a7b", icon: "🥬" },
  { name: "Salary", type: "income", budget_amount: 4200, color: "#6b8f71", icon: "💼" },
];

export const EXAMPLE_BENNETT_FEED = buildBennettFeed({
  transactions: FIXTURE_TRANSACTIONS,
  budgetCategories: FIXTURE_BUDGETS,
  months: 3,
  now: NOW,
  generatedAt: "2026-09-17T12:00:00.000Z",
});

test("schema_version and window use the current month", () => {
  const feed = buildBennettFeed({ now: NOW, generatedAt: "2026-09-17T12:00:00.000Z" });
  assert.equal(feed.schema_version, BENNETT_FEED_SCHEMA_VERSION);
  assert.equal(feed.generated_at, "2026-09-17T12:00:00.000Z");
  assert.equal(feed.window.months, 6);
  assert.equal(feed.window.current_month, "2026-09");
  assert.equal(feed.window.month_from, "2026-04");
});

test("transactions and budgets stay inside the month window", () => {
  const feed = buildBennettFeed({
    transactions: FIXTURE_TRANSACTIONS,
    budgetCategories: FIXTURE_BUDGETS,
    months: 3,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  assert.equal(feed.window.month_from, "2026-07");
  assert.ok(!feed.transactions.some((t) => t.month === "2026-06"));
  assert.equal(feed.transactions.length, 6);
  assert.equal(feed.transactions[0].date, "2026-07-20");
  assert.equal(feed.budgets.length, 3);
  assert.equal(feed.budgets[0].name, "Groceries");
  assert.equal(feed.budgets[2].type, "income");
});

test("current month stats match budget versus actual", () => {
  const feed = EXAMPLE_BENNETT_FEED;
  assert.equal(feed.stats.current.income, 4200);
  assert.equal(feed.stats.current.expenses, 1886.4);
  assert.equal(feed.stats.current.net, 2313.6);
  assert.equal(feed.stats.current.budgeted_expenses, 2200);
  assert.equal(feed.stats.current.budgeted_income, 4200);
  assert.equal(feed.stats.current.transaction_count, 3);

  const groceries = feed.stats.current.by_category.find((c) => c.name === "Groceries");
  assert.equal(groceries.actual, 86.4);
  assert.equal(groceries.budget_amount, 400);
  assert.equal(groceries.variance, -313.6);

  const dining = feed.stats.current.by_category.find((c) => c.name === "Dining");
  assert.equal(dining, undefined);

  const july = feed.stats.months.find((m) => m.month === "2026-07");
  assert.equal(july.expenses, 4.5);
  assert.equal(july.income, 0);
  const august = feed.stats.months.find((m) => m.month === "2026-08");
  assert.equal(august.income, 4200);
  assert.equal(august.expenses, 92.1);
});

test("empty inputs yield empty collections and zero current totals", () => {
  const feed = buildBennettFeed({ now: NOW, generatedAt: "2026-09-17T12:00:00.000Z", months: 1 });
  assert.deepEqual(feed.transactions, []);
  assert.deepEqual(feed.budgets, []);
  assert.equal(feed.stats.current.income, 0);
  assert.equal(feed.stats.current.expenses, 0);
  assert.equal(feed.stats.current.net, 0);
  assert.deepEqual(feed.stats.current.by_category, []);
  assert.equal(feed.stats.months.length, 1);
});

test("parseBennettFeedArgs clamps months", () => {
  assert.deepEqual(parseBennettFeedArgs({}), { months: 6 });
  assert.deepEqual(parseBennettFeedArgs({ months: 3 }), { months: 3 });
  assert.deepEqual(parseBennettFeedArgs({ months: 99 }), { months: 24 });
  assert.deepEqual(parseBennettFeedArgs({ months: 0 }), { months: 1 });
});

test("feed omits identity fields and redacts account numbers and emails", () => {
  const feed = buildBennettFeed({
    transactions: [{
      date: "2026-09-05",
      description: "xfer acct 1234-5678-9012 from person@example.com",
      amount: 25,
      type: "expense",
      category_name: "Transfer",
      month: "2026-09",
      created_by: "person@example.com",
      account_number: "9876543210",
      plaid_transaction_id: "plaid-secret",
    }],
    budgetCategories: [{
      name: "Transfer",
      type: "expense",
      budget_amount: 100,
      created_by: "person@example.com",
      account_id: "acct_123456789",
    }],
    months: 1,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  const text = JSON.stringify(feed);
  assert.equal(text.includes("person@example.com"), false);
  assert.equal(text.includes("1234-5678-9012"), false);
  assert.equal(text.includes("9876543210"), false);
  assert.equal(text.includes("plaid"), false);
  assert.equal(text.includes("account_number"), false);
  assert.equal(text.includes("created_by"), false);
  assert.match(feed.transactions[0].description, /\[redacted\]/);
  assert.equal(feed.transactions[0].amount, 25);
});

test("checked-in fixture matches the builder", () => {
  const file = JSON.parse(readFileSync(join(ROOT, "docs/fixtures/bennett-feed.example.json"), "utf8"));
  assert.deepEqual(file, EXAMPLE_BENNETT_FEED);
});

test("deno mirror matches the app builder aside from the header", () => {
  const logic = (rel) => readFileSync(join(ROOT, rel), "utf8").replace(/\/\*[\s\S]*?\*\//, "").trim();
  assert.equal(
    logic("base44/functions/bennettCashFeed/bennettFeed.js"),
    logic("src/lib/bennettFeed.js"),
  );
});
