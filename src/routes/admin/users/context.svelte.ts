import { roleKindOf, type RoleKind } from "$lib/rbac/permission-tree";
import type { PermissionKey, PermissionRow } from "$lib/server/permissions";
import type { Employee, OrgUnit, Role, User } from "$lib/types";
import { fullName, makeContext } from "@/utils";
import { untrack } from "svelte";

/**
 * The person half of a row, as it comes down from the load: the fields of the
 * `employee` record the login points at, with the section name resolved.
 *
 * Kept as a nested object rather than flattened into the login, so it stays
 * obvious which table each field came from — the whole point of separating
 * the two.
 */
export type UserPerson = Pick<
  Employee,
  | "employeePk"
  | "firstName"
  | "middleName"
  | "lastName"
  | "suffix"
  | "positionTitle"
  | "employmentStatus"
  | "orgUnitFk"
> & {
  orgUnitName: string | null;
  orgUnitAbbr: string | null;
};

/**
 * A login as the table shows them: the account row with the role name already
 * resolved and the person attached, and without the password hash or the
 * failed-attempt counter, which the page has no use for.
 */
export type UserRow = Omit<
  User,
  | "createdAt"
  | "passwordHash"
  | "failedLoginAttempts"
  | "createdByFk"
  | "updatedAt"
> & {
  roleName: string;
  employee: UserPerson;
};

/**
 * Somebody who could be given a login, as the editor's picker needs them.
 * `username` is filled in when they already have one, which is what makes the
 * option unselectable rather than missing.
 */
export type EmployeeOption = Pick<
  Employee,
  | "employeePk"
  | "firstName"
  | "middleName"
  | "lastName"
  | "suffix"
  | "positionTitle"
  | "employmentStatus"
> & {
  orgUnitName: string | null;
  username: string | null;
};

/** A role as the assignment dropdown needs it, with the keys it holds. */
export type RoleOption = Pick<
  Role,
  "rolePk" | "roleName" | "description" | "status"
> & {
  permissions: PermissionKey[];
};

/**
 * What a change would do to the group of active accounts that can manage
 * roles. "block" is the last one leaving, which is refused outright; "warn"
 * is the second-to-last leaving, which is allowed but said out loud first.
 */
export type SuperAdminImpact = "none" | "warn" | "block";

// Re-exported so the pages under this route keep importing it from here,
// while the sidebar and anything else outside the route take it from $lib.
export { fullName };

/** Locked by failed sign-in attempts, as opposed to switched off by an admin. */
export function isTemporarilyLocked(user: UserRow): boolean {
  return (
    user.accountStatus === "locked" ||
    (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now())
  );
}

export class UsersContext {
  users: UserRow[] = $state([]);
  roles: RoleOption[] = $state([]);
  orgUnits: OrgUnit[] = $state([]);
  employees: EmployeeOption[] = $state([]);

  /**
   * The permission list as defined in code. Held here so the editor can turn
   * a role's stored keys into the plain list of pages it opens.
   */
  permissionDefs: PermissionRow[] = $state([]);

  /**
   * The role holding admin:manage_roles, found by permission rather than by
   * name. Assigning it, removing it, and resetting the password of anybody on
   * it are all restricted to people who already hold it.
   */
  superAdminRolePk: number | null = $state(null);

  /** Who is signed in, and whether they are on the role that manages roles. */
  currentUserPk: number | null = $state(null);
  canManageRoles = $state(false);

  addEditDialog = $state(false);
  deleteAlertDialog = $state(false);
  resetPasswordDialog = $state(false);
  userToEdit: UserRow | null = $state(null);

  mode: "edit" | "add" = $derived(this.userToEdit !== null ? "edit" : "add");

  formEmployeeFk = $state("");
  formUsername = $state("");
  formRoleFk = $state("");
  formIsActive = $state(true);

  /**
   * A password typed by the admin instead of a generated one. Blank is the
   * normal case and the better one — a generated password is not something
   * anybody has used elsewhere.
   */
  formPassword = $state("");
  formSetPasswordManually = $state(false);

  /**
   * The password to hand over, shown once after an account is created or a
   * password is reset. It is never stored anywhere it could be read back, so
   * this is the only chance to write it down.
   */
  temporaryPassword: string | null = $state(null);
  temporaryPasswordFor: string | null = $state(null);

  isSuperAdminRole(rolePk: number) {
    return this.superAdminRolePk !== null && rolePk === this.superAdminRolePk;
  }

