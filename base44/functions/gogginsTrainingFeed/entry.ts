import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { buildGogginsFeed, parseGogginsFeedArgs } from './gogginsFeed.js';

/**
 * Read-only Goggins training feed.
 * Loads WorkoutProgram / WorkoutLog / WeightLog for the authed user and
 * returns the versioned JSON from buildGogginsFeed (no writes).
 *
 * Invoke: base44.functions.invoke('gogginsTrainingFeed', { weeks: 10, weight_days: 90 })
 * Keep ./gogginsFeed.js in sync with src/lib/gogginsFeed.js.
 */
async function readArgs(req: Request) {
  const url = new URL(req.url);
  const fromQuery = {
    weeks: url.searchParams.get('weeks') ?? undefined,
    weight_days: url.searchParams.get('weight_days') ?? undefined,
  };

  if (req.method === 'GET' || req.method === 'HEAD') {
    return fromQuery;
  }

  try {
    const text = await req.text();
    if (!text || !text.trim()) return fromQuery;
    const body = JSON.parse(text);
    return {
      weeks: body.weeks ?? fromQuery.weeks,
      weight_days: body.weight_days ?? body.weightDays ?? fromQuery.weight_days,
    };
  } catch {
    return fromQuery;
  }
}

async function loadAll(filterFn: (order: string, limit: number, skip: number) => Promise<unknown[]>, order: string, pageSize = 200) {
  const rows: unknown[] = [];
  for (let skip = 0; ; skip += pageSize) {
    const page = await filterFn(order, pageSize, skip);
    const list = Array.isArray(page) ? page : [];
    rows.push(...list);
    if (list.length < pageSize) return rows;
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

    const { weeks, weightDays } = parseGogginsFeedArgs(await readArgs(req));
    const email = user.email;

    // Oversample; builder windows by week_start / date. No finance entities.
    const [program, workoutLogs, weightLogs] = await Promise.all([
      base44.entities.WorkoutProgram.filter({ created_by: email }, 'day', 20),
      loadAll(
        (order, limit, skip) =>
          base44.entities.WorkoutLog.filter({ created_by: email }, order, limit, skip),
        '-created_date',
        250
      ),
      loadAll(
        (order, limit, skip) =>
          base44.entities.WeightLog.filter({ created_by: email }, order, limit, skip),
        '-date',
        100
      ),
    ]);

    const feed = buildGogginsFeed({
      program: Array.isArray(program) ? program : [],
      workoutLogs,
      weightLogs,
      weeks,
      weightDays,
      now: new Date(),
    });

    return Response.json(feed, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Forgeday-Feed': 'goggins-training',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
