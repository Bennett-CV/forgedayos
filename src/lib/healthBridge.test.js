import { test } from "node:test";
import assert from "node:assert/strict";
import { detectHealthCapability, healthCapabilityCopy, HEALTH_MODES } from "./healthBridge.js";

test("web shell without plugins is honest file-import mode", () => {
  const cap = detectHealthCapability({});
  assert.equal(cap.mode, HEALTH_MODES.WEB_IMPORT);
  assert.equal(cap.canReadNative, false);
  assert.match(healthCapabilityCopy(cap).headline, /not connected/i);
});

test("only a real requestAuthorization plugin flips to HealthKit", () => {
  const cap = detectHealthCapability({
    Capacitor: { Plugins: { HealthKit: { requestAuthorization: () => {} } } },
  });
  assert.equal(cap.mode, HEALTH_MODES.HEALTHKIT);
  assert.equal(cap.canReadNative, true);
});

test("a named stub without requestAuthorization is ignored", () => {
  const cap = detectHealthCapability({
    Capacitor: { Plugins: { HealthKit: {} } },
  });
  assert.equal(cap.mode, HEALTH_MODES.WEB_IMPORT);
});
