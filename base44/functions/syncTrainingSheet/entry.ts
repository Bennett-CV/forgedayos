import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';
import { buildTrainingSheet, pageThrough } from './trainingSheet.js';
import { syncTrainingSpreadsheet } from './googleTrainingSheet.js';

/**
 * Backfill every WorkoutLog set and run into the Google Sheet
 * "Forgeday Training" in the Drive folder "Forgeday".
 *
 * The first sync and every later sync replace both tabs. They do not append,
 * so running this again cannot duplicate rows.
 *
 * Tokens come from the Base44 connectors `googledrive` and `googlesheets`
 * (the account connected in Base44 Integrations). This does not use Forgeday login.
 *
 * Invoke: base44.functions.invoke('syncTrainingSheet', {})
 */

const SETUP =
  'In Base44 Integrations, connect Google Drive (googledrive) and Google Sheets (googlesheets) as the account whose Drive should hold the sheet. That is separate from Forgeday sign-in. Leave Google login off.';

async function connectorToken(base44: any, integrationType: string) {
  try {
    const connection = await base44.asServiceRole.connectors.getConnection(integrationType);
    const accessToken = connection?.accessToken;
    if (!accessToken) {
      throw new Error('no access token');
    }
    return accessToken as string;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(`Connect ${integrationType} in Base44 Integrations. ${SETUP} (${detail.slice(0, 180)})`);
    (wrapped as Error & { status?: number }).status = 400;
    throw wrapped;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
    const loaded = await pageThrough((limit, skip) =>
      base44.entities.WorkoutLog.filter({ created_by: email }, 'created_date', limit, skip)
    );
    const sheet = buildTrainingSheet(loaded.rows, { truncated: loaded.truncated });

    const [driveToken, sheetsToken] = await Promise.all([
      connectorToken(base44, 'googledrive'),
      connectorToken(base44, 'googlesheets'),
    ]);

    const written = await syncTrainingSpreadsheet({
      driveToken,
      sheetsToken,
      liftValues: sheet.liftValues,
      runValues: sheet.runValues,
    });

    return Response.json({
      ok: true,
      ...written,
      lifts: sheet.history.lift_count,
      runs: sheet.history.run_count,
      logs_read: sheet.history.log_count,
      pages: loaded.pages,
      truncated: sheet.history.truncated,
      earliest_date: sheet.history.earliest_date,
      latest_date: sheet.history.latest_date,
      logs_without_explicit_date: sheet.history.logs_without_explicit_date,
      lifts_missing_notes: sheet.history.lifts_missing_notes,
      runs_missing_distance: sheet.history.runs_missing_distance,
      runs_missing_time: sheet.history.runs_missing_time,
      runs_missing_freeform_notes: sheet.history.runs_missing_freeform_notes,
      history_limits: sheet.history.limits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number })?.status || 500;
    return Response.json({ error: message, setup: SETUP }, { status });
  }
});
