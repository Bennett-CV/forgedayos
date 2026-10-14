import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { buildBennettFeed, parseBennettFeedArgs } from './bennettFeed.js';

/**
 * Read-only Bennett cash feed.
 * Loads Transaction and BudgetCategory for the authed user and returns
 * the versioned JSON from buildBennettFeed (no writes, no Plaid).
 *
 * Invoke: base44.functions.invoke('bennettCashFeed', { months: 6 })
 * Keep ./bennettFeed.js in sync with src/lib/bennettFeed.js.
 */
async function readArgs(req: Request) {
  const url = new URL(req.url);
  const fromQuery = {
    months: url.searchParams.get('months') ?? undefined,
  };

  if (req.method === 'GET' || req.method === 'HEAD') {
    return fromQuery;
  }

  try {
    const text = await req.text();
    if (!text || !text.trim()) return fromQuery;
    const body = JSON.parse(text);
    return {
      months: body.months ?? fromQuery.months,
    };
  } catch {
    return fromQuery;
  }
}

const MAX_PAGES = 40;

async function loadAll(filterFn: (order: string, limit: number, skip: number) => Promise<unknown[]>, order: string, pageSize = 200) {
  const rows: unknown[] = [];
  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const page = await filterFn(order, pageSize, pageIndex * pageSize);
    const list = Array.isArray(page) ? page : [];
    rows.push(...list);
    if (list.length < pageSize) return rows;
  }
  return rows;
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

    const { months } = parseBennettFeedArgs(await readArgs(req));
    const email = user.email;

    const [transactions, budgetCategories] = await Promise.all([
      loadAll(
        (order, limit, skip) =>
          base44.entities.Transaction.filter({ created_by: email }, order, limit, skip),
        '-date',
        200
      ),
      loadAll(
        (order, limit, skip) =>
          base44.entities.BudgetCategory.filter({ created_by: email }, order, limit, skip),
        'name',
        100
      ),
    ]);

    const feed = buildBennettFeed({
      transactions,
      budgetCategories,
      months,
      now: new Date(),
    });

    return Response.json(feed, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Forgeday-Feed': 'bennett-cash',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
