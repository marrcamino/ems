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
 */

import type { PermissionKey, PermissionRow } from "$lib/server/permissions";

/**
 * A role is EITHER an admin role (only `admin:*` keys) or a staff role (only
 * non-admin keys), never a mix — holding `admin:view` sends the user into
 * /admin, where a staff key could never be exercised. The editor asks which
 * kind up front and then shows only that half of the list.
 */
export type RoleKind = "admin" | "staff";

export const ADMIN_MODULE = "admin";

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
  "admin:view_roles",
  "admin:manage_roles",
] as const satisfies readonly PermissionKey[];

/** The key that makes a role THE super-admin role. Exactly one may hold it. */
export const SUPER_ADMIN_KEY: PermissionKey = "admin:manage_roles";

/**
 * Headings shown above each group of checkboxes. Written for a non-technical
 * admin, so they are proper section names rather than the module identifier —
 * "Organizational structure", not org_units. Anything missing here falls back
 * to a title-cased version of the identifier, which is only ever a stopgap
 * until the module is named properly below.
 */
const GROUP_LABELS: Record<string, string> = {
  admin: "Admin area",
  fuel: "Fuel",
  electricity: "Electricity",
  water: "Water",
  paper: "Paper",
  air_travel: "Air travel",
  eswm: "ESWM",
  ghg: "GHG compliance",
  users: "Users",
  roles: "Roles",
  org_units: "Organizational structure",
};

