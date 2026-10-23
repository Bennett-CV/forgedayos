import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrainingSheet } from "./trainingSheet.js";
import {
  FORGEDAY_FOLDER_NAME,
  FORGEDAY_SPREADSHEET_NAME,
  syncTrainingSpreadsheet,
} from "./googleTrainingSheet.js";

function mockFetch(script) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method, body, authorization: init.headers?.Authorization || "" });
    const step = script.shift();
    if (!step) throw new Error(`unexpected ${method} ${url}`);
    return {
      ok: step.status ? step.status < 400 : true,
      status: step.status || 200,
      text: async () => JSON.stringify(step.data ?? {}),
    };
  };
  return { fetchImpl, calls };
}

const LIFT_VALUES = [["date", "exercise", "set number", "reps", "weight", "notes"], ["2026-09-15", "Squat", 1, 5, 100, ""]];
const RUN_VALUES = [["date", "distance", "time", "notes"], ["2026-09-07", 3.2, 32, ""]];
const MEAL_VALUES = [[
  "date", "meal", "food", "quantity", "serving", "calories", "protein", "carbs", "fat", "notes",
], ["2026-09-16", "dinner", "Salmon", 1, "1 fillet", 360, 34, 0, 18, ""]];

test("creates the folder and spreadsheet, then replaces both grids", async () => {
  const { fetchImpl, calls } = mockFetch([
    { data: { files: [] } },
    { data: { id: "folder-1" } },
    { data: { files: [] } },
    { data: { id: "sheet-1" } },
    { data: { sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }] } },
    { data: {} },
    { data: { sheets: [
      { properties: { sheetId: 0, title: "Sheet1" } },
      { properties: { sheetId: 1, title: "Lifts" } },
      { properties: { sheetId: 2, title: "Runs" } },
      { properties: { sheetId: 3, title: "Meals" } },
    ] } },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
  ]);

  const result = await syncTrainingSpreadsheet({
    driveToken: "drive-token",
    sheetsToken: "sheets-token",
    liftValues: LIFT_VALUES,
    runValues: RUN_VALUES,
    mealValues: MEAL_VALUES,
    fetchImpl,
  });

  assert.equal(result.folder_created, true);
  assert.equal(result.spreadsheet_created, true);
  assert.equal(result.folder_name, FORGEDAY_FOLDER_NAME);
  assert.equal(result.spreadsheet_name, FORGEDAY_SPREADSHEET_NAME);
  assert.equal(result.spreadsheet_url, "https://docs.google.com/spreadsheets/d/sheet-1");

  const folderQuery = new URL(calls[0].url).searchParams.get("q");
  assert.match(folderQuery, /name = 'Forgeday'/);
  assert.match(folderQuery, /application\/vnd\.google-apps\.folder/);
  assert.equal(calls[1].body.name, "Forgeday");
  assert.equal(calls[1].body.mimeType, "application/vnd.google-apps.folder");

  const sheetQuery = new URL(calls[2].url).searchParams.get("q");
  assert.match(sheetQuery, /name = 'Forgeday Training'/);
  assert.match(sheetQuery, /folder-1/);
  assert.deepEqual(calls[3].body.parents, ["folder-1"]);

  const batches = calls.filter((call) => String(call.url).includes(":batchUpdate"));
  assert.deepEqual(batches[0].body.requests.map((request) => request.addSheet.properties.title), [
    "Lifts",
    "Runs",
    "Meals",
  ]);
  assert.deepEqual(batches[1].body.requests.map((request) => Object.keys(request)[0]), [
    "deleteSheet",
  ]);
  assert.ok(calls.indexOf(batches[0]) < calls.indexOf(batches[1]));

  const writes = calls.filter((call) => call.method === "PUT");
  assert.equal(writes.length, 3);
  assert.match(writes[0].url, /valueInputOption=RAW/);
  assert.match(writes[0].url, /Lifts!A1/);
  assert.deepEqual(writes[0].body.values, LIFT_VALUES);
  assert.deepEqual(writes[1].body.values, RUN_VALUES);
  assert.match(writes[2].url, /Meals!A1/);
  assert.deepEqual(writes[2].body.values, MEAL_VALUES);
  const clears = calls.filter((call) => call.method === "POST" && String(call.url).includes(":clear"));
  assert.equal(clears.length, 3);
  assert.match(clears[0].url, /Lifts!A%3AF:clear/);
  assert.match(clears[2].url, /Meals!A%3AJ:clear/);
  assert.ok(calls.indexOf(batches[1]) < calls.indexOf(clears[0]));
});

