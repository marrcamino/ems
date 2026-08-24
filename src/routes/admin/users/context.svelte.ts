import { roleKindOf, type RoleKind } from "$lib/rbac/permission-tree";
import type { PermissionKey, PermissionRow } from "$lib/server/permissions";
import type { OrgUnit } from "$lib/types";
import { makeContext } from "@/utils";
import { untrack } from "svelte";

/**
 * A user as the table shows them: the account row with the role and section
 * names already resolved, and without the password hash or the failed-attempt
 * counter, which the page has no use for.
 */
export interface UserRow {
  userPk: number;
  username: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  positionTitle: string | null;
  roleFk: number;
  roleName: string;
  orgUnitFk: number | null;
  orgUnitName: string | null;
  orgUnitAbbr: string | null;
  status: "active" | "inactive" | "locked";
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

/** A role as the assignment dropdown needs it, with the keys it holds. */
export interface RoleOption {
  rolePk: number;
  roleName: string;
  description: string | null;
  status: "active" | "inactive";
  permissions: PermissionKey[];
}

/**
 * What a change would do to the group of active accounts that can manage
 * roles. "block" is the last one leaving, which is refused outright; "warn"
 * is the second-to-last leaving, which is allowed but said out loud first.
 */
export type SuperAdminImpact = "none" | "warn" | "block";

export function fullName(
  user: Pick<UserRow, "firstName" | "middleName" | "lastName" | "suffix">,
): string {
  return [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(" ");
}

/** Locked by failed sign-in attempts, as opposed to switched off by an admin. */
export function isTemporarilyLocked(user: UserRow): boolean {
  return (
    user.status === "locked" ||
    (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now())
  );
}

export class UsersContext {
  users: UserRow[] = $state([]);
  roles: RoleOption[] = $state([]);
  orgUnits: OrgUnit[] = $state([]);

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

  formUsername = $state("");
  formFirstName = $state("");
  formMiddleName = $state("");
  formLastName = $state("");
  formSuffix = $state("");
  formPositionTitle = $state("");
  formRoleFk = $state("");
  formOrgUnitFk = $state("");
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
          (u) => u.roleFk === this.superAdminRolePk && u.status === "active",
        ).length,
  );

  /**
   * Whether a change may go ahead, and whether it deserves a warning first.
   * The server refuses the last one outright; this is what lets the dialog
   * say so before the button is pressed rather than after.
   */
  impactOfLeaving(user: UserRow, holdsAfter: boolean): SuperAdminImpact {
    const holdsNow =
      this.isSuperAdminRole(user.roleFk) && user.status === "active";

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

  /** Active sections, plus whichever one this person is already in. */
  assignableOrgUnits = $derived(
    this.orgUnits.filter(
      (unit) =>
        unit.status === "active" || unit.orgUnitPk === this.userToEdit?.orgUnitFk,
    ),
  );

  constructor() {
    $effect(() => {
      this.userToEdit;

      untrack(() => {
        if (!this.userToEdit) return;

        this.formUsername = this.userToEdit.username;
        this.formFirstName = this.userToEdit.firstName;
        this.formMiddleName = this.userToEdit.middleName ?? "";
        this.formLastName = this.userToEdit.lastName;
        this.formSuffix = this.userToEdit.suffix ?? "";
        this.formPositionTitle = this.userToEdit.positionTitle ?? "";
        this.formRoleFk = String(this.userToEdit.roleFk);
        this.formOrgUnitFk = this.userToEdit.orgUnitFk
          ? String(this.userToEdit.orgUnitFk)
          : "";
        this.formIsActive = this.userToEdit.status === "active";
      });
    });
  }

  resetFormInputValues() {
    this.userToEdit = null;
    this.formUsername = "";
    this.formFirstName = "";
    this.formMiddleName = "";
    this.formLastName = "";
    this.formSuffix = "";
    this.formPositionTitle = "";
    this.formRoleFk = "";
    this.formOrgUnitFk = "";
    this.formIsActive = true;
    this.formPassword = "";
    this.formSetPasswordManually = false;
  }

  showTemporaryPassword(password: string, forUser: UserRow) {
    this.temporaryPassword = password;
    this.temporaryPasswordFor = fullName(forUser);
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
