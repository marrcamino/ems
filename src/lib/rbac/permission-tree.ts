// src/lib/rbac/permission-tree.ts

/**
 * Shape of the permission list as the ROLE EDITOR needs it, plus the tick
 * cascade that keeps a selection valid while it is being edited.
 *
 * This file is deliberately free of runtime imports from `$lib/server/*` —
 * only erased `import type`s — because the role editor is a client
 * component. It is handed the permission rows by the page load instead of
 * reaching for PERMISSION_DEFS itself. `role-templates.ts` (server) is free
 * to import from here; the reverse is not.
 *
 * A role may mix any keys. The editor shows every key, one group per module,
 * under the name of the page it opens.
 */

import type { PermissionKey, PermissionRow } from "$lib/server/permissions";

/**
 * The two Roles-page keys. They are never rendered as a tickable checkbox —
 * absent, not greyed out — so the Roles group produces no checkboxes at all
 * and is omitted from the editor entirely. They reach the super-admin role
 * only through scripts/create-admin.ts and the sync backfill.
 *
 * The server strips them from any submitted selection as well; this constant
 * is the single list both sides read.
 */
export const RESTRICTED_PERMISSION_KEYS = [
  "roles:view",
  "roles:manage",
] as const satisfies readonly PermissionKey[];

/** The key that makes a role THE super-admin role. Exactly one may hold it. */
export const SUPER_ADMIN_KEY: PermissionKey = "roles:manage";

/** Drop the Roles-page keys, which only the super-admin role may hold. */
export function withoutRestrictedKeys(keys: readonly string[]): string[] {
  const restricted = new Set<string>(RESTRICTED_PERMISSION_KEYS);
  return keys.filter((key) => !restricted.has(key));
}

/**
 * Headings shown above each group of checkboxes. Written for a non-technical
 * admin, so they are proper page names rather than the module identifier —
 * "Organizational structure", not org_units. Anything missing here falls back
 * to a title-cased version of the identifier, which is only ever a stopgap
 * until the module is named properly below.
 */
const GROUP_LABELS: Record<string, string> = {
  fuel: "Fuel",
  purchase_orders: "Purchase orders",
  assets: "Assets",
  electricity: "Electricity",
  water: "Water",
  paper: "Paper",
  air_travel: "Air travel",
  eswm: "ESWM",
  ghg: "GHG compliance",
  users: "Users",
  employees: "Employees",
  org_units: "Organizational structure",
  signatories: "Signatories",
  roles: "Roles",
};

