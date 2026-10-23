# MCP tool: `forgeday_goggins_training`

Thin descriptor for wrapping the Forgeday Goggins training feed. Not a full MCP server — paste into a bot/MCP config when ready.

## Tool

```json
{
  "name": "forgeday_goggins_training",
  "description": "Read-only Forgeday training feed for the Goggins cut coach: current WorkoutProgram summary, recent WorkoutLog history grouped by week/day/exercise, WeightLog series, and small derived stats (best sets, sessions this week, weight deltas). No writes. No finance.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "weeks": {
        "type": "integer",
        "minimum": 1,
        "maximum": 26,
        "default": 10,
        "description": "How many Monday-based training weeks of WorkoutLog to include (inclusive of the current week)."
      },
      "weight_days": {
        "type": "integer",
        "minimum": 7,
        "maximum": 365,
        "default": 90,
        "description": "How many trailing calendar days of WeightLog to include."
      }
    },
    "additionalProperties": false
  }
}
```

## Implementation sketch

1. Call Base44 function `gogginsTrainingFeed` with `{ weeks, weight_days }` using the user’s Forgeday auth.
2. Return the JSON body unchanged (`schema_version`, `generated_at`, `program`, `workouts`, `body_weight`, `stats`).
3. On 401, surface “Forgeday session required”; do not invent empty coaching data.

See `docs/goggins-feed.md` for the full payload contract.