  isSelf(user: Pick<UserRow, "userPk">) {
    return this.currentUserPk !== null && user.userPk === this.currentUserPk;
  }

  roleByPk(rolePk: number): RoleOption | undefined {
    return this.roles.find((r) => r.rolePk === rolePk);
  }

  /** How many accounts can manage roles right now and are switched on. */
  activeSuperAdminCount = $derived(
    this.superAdminRolePk === null
      ? 0
      : this.users.filter(
          (u) =>
            u.roleFk === this.superAdminRolePk &&
            u.accountStatus === "active",
        ).length,
  );

  /**
   * Whether a change may go ahead, and whether it deserves a warning first.
   * The server refuses the last one outright; this is what lets the dialog
   * say so before the button is pressed rather than after.
   */
  impactOfLeaving(user: UserRow, holdsAfter: boolean): SuperAdminImpact {
    const holdsNow =
      this.isSuperAdminRole(user.roleFk) && user.accountStatus === "active";

    if (!holdsNow || holdsAfter) return "none";
    if (this.activeSuperAdminCount <= 1) return "block";
    return this.activeSuperAdminCount === 2 ? "warn" : "none";
  }

  /**
   * The roles that may be picked in the editor: every active role, plus the
   * one this person is already on even if it has since been retired, so that
   * editing a name does not quietly move them.
   */
  assignableRoles = $derived(
    this.roles.filter(
      (r) => r.status === "active" || r.rolePk === this.userToEdit?.roleFk,
    ),
  );

  /**
   * Only somebody already on the role that manages roles may put another
   * person on it, or take them off it. For everybody else the option is
   * disabled rather than hidden — an admin who cannot assign it should still
   * be able to see that it exists and who is on it.
   */
  roleIsAssignable(rolePk: number): boolean {
    if (!this.isSuperAdminRole(rolePk)) return true;
    return this.canManageRoles;
  }

  /** Which side of the app a role works in, derived from the keys it holds. */
  kindOfRole(rolePk: number): RoleKind | null {
    const role = this.roleByPk(rolePk);
    return role ? roleKindOf(role.permissions) : null;
  }

  orgUnitByPk(orgUnitPk: number): OrgUnit | undefined {
    return this.orgUnits.find((unit) => unit.orgUnitPk === orgUnitPk);
  }

  employeeByPk(employeePk: number): EmployeeOption | undefined {
    return this.employees.find((person) => person.employeePk === employeePk);
  }

  /** Whether this person can be given a login right now, and if not, why. */
  employeeIsAvailable(person: EmployeeOption): boolean {
    return person.username === null && person.employmentStatus === "active";
  }

  /**
   * How many people are still waiting for an account. Shown in the editor so
   * an admin who finds the list empty knows to add the person on the
   * Employees page rather than hunting for a missing option.
   */
  availableEmployeeCount = $derived(
    this.employees.filter((person) => this.employeeIsAvailable(person)).length,
  );

  /** The person this account is for, once one has been picked. */
  selectedEmployee = $derived(
    this.formEmployeeFk
      ? this.employeeByPk(Number(this.formEmployeeFk))
      : undefined,
  );

  constructor() {
    $effect(() => {
      this.userToEdit;

      untrack(() => {
        if (!this.userToEdit) return;

        this.formEmployeeFk = String(this.userToEdit.employeeFk);
        this.formUsername = this.userToEdit.username;
        this.formRoleFk = String(this.userToEdit.roleFk);
        this.formIsActive = this.userToEdit.accountStatus === "active";
      });
    });
  }

  resetFormInputValues() {
    this.userToEdit = null;
    this.formEmployeeFk = "";
    this.formUsername = "";
    this.formRoleFk = "";
    this.formIsActive = true;
    this.formPassword = "";
    this.formSetPasswordManually = false;
  }

  showTemporaryPassword(password: string, forUser: UserRow) {
    this.temporaryPassword = password;
    this.temporaryPasswordFor = fullName(forUser.employee);
  }

  clearTemporaryPassword() {
    this.temporaryPassword = null;
    this.temporaryPasswordFor = null;
  }

  addUser(newUser: UserRow) {
    this.users = [newUser, ...this.users];
  }

  updateUser(updatedUser: UserRow) {
    this.users = this.users.map((u) =>
      u.userPk === updatedUser.userPk ? updatedUser : u,
    );
  }

  removeUser(userPk: number) {
    this.users = this.users.filter((u) => u.userPk !== userPk);
  }
}

export const { set: setUsersContext, get: getUsersContext } = makeContext(
  "users-context",
  UsersContext,
);