export function groupLabel(name: string): string {
  const known = GROUP_LABELS[name];
  if (known) return known;

  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The key that opens a module's pages. Keys split cleanly at the `:`. */
function viewKeyOf(module: string): string {
  return `${module}:view`;
}

/** One tickable action inside a group — never the group's own `view`. */
export interface PermissionOption {
  key: string;
  description: string;
}

/**
 * One module. `viewKey` is the key that opens its pages; `actions` are
 * everything else you can do once inside.
 */
export interface PermissionGroup {
  /** The module name, such as "purchase_orders" — not a permission key. */
  id: string;
  label: string;
  viewKey: string;
  viewDescription: string;
  actions: PermissionOption[];
}

/**
 * Turn the flat permission list into the grouped list the editor renders, in
 * the order of PERMISSION_DEFS.
 *
 * Restricted keys are dropped unless `includeRestricted` is set — the one
 * caller that sets it is the read-only view of the super-admin role, which
 * shows what that role holds without offering anything to click.
 *
 * A group whose `view` key ends up missing is dropped: the page it gates is
 * unreachable, so its other actions could never be exercised. That is what
 * removes the Roles group in the normal case.
 */
export function buildPermissionTree(
  rows: readonly PermissionRow[],
  options: { includeRestricted?: boolean } = {},
): PermissionGroup[] {
  const restricted = new Set<string>(RESTRICTED_PERMISSION_KEYS);
  const modules = new Map<
    string,
    Omit<PermissionGroup, "viewKey"> & { viewKey: string | null }
  >();

  for (const row of rows) {
    if (!options.includeRestricted && restricted.has(row.key)) continue;

    let group = modules.get(row.module);
    if (!group) {
      group = {
        id: row.module,
        label: groupLabel(row.module),
        viewKey: null,
        viewDescription: "",
        actions: [],
      };
      modules.set(row.module, group);
    }

    if (row.key === viewKeyOf(row.module)) {
      group.viewKey = row.key;
      group.viewDescription = row.description;
    } else {
      group.actions.push({ key: row.key, description: row.description });
    }
  }

  return [...modules.values()].filter(
    (group): group is PermissionGroup => group.viewKey !== null,
  );
}

/** Every key a group grants. */
export function keysInGroup(group: PermissionGroup): string[] {
  return [group.viewKey, ...group.actions.map((action) => action.key)];
}

/** Every key in the whole list. */
export function keysInTree(tree: PermissionGroup[]): string[] {
  return tree.flatMap(keysInGroup);
}

/** Which group each key belongs to, for the cascade. */
export type PermissionIndex = Map<string, PermissionGroup>;

export function indexPermissionTree(tree: PermissionGroup[]): PermissionIndex {
  const byKey: PermissionIndex = new Map();

  for (const group of tree) {
    for (const key of keysInGroup(group)) byKey.set(key, group);
  }

  return byKey;
}

/**
 * Apply one checkbox click and return the new selection.
 *
 * Ticking anything ticks its group's `view` — managing a page you cannot
 * open is meaningless. Unticking a group's `view` clears the whole group.
 *
 * The result is therefore always closed under the implication rules, so the
 * ticked set is exactly what gets stored.
 */
export function togglePermission(
  index: PermissionIndex,
  selected: readonly string[],
  key: string,
  checked: boolean,
): string[] {
  const next = new Set(selected);
  const group = index.get(key);

  if (checked) {
    next.add(key);
    if (group) next.add(group.viewKey);
    return [...next];
  }

  if (group && group.viewKey === key) {
    for (const cleared of keysInGroup(group)) next.delete(cleared);
  } else {
    next.delete(key);
  }

  return [...next];
}

/** Tick or clear a whole group at once. */
export function toggleGroup(
  selected: readonly string[],
  group: PermissionGroup,
  checked: boolean,
): string[] {
  const next = new Set(selected);

  for (const key of keysInGroup(group)) {
    if (checked) next.add(key);
    else next.delete(key);
  }

  return [...next];
}

export type GroupState = "none" | "some" | "all";

export function groupState(
  group: PermissionGroup,
  selected: readonly string[],
): GroupState {
  const keys = keysInGroup(group);
  const chosen = new Set(selected);
  const hits = keys.filter((key) => chosen.has(key)).length;

  if (hits === 0) return "none";
  return hits === keys.length ? "all" : "some";
}

/**
 * Whether this row is the `view` that opens a page, rather than an action
 * taken inside one.
 */
export function isViewPermission(row: PermissionRow): boolean {
  return row.key === viewKeyOf(row.module);
}

/**
 * The pages a role can open, by name — what the Roles table shows instead of
 * a bare permission count.
 */
export function grantedAreaLabels(
  keys: readonly string[],
  rows: readonly PermissionRow[],
): string[] {
  const held = new Set(keys);
  const labels: string[] = [];

  for (const row of rows) {
    if (!held.has(row.key) || !isViewPermission(row)) continue;

    const label = groupLabel(row.module);
    if (!labels.includes(label)) labels.push(label);
  }

  return labels;
}

/**
 * Whether the role can change anything, or only look. A role holding nothing
 * but viewing keys is read-only — `view`, and the wider views such as
 * `fuel:view_all_offices`, which show more records but change none. One
 * holding any other action can write.
 */
export function grantsChanges(
  keys: readonly string[],
  rows: readonly PermissionRow[],
): boolean {
  const held = new Set(keys);

  return rows.some(
    (row) => held.has(row.key) && !row.key.split(":")[1].startsWith("view"),
  );
}