test("sheets calls can use the drive token, and a sheets error names its step", async () => {
  const created = mockFetch([
    { data: { files: [{ id: "folder-1" }] } },
    { data: { files: [{ id: "sheet-9" }] } },
    { data: { sheets: [
      { properties: { sheetId: 1, title: "Lifts" } },
      { properties: { sheetId: 2, title: "Runs" } },
      { properties: { sheetId: 3, title: "Meals" } },
    ] } },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
    { data: {} },
  ]);
  await syncTrainingSpreadsheet({
    driveToken: "drive-token",
    liftValues: LIFT_VALUES,
    runValues: RUN_VALUES,
    mealValues: MEAL_VALUES,
    fetchImpl: created.fetchImpl,
  });
  const sheetCalls = created.calls.filter((call) => String(call.url).includes("sheets.googleapis.com"));
  assert.ok(sheetCalls.length >= 1);
  assert.ok(sheetCalls.every((call) => call.authorization === "Bearer drive-token"));

  const denied = mockFetch([
    { data: { files: [{ id: "folder-1" }] } },
    { data: { files: [{ id: "sheet-9" }] } },
    { status: 403, data: { error: { message: "Request had insufficient authentication scopes." } } },
  ]);
  await assert.rejects(
    () => syncTrainingSpreadsheet({
      driveToken: "drive-token",
      liftValues: LIFT_VALUES,
      runValues: RUN_VALUES,
      fetchImpl: denied.fetchImpl,
    }),
    (error) => {
      assert.equal(error.step, "read_tabs");
      assert.match(error.message, /insufficient authentication scopes/);
      return true;
    }
  );
});

test("re-running finds the existing file and writes the same rows", async () => {
  const grids = buildTrainingSheet([
    { id: "a", week_start: "2026-09-14", exercise: "Squat", set_number: 1, weight: 100, reps: 5, date: "2026-09-15" },
    { id: "b", week_start: "2026-09-07", exercise: "Cardio", set_number: 1, weight: 3.2, reps: 32, notes: "run" },
  ]);

  function scripted() {
    return mockFetch([
      { data: { files: [{ id: "folder-1", name: "Forgeday" }] } },
      { data: { files: [{ id: "sheet-9", name: "Forgeday Training" }] } },
      { data: { sheets: [
        { properties: { sheetId: 1, title: "Lifts" } },
        { properties: { sheetId: 2, title: "Runs" } },
        { properties: { sheetId: 3, title: "Meals" } },
      ] } },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
    ]);
  }

  const first = scripted();
  const second = scripted();
  const opts = {
    driveToken: "drive-token",
    sheetsToken: "sheets-token",
    liftValues: grids.liftValues,
    runValues: grids.runValues,
    mealValues: MEAL_VALUES,
  };
  const a = await syncTrainingSpreadsheet({ ...opts, fetchImpl: first.fetchImpl });
  const b = await syncTrainingSpreadsheet({ ...opts, fetchImpl: second.fetchImpl });

  assert.equal(a.folder_created, false);
  assert.equal(b.spreadsheet_created, false);
  assert.equal(a.spreadsheet_id, b.spreadsheet_id);
  const puts = (calls) => calls.filter((call) => call.method === "PUT").map((call) => call.body.values);
  assert.deepEqual(puts(first.calls), puts(second.calls));
  assert.equal(first.calls.some((call) => call.method === "POST" && call.body?.name), false);
  assert.equal(first.calls.some((call) => String(call.url).includes(":batchUpdate")), false);
});
