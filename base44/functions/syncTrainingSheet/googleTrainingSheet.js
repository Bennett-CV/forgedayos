/**
 * Find-or-create the Forgeday Drive folder and Forgeday Training spreadsheet,
 * then replace the Lifts and Runs grids. Re-running writes the same body;
 * it does not append.
 *
 * SOURCE OF TRUTH. Keep identical to
 * base44/functions/syncTrainingSheet/googleTrainingSheet.js
 */

export const FORGEDAY_FOLDER_NAME = "Forgeday";
export const FORGEDAY_SPREADSHEET_NAME = "Forgeday Training";
export const LIFTS_TAB = "Lifts";
export const RUNS_TAB = "Runs";
export const MEALS_TAB = "Meals";

const DATA_TABS = [LIFTS_TAB, RUNS_TAB, MEALS_TAB];

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function stepError(step, error) {
  const message = error instanceof Error ? error.message : String(error);
  const wrapped = new Error(message);
  wrapped.step = step;
  throw wrapped;
}

async function runStep(step, fn) {
  try {
    return await fn();
  } catch (error) {
    if (error && error.step) throw error;
    stepError(step, error);
  }
}

async function googleJson(fetchImpl, token, url, { method = "GET", body } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body == null ? {} : { "Content-Type": "application/json" }),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 200) };
    }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || response.status;
    throw new Error(`Google ${method} ${response.status}: ${String(message).slice(0, 300)}`);
  }
  return data || {};
}

async function findFiles(fetchImpl, token, query) {
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name)",
    spaces: "drive",
    pageSize: "10",
    orderBy: "createdTime",
  });
  const data = await googleJson(
    fetchImpl,
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  return Array.isArray(data.files) ? data.files : [];
}

async function findOrCreateFolder(fetchImpl, driveToken) {
  const name = escapeDriveQuery(FORGEDAY_FOLDER_NAME);
  const existing = await findFiles(
    fetchImpl,
    driveToken,
    `name = '${name}' and mimeType = '${FOLDER_MIME}' and trashed = false`
  );
  if (existing.length > 0) {
    return { id: existing[0].id, created: false, matches: existing.length };
  }
  const created = await googleJson(fetchImpl, driveToken, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    body: { name: FORGEDAY_FOLDER_NAME, mimeType: FOLDER_MIME },
  });
  return { id: created.id, created: true, matches: 1 };
}

async function findOrCreateSpreadsheet(fetchImpl, driveToken, folderId) {
  const name = escapeDriveQuery(FORGEDAY_SPREADSHEET_NAME);
  const existing = await findFiles(
    fetchImpl,
    driveToken,
    `name = '${name}' and mimeType = '${SHEET_MIME}' and '${folderId}' in parents and trashed = false`
  );
  if (existing.length > 0) {
    return { id: existing[0].id, created: false, matches: existing.length };
  }
  const created = await googleJson(fetchImpl, driveToken, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    body: {
      name: FORGEDAY_SPREADSHEET_NAME,
      mimeType: SHEET_MIME,
      parents: [folderId],
    },
  });
  return { id: created.id, created: true, matches: 1 };
}

function sheetProperties(meta) {
  return (meta.sheets || []).map((sheet) => sheet.properties || {});
}

