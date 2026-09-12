/**
 * Capability detection for Apple Health / HealthKit.
 *
 * This repo is a Base44 web app. There is no Capacitor HealthKit plugin
 * in package.json. Do not invent a native bridge — stay honest in the UI.
 *
 * When a future IPA exposes a real plugin (`HealthKit.requestAuthorization`
 * or `window.ForgedayHealthKit`), `detectHealthCapability` will report
 * `healthkit` so the same Health page can switch modes.
 */

export const HEALTH_MODES = {
  WEB_IMPORT: "web-import",
  HEALTHKIT: "healthkit",
};

function pluginFrom(globalObj) {
  if (!globalObj || typeof globalObj !== "object") return null;
  const forgeday = globalObj.ForgedayHealthKit;
  if (forgeday && typeof forgeday.requestAuthorization === "function") return forgeday;
  const plugins = globalObj.Capacitor?.Plugins;
  if (!plugins || typeof plugins !== "object") return null;
  const named = plugins.HealthKit || plugins.CapacitorHealthkit;
  if (named && typeof named.requestAuthorization === "function") return named;
  return null;
}

/**
 * @param {object} [globalObj]
 * @returns {{
 *   mode: string,
 *   label: string,
 *   canReadNative: boolean,
 *   reason: string,
 * }}
 */
export function detectHealthCapability(globalObj = globalThis) {
  const plugin = pluginFrom(globalObj);
  if (plugin) {
    return {
      mode: HEALTH_MODES.HEALTHKIT,
      label: "Apple Health",
      canReadNative: true,
      reason: "A HealthKit bridge is available on this device.",
    };
  }
  return {
    mode: HEALTH_MODES.WEB_IMPORT,
    label: "File import",
    canReadNative: false,
    reason:
      "This shell is a web app. HealthKit is not available until a native IPA exposes a HealthKit bridge.",
  };
}

export function healthCapabilityCopy(cap) {
  if (cap?.mode === HEALTH_MODES.HEALTHKIT) {
    return {
      headline: "Apple Health is available on this device.",
      body: "You can read weight, steps, and sleep through the native bridge when you allow access.",
    };
  }
  return {
    headline: "Apple Health is not connected here.",
    body: "Import a CSV or an Apple Health export, or log a sample by hand. Native HealthKit will use this same page when the IPA includes a bridge.",
  };
}
