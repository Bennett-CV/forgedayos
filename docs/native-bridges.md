# Native bridges (HealthKit, widgets, notifications)

Forgeday P3 ships as a Base44 **web** app. This file is the contract for a later IPA so we do not invent broken Capacitor plugins today.

## HealthKit

Runtime detection lives in `src/lib/healthBridge.js`.

Today:

- No Capacitor HealthKit plugin is installed.
- The Health page (`/health`) is file import + manual samples.
- Weight writes `WeightLog`. Steps / sleep / imported workouts write `Activity` with a `[health]` note.

When an IPA adds a real bridge, expose **one** of:

```js
window.ForgedayHealthKit.requestAuthorization()
// or
Capacitor.Plugins.HealthKit.requestAuthorization()
```

Required shape (do not ship a stub without these):

```ts
requestAuthorization(): Promise<{ granted: boolean }>
readSamples(opts: {
  kinds: Array<"weight" | "steps" | "sleep">
  startDate: string // YYYY-MM-DD
  endDate: string
}): Promise<Array<{ date: string; kind: string; value: number; unit: string }>>
```

`detectHealthCapability()` already flips to `healthkit` when `requestAuthorization` exists. Map native samples through `parseHealthText` / `planHealthWrites` — do not bypass dedupe.

## iOS widgets

In-app glance cards are built by `buildGlanceWidgets` in `src/lib/glanceWidgets.js`.

Stable ids for WidgetKit:

| id | suggested widget |
|---|---|
| `today_progress` | ForgedayTodayWidget |
| `next_action` | ForgedayNextWidget |
| `weigh_in` | ForgedayWeightWidget |
| `weekly_review` | ForgedayReviewWidget |
| `health_steps` | ForgedayStepsWidget |

Payload: `{ id, kind, title, value, subtitle, href, empty }`.

Base44 / this webview cannot install WidgetKit extensions. An IPA should snapshot the same payload to `UserDefaults` / an App Group.

## Notifications

`src/lib/smartNotifications.js` decides **when**. `src/lib/notificationBridge.js` decides **how**.

Triggers:

1. Weekly Review ready (late week, no saved review)
2. Incomplete Today next action (after 11:00 local)
3. Stale weigh-in (default 7 days, user-configurable 3 / 7 / 14)

Today:

- In-app banner on Today
- Optional browser `Notification` (permission in Settings)
- One local ping per kind per local day

A future Capacitor `LocalNotifications` plugin should consume `toLocalNotificationPayloads(nudges)` only. Do not schedule from the UI if the plugin is missing.
