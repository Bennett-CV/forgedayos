# Goggins training feed (read-only)

Versioned JSON export of lifts + body-weight history for the Grok “Goggins” cut coach (and any later MCP wrapper). **Read-only.** No write-back, no finance/Plaid, no auth redesign.

## Schema

- `schema_version`: currently `1.0.0`
- `generated_at`: ISO-8601 timestamp
- Pure builder (source of truth + unit tests): `src/lib/gogginsFeed.js`
- Deno copy shipped with the Base44 function: `base44/functions/gogginsTrainingFeed/gogginsFeed.js`  
  Keep those two files identical when changing feed shape.

## Payload shape

```json
{
  "schema_version": "1.0.0",
  "generated_at": "2026-09-17T12:00:00.000Z",
  "window": {
    "weeks": 10,
    "weight_days": 90,
    "week_start_from": "2026-07-13",
    "current_week_start": "2026-09-14",
    "weight_from": "2026-06-19"
  },
  "program": {
    "days": [
      {
        "day": 1,
        "label": "Full Body A",
        "type": "strength",
        "exercises": [
          { "name": "Goblet Squat", "sets": 3, "reps": 10, "isAmrap": false, "isCardio": false }
        ]
      }
    ]
  },
  "workouts": [
    {
      "week_start": "2026-09-14",
      "day": 1,
      "exercises": [
        {
          "name": "Goblet Squat",
          "sets": [
            { "set_number": 1, "weight": 70, "reps": 10, "is_amrap": false, "notes": null }
          ]
        }
      ]
    }
  ],
  "body_weight": [
    { "date": "2026-09-17", "weight_lbs": 183.6, "notes": "morning" }
  ],
  "stats": {
    "sessions_this_week": 1,
    "best_sets": [
      { "exercise": "Goblet Squat", "weight": 80, "reps": 5, "week_start": "2026-08-24", "day": 1 }
    ],
    "latest_weight_lbs": 183.6,
    "weight_delta_7d": -1.4,
    "weight_delta_14d": -2.6,
    "weight_delta_28d": -4.4
  }
}
```

Full fixture: run `node --test src/lib/gogginsFeed.test.js` or import `EXAMPLE_GOGGINS_FEED` from that test file. A checked-in snapshot lives at `docs/fixtures/goggins-feed.example.json`.

### Field notes

| Block | Source | Notes |
|---|---|---|
| `program` | `WorkoutProgram` | Day templates only (no logged loads). |
| `workouts` | `WorkoutLog` | Grouped week → day → exercise → sets. Empty 0/0 auto-saves omitted. Default last **10** weeks (clamp 1–26). |
| `body_weight` | `WeightLog` | Ascending by date. Default last **90** days (clamp 7–365). |
| `stats.best_sets` | derived | Heaviest set per exercise in the workout window (ties → more reps). |
| `stats.sessions_this_week` | derived | Distinct `(week_start, day)` sessions in the current Monday week. |
| `stats.weight_delta_*` | derived | Latest − nearest weigh-in on/before N days ago; `null` if insufficient history. |

## How to call (Base44 function)

Function name: **`gogginsTrainingFeed`**

From the Forgeday client (authed session):

```js
const { data } = await base44.functions.invoke("gogginsTrainingFeed", {
  weeks: 10,
  weight_days: 90,
});
```

Args (all optional):

| Arg | Default | Range |
|---|---|---|
| `weeks` | `10` | 1–26 |
| `weight_days` | `90` | 7–365 |

HTTP (same Base44 function URL your app already uses for `calculateNutritionGoals` / food search):

- Method: `POST` (or `GET` with query `?weeks=10&weight_days=90`)
- Auth: Base44 session cookie / bearer as for other functions
- Response: feed JSON above, or `{ "error": "Unauthorized" }` with 401

Does **not** write entities. Does **not** include transactions, budgets, or Plaid.

> Deploy note: syncing this repo to Base44 makes the function available in the Builder; **do not Publish live** unless Christian explicitly asks. Local `npm test` validates the builder without Publish.

## Client-side / Settings export

Settings → **Copy Goggins feed** builds the same JSON in-browser via `buildGogginsFeed` (no function deploy required). Useful for pasting into a bot chat while the function is still draft.

## MCP tool descriptor (optional wrapper)

See `docs/mcp-forgeday-goggins-training.md`. Tool name: `forgeday_goggins_training`.

## Verify (Christian / Musk)

1. `npm test` — includes `src/lib/gogginsFeed.test.js`.
2. In Base44 Builder (draft, not Publish): confirm function `gogginsTrainingFeed` appears after Git sync.
3. While logged into Forgeday: Settings → **Copy Goggins feed**, paste into a JSON viewer — expect `schema_version`, `program`, `workouts`, `body_weight`, `stats`.
4. Optional: `base44.functions.invoke("gogginsTrainingFeed", { weeks: 8, weight_days: 60 })` from the browser console on a logged-in session (after the function is deployed to the environment you are hitting).
5. Confirm payload has **no** finance fields and the call path performs **no** creates/updates/deletes.
