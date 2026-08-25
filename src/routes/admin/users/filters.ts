import { grantedAreaLabels, roleKindOf } from "$lib/rbac/permission-tree";
import type { PermissionRow } from "$lib/server/permissions";
import {
  optionsFromValues,
  withCounts,
  type CountedOption,
  type FilterOption,
} from "$lib/utils/facets";
import type { RoleOption, UserRow } from "./context.svelte.js";
import { isTemporarilyLocked } from "./context.svelte.js";

/**
 * The five things worth narrowing a list of accounts by. Each answers a
 * question the search box cannot:
 *
 *   role     — who is on which role
 *   kind     — admin accounts or staff accounts
 *   status   — active, switched off, or locked out
 *   section  — which part of the office someone belongs to
 *   signIn   — who has actually used their account
 *
 * Search covers the name, username, and position, which is where free text
 * belongs.
 */
export type UserFilterId = "role" | "kind" | "status" | "section" | "signIn";

export type UserFilterState = Record<UserFilterId, string[]>;

export const NO_SECTION_LABEL = "No section";

export function emptyUserFilters(): UserFilterState {
  return { role: [], kind: [], status: [], section: [], signIn: [] };
}

export const KIND_OPTIONS: FilterOption[] = [
  { value: "admin", label: "Admin account" },
  { value: "staff", label: "Staff account" },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "locked", label: "Locked out" },
];

export const SIGN_IN_OPTIONS: FilterOption[] = [
  { value: "never", label: "Never signed in" },
  { value: "signed-in", label: "Has signed in" },
];

/**
 * The values below are derived from an account rather than stored on it, so
 * they live here and are read by both the table columns and the option counts
 * — one definition, and no chance of a count disagreeing with its filter.
 */
export function userRoleValue(user: UserRow): string {
  return user.roleName;
}

export function userKindValue(
  user: UserRow,
  roles: readonly RoleOption[],
): string {
  const role = roles.find((r) => r.rolePk === user.roleFk);
  return role ? (roleKindOf(role.permissions) ?? "") : "";
}

/**
 * An account locked by failed sign-in attempts reads as locked even though
 * its stored status is still "active" — the lockout lives in locked_until,
 * and to an admin looking for why somebody cannot get in, that is the status.
 */
export function userStatusValue(user: UserRow): string {
  if (isTemporarilyLocked(user)) return "locked";
  return user.accountStatus;
}

export function userSectionValue(user: UserRow): string {
  return user.employee.orgUnitName ?? NO_SECTION_LABEL;
}

export function userSignInValue(user: UserRow): string {
  return user.lastLoginAt === null ? "never" : "signed-in";
}

/**
 * The pages a role opens, by name. The same list the Roles table shows, so an
 * admin who cannot open that page still sees what they are handing over.
 */
export function roleAreaLabels(
  role: RoleOption | undefined,
  permissionDefs: readonly PermissionRow[],
): string[] {
  if (!role) return [];
  return grantedAreaLabels(role.permissions, permissionDefs);
}

/**
 * How many accounts each option would match, counted across everybody rather
 * than only the rows currently on screen. Counts that shift as other filters
 * are applied read as a glitch; a stable "3" next to a role name is a fact
 * about the system.
 */
export interface UserFacets {
  role: CountedOption[];
  kind: CountedOption[];
  status: CountedOption[];
  section: CountedOption[];
  signIn: CountedOption[];
}

export function buildUserFacets(
  users: readonly UserRow[],
  roles: readonly RoleOption[],
): UserFacets {
  return {
    role: optionsFromValues(users.map(userRoleValue)),
    kind: withCounts(
      KIND_OPTIONS,
      users.map((user) => userKindValue(user, roles)),
    ),
    status: withCounts(STATUS_OPTIONS, users.map(userStatusValue)),
    section: optionsFromValues(users.map(userSectionValue)),
    signIn: withCounts(SIGN_IN_OPTIONS, users.map(userSignInValue)),
  };
}