export function groupLabel(name: string): string {
  const known = GROUP_LABELS[name];
  if (known) return known;

  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** One tickable action inside a group — never the group's own `view`. */
export interface PermissionOption {
  key: string;
  description: string;
}

/**
 * A module, or one submodule of a module. `viewKey` is the key that opens the
 * page; `actions` are everything else you can do once inside it.
 */
export interface PermissionGroup {
  /** "admin" or "admin.users" — a stable id, not a permission key. */
  id: string;
  label: string;
  viewKey: string;
  viewDescription: string;
  actions: PermissionOption[];
  /** One level of submodules, admin-side only. */
  children: PermissionGroup[];
}

type DraftGroup = Omit<PermissionGroup, "viewKey" | "children"> & {
  viewKey: string | null;
  children: DraftGroup[];
};

function draft(id: string, label: string): DraftGroup {
  return {
    id,
    label,
    viewKey: null,
    viewDescription: "",
    actions: [],
    children: [],
  };
}

/**
 * Turn the flat permission list into the grouped tree the editor renders.
 *
 * `kind` picks which half of the list is in play. Restricted keys are dropped
 * unless `includeRestricted` is set — the one caller that sets it is the
 * read-only view of the super-admin role, which shows what that role holds
 * without offering anything to click.
 *
 * A group whose `view` key ends up missing is dropped: the page it gates is
 * unreachable, so its other actions could never be exercised. That is what
 * removes the Roles group in the normal case.
 */
export function buildPermissionTree(
  rows: readonly PermissionRow[],
  kind: RoleKind,
  options: { includeRestricted?: boolean } = {},
): PermissionGroup[] {
  const restricted = new Set<string>(RESTRICTED_PERMISSION_KEYS);
  const modules = new Map<string, DraftGroup>();

  for (const row of rows) {
    if (!options.includeRestricted && restricted.has(row.key)) continue;

    const isAdminRow = row.module === ADMIN_MODULE;
    if (isAdminRow !== (kind === "admin")) continue;

    let module = modules.get(row.module);
    if (!module) {
      module = draft(row.module, groupLabel(row.module));
      modules.set(row.module, module);
    }

    let target = module;
    if (row.submodule) {
      const id = `${row.module}.${row.submodule}`;
      let submodule = module.children.find((child) => child.id === id);

      if (!submodule) {
        submodule = draft(id, groupLabel(row.submodule));
        module.children.push(submodule);
      }
      target = submodule;
    }

    // Built FORWARD from the parts, never by splitting the finished key —
    // `_` is both the separator and a legal character inside a submodule
    // name, so "admin:view_org_units" cannot be taken back apart.
    const viewKey = row.submodule
      ? `${row.module}:view_${row.submodule}`
      : `${row.module}:view`;

    if (row.key === viewKey) {
      target.viewKey = row.key;
      target.viewDescription = row.description;
    } else {
      target.actions.push({ key: row.key, description: row.description });
    }
  }

  function finish(group: DraftGroup): PermissionGroup | null {
    if (!group.viewKey) return null;

    return {
      id: group.id,
      label: group.label,
      viewKey: group.viewKey,
      viewDescription: group.viewDescription,
      actions: group.actions,
      children: group.children
        .map(finish)
        .filter((child): child is PermissionGroup => child !== null),
    };
  }

  return [...modules.values()]
    .map(finish)
    .filter((group): group is PermissionGroup => group !== null);
}

/** Every key a group grants, including the ones in its submodules. */
export function keysInGroup(group: PermissionGroup): string[] {
  return [
    group.viewKey,
    ...group.actions.map((action) => action.key),
    ...group.children.flatMap(keysInGroup),
  ];
}

/** Every key in the whole tree. */
export function keysInTree(tree: PermissionGroup[]): string[] {
  return tree.flatMap(keysInGroup);
}

/**
 * Lookups the cascade needs: which group a key belongs to, and which group
 * sits above a given one.
 */
export interface PermissionIndex {
  byKey: Map<string, PermissionGroup>;
  parentOf: Map<string, PermissionGroup | null>;
}

export function indexPermissionTree(tree: PermissionGroup[]): PermissionIndex {
  const byKey = new Map<string, PermissionGroup>();
  const parentOf = new Map<string, PermissionGroup | null>();

  function walk(group: PermissionGroup, parent: PermissionGroup | null) {
    parentOf.set(group.id, parent);
    byKey.set(group.viewKey, group);
    for (const action of group.actions) byKey.set(action.key, group);
    for (const child of group.children) walk(child, group);
  }

  for (const group of tree) walk(group, null);

  return { byKey, parentOf };
}

/** Walk from a group up to the root, ticking each view key on the way. */
function addViewKeysAbove(
  index: PermissionIndex,
  into: Set<string>,
  from: PermissionGroup | null | undefined,
) {
  for (let current = from; current; current = index.parentOf.get(current.id)) {
    into.add(current.viewKey);
  }
}

/**
 * Apply one checkbox click and return the new selection.
 *
 * Ticking anything ticks the `view` of its group and of every group above it
 * — managing a page you cannot open is meaningless. Unticking a group's
 * `view` clears that whole group and everything nested under it, which is
 * why unticking "Access the Admin area" empties the entire admin list at
 * once.
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
  const group = index.byKey.get(key);

  if (checked) {
    next.add(key);
    addViewKeysAbove(index, next, group);
    return [...next];
  }

  if (group && group.viewKey === key) {
    for (const cleared of keysInGroup(group)) next.delete(cleared);
  } else {
    next.delete(key);
  }

  return [...next];
}

/** Tick or clear a whole group at once, cascading the same way. */
export function toggleGroup(
  index: PermissionIndex,
  selected: readonly string[],
  group: PermissionGroup,
  checked: boolean,
): string[] {
  const next = new Set(selected);

  if (!checked) {
    for (const key of keysInGroup(group)) next.delete(key);
    return [...next];
  }

  for (const key of keysInGroup(group)) next.add(key);
  addViewKeysAbove(index, next, index.parentOf.get(group.id));

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
 * Which kind of role a stored permission set describes. Derived live rather
 * than stored in a column, the same way super-admin protection is: a role
 * holding any `admin:*` key is an admin role. A role with no permissions yet
 * has no kind, so the editor asks.
 */
export function roleKindOf(keys: readonly string[]): RoleKind | null {
  if (keys.some((key) => key.startsWith(`${ADMIN_MODULE}:`))) return "admin";
  if (keys.length > 0) return "staff";
  return null;
}

/** Drop anything that does not belong to `kind`, plus the restricted keys. */
export function keysForKind(keys: readonly string[], kind: RoleKind): string[] {
  const restricted = new Set<string>(RESTRICTED_PERMISSION_KEYS);

  return keys.filter((key) => {
    if (restricted.has(key)) return false;
    const isAdminKey = key.startsWith(`${ADMIN_MODULE}:`);
    return isAdminKey === (kind === "admin");
  });
}

/**
 * Whether this row is the `view` that opens a page, rather than an action
 * taken inside one.
 *
 * Decided by rebuilding the view key from the row's parts and comparing, not
 * by looking for "view" inside the finished key — a key is only ever built
 * forward, and `admin:view_org_units` cannot be taken back apart.
 */
export function isViewPermission(row: PermissionRow): boolean {
  const viewKey = row.submodule
    ? `${row.module}:view_${row.submodule}`
    : `${row.module}:view`;

  return row.key === viewKey;
}

/**
 * The areas a role can reach, as section names — what the Roles table shows
 * instead of a bare permission count.
 */
export function grantedAreaLabels(
  keys: readonly string[],
  rows: readonly PermissionRow[],
): string[] {
  const held = new Set(keys);
  const labels: string[] = [];

  for (const row of rows) {
    if (!held.has(row.key) || !isViewPermission(row)) continue;

    // "Access the Admin area" is implied by every admin submodule below it,
    // so listing it alongside them says nothing.
    if (row.module === ADMIN_MODULE && !row.submodule) continue;

    const label = groupLabel(row.submodule ?? row.module);
    if (!labels.includes(label)) labels.push(label);
  }

  return labels;
}

/**
 * Whether the role can change anything, or only look. A role holding nothing
 * but `view` keys is the read-only admin the design expects to exist; one
 * holding any other action can write.
 */
export function grantsChanges(
  keys: readonly string[],
  rows: readonly PermissionRow[],
): boolean {
  const held = new Set(keys);

  return rows.some((row) => held.has(row.key) && !isViewPermission(row));
}
