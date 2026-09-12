/**
 * Local notification hooks.
 *
 * No Capacitor LocalNotifications plugin ships with this web shell.
 * Use the browser Notification API when present; otherwise stay in-app.
 */

export const NOTIFICATION_MODES = {
  BROWSER: "browser",
  IN_APP: "in-app-only",
};

export function detectNotificationCapability(globalObj = globalThis) {
  const NotificationCtor = globalObj?.Notification;
  const supported = typeof NotificationCtor === "function";
  return {
    mode: supported ? NOTIFICATION_MODES.BROWSER : NOTIFICATION_MODES.IN_APP,
    canRequest: supported,
    permission: supported ? NotificationCtor.permission : "unsupported",
  };
}

export function notificationCapabilityCopy(cap) {
  if (cap?.permission === "granted") {
    return "Browser notifications are on. Forgeday will ping this device at most once a day per nudge.";
  }
  if (cap?.permission === "denied") {
    return "This browser blocked notifications. In-app banners still appear on Today.";
  }
  if (cap?.mode === NOTIFICATION_MODES.BROWSER) {
    return "Push from Apple is not available in this web shell. Allow browser notifications for a local ping, or keep banners only.";
  }
  return "This environment cannot show system notifications. Nudges stay on Today as banners.";
}

export function shouldShowInAppNudge(nudge, { today, dismissed } = {}) {
  if (!nudge) return false;
  return dismissed?.[nudge.id] !== today;
}

export function shouldFireLocalHook(nudge, { today, lastFired } = {}) {
  if (!nudge) return false;
  return lastFired?.[nudge.id] !== today;
}

export async function requestBrowserPermission(globalObj = globalThis) {
  const NotificationCtor = globalObj?.Notification;
  if (typeof NotificationCtor !== "function") {
    return { status: "unsupported" };
  }
  if (typeof NotificationCtor.requestPermission !== "function") {
    return { status: NotificationCtor.permission || "unsupported" };
  }
  const status = await NotificationCtor.requestPermission();
  return { status };
}

export function showBrowserNotification(payload, globalObj = globalThis) {
  const NotificationCtor = globalObj?.Notification;
  if (typeof NotificationCtor !== "function") return false;
  if (NotificationCtor.permission !== "granted") return false;
  try {
    // eslint-disable-next-line no-new
    new NotificationCtor(payload.title, {
      body: payload.body,
      tag: payload.id,
    });
    return true;
  } catch {
    return false;
  }
}

const DISMISS_KEY = "forgeday.nudge.dismissed";
const FIRED_KEY = "forgeday.nudge.lastFired";
const PREFS_KEY = "forgeday.notification.prefs";

function readJson(storage, key) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

export function readNudgeState(storage = globalThis.localStorage) {
  return {
    dismissed: readJson(storage, DISMISS_KEY),
    lastFired: readJson(storage, FIRED_KEY),
    localPrefs: readJson(storage, PREFS_KEY),
  };
}

export function dismissNudge(id, today, storage = globalThis.localStorage) {
  const dismissed = { ...readJson(storage, DISMISS_KEY), [id]: today };
  writeJson(storage, DISMISS_KEY, dismissed);
  return dismissed;
}

export function markNudgeFired(id, today, storage = globalThis.localStorage) {
  const lastFired = { ...readJson(storage, FIRED_KEY), [id]: today };
  writeJson(storage, FIRED_KEY, lastFired);
  return lastFired;
}

export function writeLocalPrefs(prefs, storage = globalThis.localStorage) {
  writeJson(storage, PREFS_KEY, prefs);
}
