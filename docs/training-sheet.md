# Forgeday Training sheet

Full history of logged sets and runs, written to Christian’s Google Drive so a bot that can already read that Drive can see training without a manual export.

The JSON feed (`gogginsTrainingFeed`, Settings → Copy Goggins feed) stays a recent window. This sheet is every `WorkoutLog` row.

## What gets created

Function: **`syncTrainingSheet`**

1. The signed-in user’s `WorkoutLog` rows, then their `Meal` rows, are paged with `created_by` = their email, 200 rows at a time, up to 500 pages (100,000 rows) per entity. Page size and the cap live in `src/lib/trainingSheet.js`. If a cap is hit the response sets `truncated: true` and later pages of that entity are left out. The repo does not record how far back either history goes.
2. Rows are split into lifts and runs (`buildTrainingSheet`). Duplicate entity ids collapse to one row. Order is date, then exercise, then set number (lifts) or date, then distance, then time (runs).
3. Base44 returns the shared `googledrive` OAuth token (`base44.asServiceRole.connectors.getConnection('googledrive')`). That token is the Google account connected in **Base44 Integrations**, not Forgeday login. Sheets API calls use this same token. `drive.file` is a Sheets API scope for files this connection created. The live `googlesheets` connector was authorized with only the `email` scope, so its token cannot add tabs or write cells. The connector file now requests `https://www.googleapis.com/auth/spreadsheets` as well; that grant applies the next time Sheets is authorized. The sync does not wait on it.
4. Drive `files.list` looks for a non-trashed folder named exactly **Forgeday** (`application/vnd.google-apps.folder`). If none exists, Drive `files.create` makes it.
5. Drive `files.list` looks for a non-trashed spreadsheet named exactly **Forgeday Training** inside that folder. If none exists, Drive `files.create` makes it with that folder as the parent (`application/vnd.google-apps.spreadsheet`).
6. Sheets `spreadsheets.get` reads tab titles. One `batchUpdate` adds **Lifts**, **Runs**, and **Meals** when they are missing. A second `batchUpdate` deletes the default **Sheet1** tab only after another tab exists. Google rejects a request that would delete the only sheet.
7. Sheets `values.clear` wipes `Lifts!A:F`, `Runs!A:D`, and `Meals!A:J`, then `values.update` writes the header plus every row from A1 (`valueInputOption=RAW`).

Re-running does the same replacement. It does not append, so rows are not duplicated.

Saving a lift or a run in the workout logger queues this same function (about 1.5 seconds after the last save). Settings → **Sync to Google Sheet** runs it immediately and is the first-time backfill as well as every later backfill.

## Tabs

**Lifts** — one row per set: date, exercise, set number, reps, weight, notes.

**Runs** — date, distance (miles), time (minutes), notes. Only cardio whose stored type is `run`, or an exercise named Run or Running. Bike, swim, and other cardio stay in the JSON feed and are not written here.

**Meals** — one row per `Meal`: date, meal, food, quantity, serving, calories, protein, carbs, fat, notes. There is no clock time. `meal` is breakfast, lunch, dinner, or snack. Food is `food_name`, or `food_description` when the name is empty, or both when they differ. Quantity is the stored servings count. Serving is `serving_size`, or grams from `serving_size_g` when the label is empty. `fiber_g` and `sugar_g` stay off the sheet. Saving, editing, or deleting a meal queues the same full rewrite as a lift.

## One-time setup (Christian)

This does not turn on Google sign-in and does not change Forgeday login.

1. In the Base44 project, open **Integrations** (not the Forgeday login screen).
2. Connect **Google Drive** (`googledrive`) as the Google account whose Drive the Goggins bot already reads. The sync writes sheets with that Drive token.
3. Accept Drive file access (`drive.file`). The `googlesheets` connector file also requests `https://www.googleapis.com/auth/spreadsheets`; the copy that was connected with only `email` cannot call the Sheets API.
4. Sync this repo to the Base44 builder so the function `syncTrainingSheet` exists. Do not Publish unless you mean to.
5. In Forgeday, open Settings → **Sync to Google Sheet**.

The first successful sync creates the folder and spreadsheet if they are not already there, then fills both tabs from every logged set and run. Later saves and later button presses rewrite those tabs.

If Drive is not connected, the function returns `{ ok: false, step: "drive_token", message }` and does not write a sheet. Any later failure uses the same shape and is logged with `console.error`. The workout save itself still succeeds.

## History limits

`earliest_date` in the function response is the oldest derived row date for the signed-in user. This repository has no personal `WorkoutLog` rows, so there is no fixed earliest calendar date to quote. The example fixture’s oldest lift week is `2026-08-24` and its run is `2026-09-07`; those are tests, not live history.

Derived date, in order:

1. Explicit `date` on the log. Current-week **creates** stamp today’s local date. Updates do not overwrite it. Creates for a past program week leave `date` unset.
2. Otherwise `created_date` (when the row was saved) **only if** that calendar day sits in the same Monday week as `week_start`. A set logged during the week it belongs to keeps the day it was saved.
3. Otherwise `week_start`, the Monday of the program week. Logging a past week later therefore shows that Monday, not the day it was typed. The weekday inside that week is not stored.

Other gaps on older rows:

- There is no real per-day `date` on historical logs. Program `day` (1–5) is a template slot, not a weekday, and is not used as the date.
- Strength notes are usually blank. The lift logger does not write a notes field. A note appears only when one was already stored.
- Older run “notes” are the type token `run` (or `bike` / `swim` / `other`), not a sentence. The Runs sheet leaves that cell blank. New runs can store `{ "type": "run", "text": "..." }` from the notes line on the cardio row; a type with no sentence is still stored as the plain token so existing parsers keep working.
- Distance and time are present only if they were typed. They live in `weight` (miles) and `reps` (minutes). Blank means not logged. There is no separate run-time or distance column in the database.
- Per-set weight is whatever was typed. Empty 0/0 sets are omitted. A bodyweight set with reps keeps weight `0`.
- Planned sets, reps, and exercise lists live on `WorkoutProgram` templates, not on logs, and are not copied to the sheet.
- The “Cardio session” / “Lifting session” `Activity` row does not store distance, time, or per-set weight. The sheet reads `WorkoutLog` only.
- Bike, swim, and other cardio are omitted from both tabs on purpose.

The same limit list is returned as `history_limits` on every sync response (`TRAINING_HISTORY_LIMITS` in `src/lib/trainingSheet.js`).
