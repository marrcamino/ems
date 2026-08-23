import { roleKindOf, type RoleKind } from "$lib/rbac/permission-tree";
import type { PermissionKey, PermissionRow } from "$lib/server/permissions";
import type { Role } from "$lib/types";
import { makeContext } from "@/utils";
import { untrack } from "svelte";

export type RoleRow = Role & {
  permissions: PermissionKey[];
  userCount: number;
};

/** A create-form preset, as the page load hands it over. */
export interface RoleTemplateOption {
  roleName: string;
  description: string;
  kind: RoleKind;
  permissions: string[];
}

export class RolesContext {
  roles: RoleRow[] = $state([]);

  /**
   * The role holding admin:manage_roles, found by permission rather than by
   * name. Everything that treats a role as protected reads this — there is no
   * is_protected column, the condition is live.
   */
  superAdminRolePk: number | null = $state(null);

  templates: RoleTemplateOption[] = $state([]);

  /**
   * The permission list as defined in code. Held here so table cells can turn
   * a role's stored keys back into readable section names without each one
   * being handed the list separately.
   */
  permissionDefs: PermissionRow[] = $state([]);

  addEditDialog = $state(false);
  deleteAlertDialog = $state(false);
  roleToEdit: RoleRow | null = $state(null);

  mode: "edit" | "add" = $derived(this.roleToEdit !== null ? "edit" : "add");

  formRoleName = $state("");
  formDescription = $state("");
  formIsActive = $state(true);
  formPermissions: string[] = $state([]);

  /**
   * Admin or staff. Asked before any checkbox is shown when creating, and
   * derived from what the role already holds when editing — a role that mixes
   * the two could never exercise both halves. Null only while a new role is
   * still unclassified.
   */
  formKind: RoleKind | null = $state(null);

  /** Whichever preset filled the form last, so the picker can show it. */
  formTemplateName: string | null = $state(null);

  isSuperAdminRole(role: Pick<RoleRow, "rolePk">) {
    return (
      this.superAdminRolePk !== null && role.rolePk === this.superAdminRolePk
    );
  }

  /**
   * The role open in the editor is frozen: description is the only editable
   * field, and its permissions are shown as a plain list with nothing to
   * click.
   */
  editingIsFrozen = $derived(
    this.roleToEdit !== null && this.isSuperAdminRole(this.roleToEdit),
  );

  constructor() {
    $effect(() => {
      this.roleToEdit;

      untrack(() => {
        if (!this.roleToEdit) return;

        this.formRoleName = this.roleToEdit.roleName;
        this.formDescription = this.roleToEdit.description ?? "";
        this.formIsActive = this.roleToEdit.status === "active";
        this.formPermissions = [...this.roleToEdit.permissions];
        this.formKind = roleKindOf(this.roleToEdit.permissions);
        this.formTemplateName = null;
      });
    });
  }

  /** Switching kind mid-create abandons the other side's ticks entirely. */
  chooseKind(kind: RoleKind) {
    if (this.formKind === kind) return;

    this.formKind = kind;
    this.formPermissions = [];
    this.formTemplateName = null;
  }

  /**
   * Apply a preset. Presets are defaults only — nothing links the saved role
   * back to the template it started from, and every tick stays editable.
   */
  applyTemplate(template: RoleTemplateOption) {
    this.formKind = template.kind;
    this.formTemplateName = template.roleName;
    this.formPermissions = [...template.permissions];

    // if (!this.formRoleName.trim()) this.formRoleName = template.roleName;
    // if (!this.formDescription.trim()) this.formDescription = template.description;
    this.formRoleName = template.roleName;
    this.formDescription = template.description;
  }

  resetFormInputValues() {
    this.roleToEdit = null;
    this.formRoleName = "";
    this.formDescription = "";
    this.formIsActive = true;
    this.formPermissions = [];
    this.formKind = null;
    this.formTemplateName = null;
  }

  addRole(newRole: RoleRow) {
    this.roles = [newRole, ...this.roles];
  }

  updateRole(updatedRole: RoleRow) {
    this.roles = this.roles.map((r) =>
      r.rolePk === updatedRole.rolePk ? updatedRole : r,
    );
  }

  removeRole(rolePk: number) {
    this.roles = this.roles.filter((r) => r.rolePk !== rolePk);
  }
}

export const { set: setRolesContext, get: getRolesContext } = makeContext(
  "roles-context",
  RolesContext,
);
