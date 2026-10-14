# Bennett cash feed (read-only)

Versioned JSON export of transactions and budgets for the Bennett cash coach (and any later MCP wrapper). **Read-only.** No write-back, no Plaid, no account numbers, no auth redesign.

## Schema

- `schema_version`: currently `1.0.0`
- `generated_at`: ISO-8601 timestamp
- Pure builder (source of truth + unit tests): `src/lib/bennettFeed.js`
- Deno copy shipped with the Base44 function: `base44/functions/bennettCashFeed/bennettFeed.js`  
  Keep those two files identical when changing feed shape.

## Payload shape

```json
{
  "schema_version": "1.0.0",
  "generated_at": "2026-09-17T12:00:00.000Z",
  "window": {
    "months": 3,
    "month_from": "2026-07",
    "current_month": "2026-09"
  },
  "transactions": [
    {
      "date": "2026-09-04",
      "description": "Market",
      "amount": 86.4,
      "type": "expense",
      "category_name": "Groceries",
      "month": "2026-09"
    }
  ],
  "budgets": [
    {
      "name": "Groceries",
      "type": "expense",
      "budget_amount": 400,
      "color": "#8a9a7b",
      "icon": "🥬"
    }
  ],
  "stats": {
    "months": [
      { "month": "2026-09", "income": 4200, "expenses": 1886.4, "net": 2313.6, "transaction_count": 3 }
    ],
    "current": {
      "month": "2026-09",
      "income": 4200,
      "expenses": 1886.4,
      "net": 2313.6,
      "transaction_count": 3,
      "budgeted_income": 4200,
      "budgeted_expenses": 2200,
      "by_category": [
        { "name": "Groceries", "type": "expense", "budget_amount": 400, "actual": 86.4, "variance": -313.6 }
      ]
    }
  }
}
```

Full fixture: `docs/fixtures/bennett-feed.example.json`. `npm test` locks that file to `EXAMPLE_BENNETT_FEED`.

### Field notes

| Block | Source | Notes |
|---|---|---|
| `transactions` | `Transaction` | Date, description, positive amount, `income` / `expense`, category name, `YYYY-MM`. Default last **6** months including the current month (clamp 1–24). |
| `budgets` | `BudgetCategory` | Name, type, monthly `budget_amount`, optional color and icon. Not windowed — targets are monthly. |
| `stats.months` | derived | One row per month in the window, oldest first. Income, expenses, net, count. |
| `stats.current.by_category` | derived | Current month only. `variance` is actual − budget. A negative expense variance is under budget. |
| omitted | — | `created_by`, ids, `category_id`, Plaid ids, account numbers, and email addresses. Digit runs of 9+ in descriptions are `[redacted]`. |

Blank category names become `Uncategorized`. Rows with a missing date, a bad type, or a negative amount are dropped.

## How to call (Base44 function)

Function name: **`bennettCashFeed`**

From the Forgeday client (authed session):

```js
const { data } = await base44.functions.invoke("bennettCashFeed", { months: 6 });
```

| Arg | Default | Range |
|---|---|---|
| `months` | `6` | 1–24 |

HTTP:

- Method: `POST` (or `GET` with `?months=6`)
- Auth: the same Base44 session as the other functions
- Response: feed JSON above, or `{ "error": "Unauthorized" }` with 401

Does **not** write entities. Does **not** call Plaid. Does **not** include account numbers.

> Deploy note: syncing this repo to Base44 makes the function available in the Builder. **Do not Publish live** unless explicitly asked. Local `npm test` validates the builder without Publish.

## Client-side / Settings export

Settings → **Copy Bennett feed** builds the same JSON in the browser via `buildBennettFeed` (no function deploy required).

## MCP tool descriptor

See `docs/mcp-forgeday-bennett-cash.md`. Tool name: `forgeday_bennett_cash`.
