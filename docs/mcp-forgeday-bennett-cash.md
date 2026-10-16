# MCP tool: `forgeday_bennett_cash`

Thin descriptor for wrapping the Forgeday Bennett cash feed. Not a full MCP server — paste into a bot/MCP config when ready.

## Tool

```json
{
  "name": "forgeday_bennett_cash",
  "description": "Read-only Forgeday cash feed: recent Transaction rows, BudgetCategory targets, and derived monthly totals (income, expenses, net, budget versus actual). No writes. No Plaid. No account numbers.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "months": {
        "type": "integer",
        "minimum": 1,
        "maximum": 24,
        "default": 6,
        "description": "How many trailing calendar months of transactions to include, counting the current month."
      }
    },
    "additionalProperties": false
  }
}
```

## Implementation sketch

1. Call Base44 function `bennettCashFeed` with `{ months }` using the user’s Forgeday auth.
2. Return the JSON body unchanged (`schema_version`, `generated_at`, `window`, `transactions`, `budgets`, `stats`).
3. On 401, surface “Forgeday session required”; do not invent balances or account numbers.

See `docs/bennett-feed.md` for the full payload contract.
