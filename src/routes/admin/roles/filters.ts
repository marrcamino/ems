import {
  grantedAreaLabels,
  grantsChanges,
  roleKindOf,
} from "$lib/rbac/permission-tree";
import type { PermissionRow } from "$lib/server/permissions";
import type { RoleRow } from "./context.svelte.js";

/**
 * The five things worth narrowing a role list by. Each answers a different
 * question, and none of them is reachable by typing in the search box:
 *
 *   kind       — admin roles or staff roles
 *   authority  — can this role change data, or only look at it
 *   assignment — is anyone actually using this role
 *   status     — active or retired
 *   areas      — which pages the role opens
 *
 * Search still covers the name and description, which is where free text
 * belongs.
 */
export type RoleFilterId =
  | "kind"
  | "authority"
  | "assignment"
  | "status"
  | "areas";

export type RoleFilterState = Record<RoleFilterId, string[]>;

export function emptyRoleFilters(): RoleFilterState {
  return { kind: [], authority: [], assignment: [], status: [], areas: [] };
}

export function countActiveFilters(filters: RoleFilterState): number {
  return Object.values(filters).reduce(
    (total, values) => total + values.length,
    0,
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export const KIND_OPTIONS: FilterOption[] = [
  { value: "admin", label: "Admin role" },
  { value: "staff", label: "Staff role" },
];

export const AUTHORITY_OPTIONS: FilterOption[] = [
  { value: "manage", label: "Can make changes" },
  { value: "view", label: "View only" },
];

export const ASSIGNMENT_OPTIONS: FilterOption[] = [
  { value: "in-use", label: "In use" },
  { value: "unused", label: "Not assigned to anyone" },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/**
 * The three values below are derived from a role rather than stored on it, so
 * they live here and are read by both the table columns and the option counts
 * — one definition, no chance of the count disagreeing with the filter.
 */
export function roleKindValue(role: RoleRow): string {
  return roleKindOf(role.permissions) ?? "";
}

export function roleAuthorityValue(
  role: RoleRow,
  permissionDefs: readonly PermissionRow[],
): string {
  return grantsChanges(role.permissions, permissionDefs) ? "manage" : "view";
}

export function roleAssignmentValue(role: RoleRow): string {
  return role.userCount > 0 ? "in-use" : "unused";
}

export function roleAreaValues(
  role: RoleRow,
  permissionDefs: readonly PermissionRow[],
): string[] {
  return grantedAreaLabels(role.permissions, permissionDefs);
}

/**
 * How many roles each option would match, counted across every role rather
 * than only the ones currently on screen. Counts that shift as other filters
 * are applied read as a glitch; a stable "3" next to "Admin role" is a fact
 * about the system.
 */
export interface CountedOption extends FilterOption {
  count: number;
}

function withCounts(
  options: FilterOption[],
  values: Iterable<string>,
): CountedOption[] {
  const tally = new Map<string, number>();
  for (const value of values) {
    tally.set(value, (tally.get(value) ?? 0) + 1);
  }

  return options.map((option) => ({
    ...option,
    count: tally.get(option.value) ?? 0,
  }));
}

export interface RoleFacets {
  kind: CountedOption[];
  authority: CountedOption[];
  assignment: CountedOption[];
  status: CountedOption[];
  areas: CountedOption[];
}

export function buildRoleFacets(
  roles: readonly RoleRow[],
  permissionDefs: readonly PermissionRow[],
): RoleFacets {
  const areaTally = new Map<string, number>();
  for (const role of roles) {
    for (const area of roleAreaValues(role, permissionDefs)) {
      areaTally.set(area, (areaTally.get(area) ?? 0) + 1);
    }
  }

  return {
    kind: withCounts(KIND_OPTIONS, roles.map(roleKindValue)),
    authority: withCounts(
      AUTHORITY_OPTIONS,
      roles.map((role) => roleAuthorityValue(role, permissionDefs)),
    ),
    assignment: withCounts(ASSIGNMENT_OPTIONS, roles.map(roleAssignmentValue)),
    status: withCounts(
      STATUS_OPTIONS,
      roles.map((role) => role.status),
    ),
    // Only areas some role actually grants — an option matching nothing is
    // noise, and the full list of pages is long.
    areas: [...areaTally.entries()]
      .map(([label, count]) => ({ value: label, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
