# API contract

## Schema

```sql
ALTER TABLE vehicles
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN deactivated_at TIMESTAMPTZ NULL;

CREATE INDEX vehicles_is_active_idx ON vehicles (is_active);
```

Use a boolean, not a status enum, when there are exactly two states. An enum invites a third state nobody defined, and every query then needs to know which values count as "usable". Move to an enum only when the domain genuinely has more than two (`draft | active | archived`), and then keep a single derived notion of "usable" in one place so the rest of the code doesn't re-derive it.

Drop `deactivated_at` if nobody will ever ask when something was retired. Keep it if the list is staff, assets, or anything an auditor might look at.

Never hard-delete rows that other tables reference. Foreign keys to a deactivated row must keep resolving so a two-year-old trip report still prints the driver's name.

## Endpoints

REST shape — one collection resource, status as a filter, not a separate path.

```
GET   /api/vehicles                    → active only (default)
GET   /api/vehicles?status=inactive    → inactive only
GET   /api/vehicles?status=all         → both
PATCH /api/vehicles/:id                → { "isActive": false }
```

Avoid these:

- `GET /api/vehicles/inactive` — makes status part of the resource identity. It isn't.
- `POST /api/vehicles/:id/deactivate` — an RPC verb for what is a field update.
- `DELETE /api/vehicles/:id` for deactivation — the method promises removal and clients (and caches) treat it that way.

## Response shape

Return counts with the rows so the filter labels don't need a second request:

```json
{
  "data": [
    { "id": 1, "plateNo": "SJP-1234", "isActive": true }
  ],
  "counts": { "active": 41, "inactive": 4, "all": 45 }
}
```

Counts are for the whole collection under the current non-status filters (search terms, department, date range), not just the current page. If the user searches "Toyota", the counts should describe Toyota vehicles.

## SvelteKit handlers

`src/routes/api/vehicles/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const STATUSES = ['active', 'inactive', 'all'] as const;
type Status = (typeof STATUSES)[number];

function parseStatus(value: string | null): Status {
  if (value === null) return 'active';
  if ((STATUSES as readonly string[]).includes(value)) return value as Status;
  error(400, `Invalid status. Expected one of: ${STATUSES.join(', ')}`);
}

export const GET: RequestHandler = async ({ url, locals }) => {
  const status = parseStatus(url.searchParams.get('status'));

  const rows = await locals.db.vehicle.findMany({
    where: status === 'all' ? {} : { isActive: status === 'active' },
    orderBy: { plateNo: 'asc' }
  });

  const [active, inactive] = await Promise.all([
    locals.db.vehicle.count({ where: { isActive: true } }),
    locals.db.vehicle.count({ where: { isActive: false } })
  ]);

  return json({
    data: rows,
    counts: { active, inactive, all: active + inactive }
  });
};
```

`src/routes/api/vehicles/[id]/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) error(400, 'Invalid id');

  const body = await request.json().catch(() => error(400, 'Invalid JSON body'));
  if (typeof body.isActive !== 'boolean') error(400, 'isActive must be a boolean');

  const existing = await locals.db.vehicle.findUnique({ where: { id } });
  if (!existing) error(404, 'Vehicle not found');

  const updated = await locals.db.vehicle.update({
    where: { id },
    data: {
      isActive: body.isActive,
      deactivatedAt: body.isActive ? null : new Date()
    }
  });

  return json(updated);
};
```

`PATCH` is idempotent here — deactivating an already-inactive row succeeds and returns the row. Don't error on it; double-clicks and retries would fail for no reason.

## Guarding writes against inactive records

Filtering pickers in the UI is a convenience, not a guarantee — a stale tab or a direct API call can still submit an inactive id. Validate on the server when creating records that reference the entity:

```ts
const vehicle = await locals.db.vehicle.findUnique({ where: { id: body.vehicleId } });
if (!vehicle) error(400, 'Vehicle not found');
if (!vehicle.isActive) error(409, 'That vehicle is inactive and cannot be assigned');
```

Use 409, not 400: the request is well-formed, it conflicts with the current state of the resource. The message should name the problem so the UI can show it directly.

Editing an existing record is the exception — allow saving when the inactive id is the one already stored, so correcting a typo elsewhere on the form doesn't force the user to also change the vehicle.
