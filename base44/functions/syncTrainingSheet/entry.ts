import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';
import { buildMealSheet, buildTrainingSheet, pageThrough } from './trainingSheet.js';
import { syncTrainingSpreadsheet } from './googleTrainingSheet.js';

/**
 * Backfill every WorkoutLog set and run, and every Meal, into the Google Sheet
 * "Forgeday Training" in the Drive folder "Forgeday".
 *
 * Sheets API calls use the googledrive connector token. That connection's
 * drive.file scope can edit spreadsheets this app created. The googlesheets
 * connector on the live app was authorized with only the email scope, so its
 * token cannot call Sheets v4.
 *
 * Invoke: base44.functions.invoke('syncTrainingSheet', {})
 */

const SETUP =
  'Connect Google Drive in Base44 Integrations as the account whose Drive should hold the sheet. The Drive connection needs the drive.file scope. This is separate from Forgeday sign-in. Leave Google login off.';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function failure(step: string, error: unknown, status = 500) {
  const message = errorMessage(error);
  console.error('[syncTrainingSheet]', step, message);
  return Response.json({ ok: false, step, message }, { status });
}

async function driveToken(base44: any) {
  try {
    const connection = await base44.asServiceRole.connectors.getConnection('googledrive');
    const accessToken = connection?.accessToken;
    if (!accessToken) {
      throw new Error('Google Drive getConnection returned no access token.');
    }
    return accessToken as string;
  } catch (error) {
    const wrapped = new Error(`Google Drive connector: ${errorMessage(error)}. ${SETUP}`);
    (wrapped as Error & { status?: number }).status = 400;
    throw wrapped;
  }
}

Deno.serve(async (req) => {
  let step = 'start';
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    step = 'auth';
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return failure('auth', new Error('Unauthorized'), 401);
    }

    // User-scoped read. createClientFromRequest carries the caller's session,
    // same as gogginsTrainingFeed. Service role would skip that boundary.
    step = 'load_logs';
    const email = user.email;
    const loaded = await pageThrough((limit, skip) =>
      base44.entities.WorkoutLog.filter({ created_by: email }, 'created_date', limit, skip)
    );

    step = 'load_meals';
    const mealsLoaded = await pageThrough((limit, skip) =>
      base44.entities.Meal.filter({ created_by: email }, 'created_date', limit, skip)
    );

    step = 'build_rows';
    const sheet = buildTrainingSheet(loaded.rows, { truncated: loaded.truncated });
    const meals = buildMealSheet(mealsLoaded.rows, { truncated: mealsLoaded.truncated });
    const earliest = [sheet.history.earliest_date, meals.history.earliest_date].filter(Boolean).sort()[0] || null;
    const latest = [sheet.history.latest_date, meals.history.latest_date].filter(Boolean).sort().pop() || null;

    step = 'drive_token';
    const token = await driveToken(base44);

    step = 'write_sheet';
    const written = await syncTrainingSpreadsheet({
      driveToken: token,
      liftValues: sheet.liftValues,
      runValues: sheet.runValues,
      mealValues: meals.mealValues,
    });

    return Response.json({
      ok: true,
      ...written,
      lifts: sheet.history.lift_count,
      runs: sheet.history.run_count,
      meals: meals.history.meal_count,
      logs_read: sheet.history.log_count,
      meals_read: mealsLoaded.rows.length,
      pages: loaded.pages,
      meal_pages: mealsLoaded.pages,
      truncated: sheet.history.truncated || meals.history.truncated,
      earliest_date: earliest,
      latest_date: latest,
      meals_without_explicit_date: meals.history.meals_without_explicit_date,
      meals_missing_calories: meals.history.meals_missing_calories,
      meals_missing_protein: meals.history.meals_missing_protein,
      meals_missing_notes: meals.history.meals_missing_notes,
      logs_without_explicit_date: sheet.history.logs_without_explicit_date,
      lifts_missing_notes: sheet.history.lifts_missing_notes,
      runs_missing_distance: sheet.history.runs_missing_distance,
      runs_missing_time: sheet.history.runs_missing_time,
      runs_missing_freeform_notes: sheet.history.runs_missing_freeform_notes,
      history_limits: sheet.history.limits,
    });
  } catch (error) {
    const failedStep = (error as { step?: string })?.step || step;
    const status = (error as { status?: number })?.status || 500;
    return failure(failedStep, error, status);
  }
});
