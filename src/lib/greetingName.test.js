import { test } from "node:test";
import assert from "node:assert/strict";
import { greetingFirstName, greetingForHour, looksLikeEmailLocalPart } from "./greetingName.js";

test("prefers profile first name over an email-ish full_name", () => {
  assert.equal(
    greetingFirstName({
      email: "christian.votta@example.com",
      full_name: "christian.votta",
      profile: { first_name: "Christian" },
    }),
    "Christian"
  );
});

test("uses the first token of a real display name", () => {
  assert.equal(
    greetingFirstName({
      email: "christian.votta@example.com",
      full_name: "Christian Votta",
    }),
    "Christian"
  );
});

test("never greets with a raw email local-part", () => {
  assert.equal(
    greetingFirstName({
      email: "christian.votta@example.com",
      full_name: "christian.votta",
    }),
    "there"
  );
  assert.equal(looksLikeEmailLocalPart("christian.votta", "christian.votta@example.com"), true);
});

test("single-token proper names are kept", () => {
  assert.equal(greetingFirstName({ full_name: "Chris", email: "christian.votta@example.com" }), "Chris");
});

test("greetingForHour bands", () => {
  assert.equal(greetingForHour(8), "Good morning");
  assert.equal(greetingForHour(13), "Good afternoon");
  assert.equal(greetingForHour(19), "Good evening");
});
