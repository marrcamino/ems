// location of this file: src\lib\server\permissions.ts

/**
 * The fixed, dev-defined list of every permission key in the system — never
 * created or edited by an admin at runtime (roles, which ARE runtime-editable,
 * just pick from this list).
 *
 * ── Key shape ───────────────────────────────────────────────────────────
 *
 * A key is `thing:action`, named after the data rather than the page:
 * `purchase_orders:manage`, not one key per page. There are no submodules, so
 * a key always splits cleanly at the `:` into its module and its action. One
 * set of work pages (/fuel, /fuel/purchase-orders, ...) is shared by everyone
 * who holds its keys, and the pages for running the system (/users, /roles,
 * ...) are gated the same way. Moving a page never renames a key. See
 * .claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md.
 *
 * Every module must define a `view` action — the types below enforce it.
 * `view` opens the module's pages and `manage` covers every save on them.
 * They are split into add, edit, and delete only when the office needs it.
 *
 * ── Two special situations ──────────────────────────────────────────────
 *
 * 1. One key implying another. `users:manage` is meaningless without
 *    `users:view`. Rather than make callers check both, holding any action of
 *    a module means holding its `view` — resolved by expandPermissions()
 *    below, and mirrored in the role editor by a checkbox cascade so the
 *    stored set is already closed.
 *
 * 2. A key restricted to a single role. `roles:manage` is the one critical
 *    permission: exactly one role in the system may ever hold it, and only
 *    scripts/create-admin.ts creates that role. Both Roles keys are hidden
 *    from the role editor entirely — never rendered, not merely disabled —
 *    so they cannot be granted through the UI at all. Every other key,
 *    including `users:manage`, is freely grantable, and a role may mix any
 *    of them.
 *
 * Naming: plural for countable things (`users`, `roles`, `org_units`); mass
 * nouns stay as they are (`fuel`, `water`, `paper`, `air_travel`). Keys use
 * `_`, never `-`. Keys do not have to match URLs — the route can stay
 * /air-travel.
 */

type ModuleDef = { view: string } & Record<string, string>;

export const PERMISSION_DEFS = {
  // ── Work pages ────────────────────────────────────────────────────────
  fuel: {
    view: "Access the Fuel pages",
    // Each person is to see only their own office's fuel records; this key
    // shows every office's. Held by the GSU role and the super-admin. Checked
    // once the office rule is built, with the first page that needs it.
    view_all_offices: "See the fuel records of every office",
  },

  // The fuel purchase orders GSU records, each split into allocations for
  // the offices, plus the suppliers they are bought from.
  purchase_orders: {
    view: "Access the Purchase Orders page",
    manage: "Add, edit, and delete purchase orders and suppliers",
  },

  // The registry of vehicles, generators, and other machines the office
  // fuels, plus the list of asset types behind it. Its own module rather
  // than part of `fuel` because GEMP's inventory requirement covers equipment
  // that burns no fuel at all, so this registry is expected to outgrow fuel.
  // The page lives at /fuel/assets for now.
  assets: {
    view: "Access the Assets page",
    manage: "Add, edit, and deactivate assets and asset types",
  },

  electricity: {
    view: "Access the Electricity page",
    manage: "Add, edit, and delete electricity records",
  },
  water: {
    view: "Access the Water page",
    manage: "Add, edit, and delete water records",
  },
  paper: {
    view: "Access the Paper page",
    manage: "Add, edit, and delete paper records",
  },
  air_travel: {
    view: "Access the Air Travel page",
    manage: "Add, edit, and delete air travel records",
  },
  eswm: {
    view: "Access the ESWM page",
    manage: "Add, edit, and delete ESWM records",
  },
  ghg: {
    view: "Access the GHG Compliance page",
    manage: "Add, edit, and delete GHG compliance records",
  },

  // ── Pages for running the system: the (admin) route group ─────────────
  users: {
    view: "Access the Users page",
    manage: "Add, edit, deactivate, and reassign users",
  },
  employees: {
    view: "Access the Employees page",
    manage: "Add, edit, and remove employee records",
  },
  org_units: {
    view: "Access the Organizational Structure page",
    manage: "Add, edit, delete, and deactivate organizational units",
  },
  signatories: {
    view: "Access the Signatory page",
    manage: "Change system signatories",
  },
  // CRITICAL: only one role may ever hold roles:manage and roles:view, and
  // only scripts/create-admin.ts creates it. Never rendered in the role editor.
  roles: {
    view: "Access the Roles page",
    manage: "Add, edit, and delete roles and their permissions",
  },
} as const satisfies Record<string, ModuleDef>;

// ─────────────────────────────────────────────────────────────────────────
// Everything below this line is DERIVED from PERMISSION_DEFS above.
// You should never need to edit below here just to add a module/action —
// add it to PERMISSION_DEFS and the rest updates itself.
// ─────────────────────────────────────────────────────────────────────────

type PermissionDefs = typeof PERMISSION_DEFS;

/**
 * PermissionKey = a union of every key implied by the object above, e.g.
 * "fuel:view" | "users:manage" | ...
 */
export type PermissionKey = {
  [M in keyof PermissionDefs]: `${M & string}:${keyof PermissionDefs[M] & string}`;
}[keyof PermissionDefs];

export type PermissionModule = keyof PermissionDefs;

export interface PermissionRow {
  key: PermissionKey;
  module: PermissionModule;
  description: string;
}

function buildPermissions() {
  const rows: PermissionRow[] = [];
  const implies: Record<string, string[]> = {};

  const defs = PERMISSION_DEFS as unknown as Record<
    string,
    Record<string, string>
  >;

  for (const [module, actions] of Object.entries(defs)) {
    for (const [action, description] of Object.entries(actions)) {
      const key = `${module}:${action}`;
      rows.push({
        key: key as PermissionKey,
        module: module as PermissionModule,
        description,
      });

      if (action !== "view") implies[key] = [`${module}:view`];
    }
  }

  return { rows, implies };
}

const built = buildPermissions();

/**
 * Flat list of every permission, shaped like a row in the `permission` table
 * (key / module / description). Built once at import time from
 * PERMISSION_DEFS — this is what the scripts loop over to seed the DB.
 */
export const PERMISSIONS: PermissionRow[] = built.rows;

/**
 * Direct implication edges: holding the key on the left means you also hold
 * everything on the right. Derived from PERMISSION_DEFS, so there is no
 * hand-maintained table to keep in sync.
 *
 *   org_units:manage → org_units:view
 *
 * Use expandPermissions() rather than reading this directly, so that a longer
 * chain added later is still walked all the way.
 */
export const PERMISSION_IMPLIES: Readonly<Record<string, readonly string[]>> =
  built.implies;

/**
 * Resolve a set of granted keys into its closure: every key given, plus
 * everything those keys imply, transitively.
 *
 * Idempotent — running it over its own output changes nothing — which is why
 * it is safe to apply both when a role is saved and when a session is loaded.
 *
 * Unrecognised keys are passed through untouched rather than dropped, so a
 * stale row in the DB never silently removes access it already granted.
 */
export function expandPermissions(keys: Iterable<string>): Set<string> {
  const resolved = new Set<string>();
  const queue = [...keys];

  while (queue.length > 0) {
    const key = queue.pop()!;
    if (resolved.has(key)) continue;
    resolved.add(key);

    const implied = PERMISSION_IMPLIES[key];
    if (implied) queue.push(...implied);
  }

  return resolved;
}