async function readSheets(fetchImpl, sheetsToken, spreadsheetId) {
  const meta = await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`
  );
  return sheetProperties(meta);
}

async function batchUpdate(fetchImpl, sheetsToken, spreadsheetId, requests) {
  await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    { method: "POST", body: { requests } }
  );
}

/**
 * Add Lifts, Runs, and Meals first. Delete Sheet1 only in a later request,
 * after another tab exists. Google rejects a batch that would remove the only sheet.
 */
async function ensureTabs(fetchImpl, sheetsToken, spreadsheetId) {
  let sheets = await runStep("read_tabs", () => readSheets(fetchImpl, sheetsToken, spreadsheetId));
  const titles = new Set(sheets.map((sheet) => sheet.title));
  const adds = DATA_TABS
    .filter((title) => !titles.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));
  if (adds.length > 0) {
    await runStep("add_tabs", () => batchUpdate(fetchImpl, sheetsToken, spreadsheetId, adds));
    sheets = await runStep("read_tabs", () => readSheets(fetchImpl, sheetsToken, spreadsheetId));
  }

  const titlesNow = new Set(sheets.map((sheet) => sheet.title));
  const defaultSheet = sheets.find((sheet) => sheet.title === "Sheet1");
  const otherSheetExists = DATA_TABS.some((title) => titlesNow.has(title));
  if (otherSheetExists && defaultSheet && defaultSheet.sheetId != null) {
    await runStep("delete_sheet1", () => batchUpdate(fetchImpl, sheetsToken, spreadsheetId, [
      { deleteSheet: { sheetId: defaultSheet.sheetId } },
    ]));
  }
  return { added: adds.map((request) => request.addSheet.properties.title) };
}

function valuesUrl(spreadsheetId, range, suffix) {
  const id = encodeURIComponent(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodedRange}${suffix}`;
}

async function replaceGrid(fetchImpl, sheetsToken, spreadsheetId, title, values, columnCount, stepPrefix) {
  const lastColumn = String.fromCharCode("A".charCodeAt(0) + columnCount - 1);
  await runStep(`clear_${stepPrefix}`, () => googleJson(
    fetchImpl,
    sheetsToken,
    valuesUrl(spreadsheetId, `${title}!A:${lastColumn}`, ":clear"),
    { method: "POST", body: {} }
  ));
  await runStep(`write_${stepPrefix}`, () => googleJson(
    fetchImpl,
    sheetsToken,
    valuesUrl(spreadsheetId, `${title}!A1`, "?valueInputOption=RAW"),
    { method: "PUT", body: { values } }
  ));
}

/**
 * @param {object} opts
 * @param {string} opts.driveToken OAuth token from the Base44 googledrive connector.
 *   drive.file covers Sheets API calls on files this connection created.
 *   Pass sheetsToken only when that token itself has the spreadsheets scope.
 * @param {string} [opts.sheetsToken]
 * @param {Array<Array>} opts.liftValues header + one row per set
 * @param {Array<Array>} opts.runValues header + one row per run
 * @param {Array<Array>} opts.mealValues header + one row per Meal
 * @param {typeof fetch} [opts.fetchImpl]
 */
export async function syncTrainingSpreadsheet({
  driveToken,
  sheetsToken,
  liftValues,
  runValues,
  mealValues,
  fetchImpl = fetch,
}) {
  if (!driveToken) stepError("drive_token", new Error("Google Drive is not connected in Base44."));
  const sheetToken = sheetsToken || driveToken;
  const mealsGrid = mealValues || [[
    "date", "meal", "food", "quantity", "serving", "calories", "protein", "carbs", "fat", "notes",
  ]];

  const folder = await runStep("find_folder", () => findOrCreateFolder(fetchImpl, driveToken));
  const spreadsheet = await runStep("find_spreadsheet", () => findOrCreateSpreadsheet(fetchImpl, driveToken, folder.id));
  await ensureTabs(fetchImpl, sheetToken, spreadsheet.id);
  await replaceGrid(fetchImpl, sheetToken, spreadsheet.id, LIFTS_TAB, liftValues, 6, "lifts");
  await replaceGrid(fetchImpl, sheetToken, spreadsheet.id, RUNS_TAB, runValues, 4, "runs");
  await replaceGrid(fetchImpl, sheetToken, spreadsheet.id, MEALS_TAB, mealsGrid, mealsGrid[0].length, "meals");

  return {
    folder_id: folder.id,
    folder_name: FORGEDAY_FOLDER_NAME,
    folder_created: folder.created,
    spreadsheet_id: spreadsheet.id,
    spreadsheet_name: FORGEDAY_SPREADSHEET_NAME,
    spreadsheet_created: spreadsheet.created,
    spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheet.id}`,
  };
}
