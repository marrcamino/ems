// location of this file: src\lib\server\permissions.ts

/**
 * Permissions are grouped by module first, then by action. This is the
 * fixed, dev-defined list of every permission key in the system — never
 * created/edited by an admin at runtime (roles, which ARE runtime-editable,
 * just pick from this list).
 *
 * A module may nest ONE level of submodules, for sections that own their own
 * page inside a parent area (admin → users / roles / org_units). Nesting is
 * capped at one level on purpose: deeper nesting makes the key flattening
 * below ambiguous for no real gain.
 *
 * Every module AND every submodule must define a `view` action — the types
 * below enforce it, so you cannot add a module without one. That matters
 * because every route's `load` gates on `module:view`; a role holding only
 * `paper:manage` would otherwise be bounced out of the very page it is meant
 * to manage. See PERMISSION_IMPLIES for how that is resolved.
 *
 * NOTE: This is still a SAMPLE set. Modules/actions are placeholders —
 * edit freely once the approval workflow per module is finalized.
 *
 * Naming: plural for countable resources (`users`, `roles`, `org_units`);
 * mass nouns stay as they are (`fuel`, `water`, `paper`, `air-travel`).
 */

type ActionMap = { view: string } & Record<string, string>;
type ModuleDef = { view: string } & Record<string, string | ActionMap>;

export const PERMISSION_DEFS = {
  fuel: {
    view: "Access the Fuel page",
  },
  electricity: {
    view: "Access the Electricity page",
  },
  water: {
    view: "Access the Water page",
  },
  paper: {
    view: "Access the Paper page",
  },
  "air-travel": {
    view: "Access the Air Travel page",
  },
  eswm: {
    view: "Access the ESWM page",
  },
  ghg: {
    view: "Access the GHG Compliance page",
  },
  admin: {
    view: "Access the Admin page",
    users: {
      view: "Access the Users page",
      manage: "Add, edit, deactivate, and reassign users",
    },
    roles: {
      view: "Access the Roles page",
      manage: "Add, edit, and delete roles and their permissions",
    },
    org_units: {
      view: "Access the Organizational Structure page",
      manage: "Add, edit, delete, and deactivate organizational units",
    },
  },
} as const satisfies Record<string, ModuleDef>;

// ─────────────────────────────────────────────────────────────────────────
// Everything below this line is DERIVED from PERMISSION_DEFS above.
// You should never need to edit below here just to add a module/action —
// add it to PERMISSION_DEFS and the rest updates itself.
// ─────────────────────────────────────────────────────────────────────────

type PermissionDefs = typeof PERMISSION_DEFS;

/**
 * A submodule's action is flattened into the PARENT module's namespace, with
 * the action first and the submodule second:
 *
 *   admin → users → manage   becomes   "admin:manage_users"
 *
 * IMPORTANT: keys are generate-only. `_` is both the separator here and a
 * character inside submodule names like `org_units`, so "admin:view_org_units"
 * cannot be reliably split back into action + submodule. Never parse a
 * permission key on `_` — always derive forward from PERMISSION_DEFS.
 */
type KeysOfModule<M extends string, Def> = {
  [Name in keyof Def]: Def[Name] extends string
    ? `${M}:${Name & string}`
    : {
        [Act in keyof Def[Name]]: `${M}:${Act & string}_${Name & string}`;
      }[keyof Def[Name]];
}[keyof Def];

/**
 * PermissionKey = a union of every key implied by the object above, e.g.
 * "fuel:view" | "admin:view" | "admin:manage_users" | ...
 *
 * Still a FLAT union of string literals despite the nesting, so every
 * `import type { PermissionKey }` consumer (notably src/lib/rbac/access.ts)
 * is unaffected by the nesting.
 */
export type PermissionKey = {
  [M in keyof PermissionDefs]: KeysOfModule<M & string, PermissionDefs[M]>;
}[keyof PermissionDefs];

export type PermissionModule = keyof PermissionDefs;

export interface PermissionRow {
  key: PermissionKey;
  module: PermissionModule;
  /** Submodule this came from, or null for an action on the module itself. */
  submodule: string | null;
  description: string;
}

// Loosened view of the const object, so the walk below can branch on
// `typeof value === "string"` without fighting the literal types.
type RawModule = Record<string, string | Record<string, string>>;

function buildPermissions() {
  const rows: PermissionRow[] = [];
  const implies: Record<string, string[]> = {};

  const defs = PERMISSION_DEFS as unknown as Record<string, RawModule>;

  for (const [module, entries] of Object.entries(defs)) {
    for (const [name, value] of Object.entries(entries)) {
      // An action on the module itself, e.g. fuel:view / admin:view
      if (typeof value === "string") {
        const key = `${module}:${name}`;
        rows.push({
          key: key as PermissionKey,
          module: module as PermissionModule,
          submodule: null,
          description: value,
        });

        if (name !== "view") implies[key] = [`${module}:view`];
        continue;
      }

      // A submodule: flatten each of its actions into the parent module.
      for (const [action, description] of Object.entries(value)) {
        const key = `${module}:${action}_${name}`;
        rows.push({
          key: key as PermissionKey,
          module: module as PermissionModule,
          submodule: name,
          description,
        });

        // A submodule's own view rolls up to the module's view; any other
        // action rolls up to that submodule's view, which in turn rolls up
        // to the module's view via the edge added just above.
        implies[key] =
          action === "view" ? [`${module}:view`] : [`${module}:view_${name}`];
      }
    }
  }

  // A top-level action literally named `view_users` would collide with
  // submodule `users` + action `view` — same string, two sources, and no
  // type catches it. Fail loudly at import time instead of silently
  // double-inserting into the permission table.
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.key)) {
      throw new Error(
        `Duplicate permission key "${row.key}" generated from PERMISSION_DEFS. ` +
          `A module action and a submodule action are flattening to the same string.`,
      );
    }
    seen.add(row.key);
  }

  return { rows, implies };
}

const built = buildPermissions();

/**
 * Flat list of every permission, shaped like a row in your `permission`
 * table (key / module / description), plus a derived `submodule` for UI
 * grouping. Built once at import time from PERMISSION_DEFS — this is what
 * you'd loop over to seed the DB.
 *
 * Note `module` stays the PARENT ("admin", never "admin.users"), so the
 * permission table needs no schema change and existing grouping by module
 * keeps working.
 */
export const PERMISSIONS: PermissionRow[] = built.rows;

/**
 * Direct implication edges: holding the key on the left means you also hold
 * everything on the right. Derived from the nesting, so there is no
 * hand-maintained table to keep in sync.
 *
 *   admin:manage_org_units → admin:view_org_units → admin:view
 *
 * Use expandPermissions() rather than reading this directly — the edges here
 * are one hop only and need to be walked transitively.
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
