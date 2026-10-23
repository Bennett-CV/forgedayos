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

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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

async function ensureTabs(fetchImpl, sheetsToken, spreadsheetId) {
  const meta = await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`
  );
  const sheets = (meta.sheets || []).map((sheet) => sheet.properties || {});
  const titles = new Set(sheets.map((sheet) => sheet.title));
  const requests = [];
  if (!titles.has(LIFTS_TAB)) requests.push({ addSheet: { properties: { title: LIFTS_TAB } } });
  if (!titles.has(RUNS_TAB)) requests.push({ addSheet: { properties: { title: RUNS_TAB } } });
  const defaultSheet = sheets.find((sheet) => sheet.title === "Sheet1");
  if (defaultSheet && defaultSheet.sheetId != null) {
    requests.push({ deleteSheet: { sheetId: defaultSheet.sheetId } });
  }
  if (requests.length === 0) return { added: [] };
  await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    { method: "POST", body: { requests } }
  );
  return { added: requests.filter((request) => request.addSheet).map((request) => request.addSheet.properties.title) };
}

async function replaceGrid(fetchImpl, sheetsToken, spreadsheetId, title, values, columnCount) {
  const lastColumn = String.fromCharCode("A".charCodeAt(0) + columnCount - 1);
  const clearRange = encodeURIComponent(`${title}!A:${lastColumn}`);
  await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${clearRange}:clear`,
    { method: "POST", body: {} }
  );
  const writeRange = encodeURIComponent(`${title}!A1`);
  await googleJson(
    fetchImpl,
    sheetsToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${writeRange}?valueInputOption=RAW`,
    { method: "PUT", body: { values } }
  );
}

/**
 * @param {object} opts
 * @param {string} opts.driveToken OAuth token from the Base44 googledrive connector
 * @param {string} opts.sheetsToken OAuth token from the Base44 googlesheets connector
 * @param {Array<Array>} opts.liftValues header + one row per set
 * @param {Array<Array>} opts.runValues header + one row per run
 * @param {typeof fetch} [opts.fetchImpl]
 */
export async function syncTrainingSpreadsheet({
  driveToken,
  sheetsToken,
  liftValues,
  runValues,
  fetchImpl = fetch,
}) {
  if (!driveToken) throw new Error("Google Drive is not connected in Base44.");
  if (!sheetsToken) throw new Error("Google Sheets is not connected in Base44.");

  const folder = await findOrCreateFolder(fetchImpl, driveToken);
  const spreadsheet = await findOrCreateSpreadsheet(fetchImpl, driveToken, folder.id);
  await ensureTabs(fetchImpl, sheetsToken, spreadsheet.id);
  await replaceGrid(fetchImpl, sheetsToken, spreadsheet.id, LIFTS_TAB, liftValues, 6);
  await replaceGrid(fetchImpl, sheetsToken, spreadsheet.id, RUNS_TAB, runValues, 4);

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
