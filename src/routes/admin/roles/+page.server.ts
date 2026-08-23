// src/routes/admin/roles/+page.server.ts
import { can } from "$lib/rbac/access";
import {
  keysForKind,
  RESTRICTED_PERMISSION_KEYS,
  roleKindOf,
  SUPER_ADMIN_KEY,
  type RoleKind,
} from "$lib/rbac/permission-tree";
import { db } from "$lib/server/db";
import { permission, role, rolePermission, user } from "$lib/server/db/schema";
import {
  expandPermissions,
  PERMISSIONS,
  type PermissionKey,
} from "$lib/server/permissions";
import { ROLE_TEMPLATES } from "$lib/server/role-templates";
import { error, fail } from "@sveltejs/kit";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const ROLE_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 255;

const restrictedKeys = new Set<string>(RESTRICTED_PERMISSION_KEYS);

/**
 * The super-admin role is found by the permission it holds, never by name —
 * there is no is_protected column and the name is editable data everywhere
 * else in the system. Exactly one role may hold this key.
 */
async function getSuperAdminRolePk(): Promise<number | null> {
  const [row] = await db
    .select({ rolePk: rolePermission.roleFk })
    .from(rolePermission)
    .innerJoin(
      permission,
      eq(rolePermission.permissionFk, permission.permissionPk),
    )
    .where(eq(permission.key, SUPER_ADMIN_KEY));

  return row?.rolePk ?? null;
}

async function isRoleNameTaken(roleName: string, excludeRolePk?: number) {
  const clash = excludeRolePk
    ? and(eq(role.roleName, roleName), ne(role.rolePk, excludeRolePk))
    : eq(role.roleName, roleName);

  const [existing] = await db
    .select({ rolePk: role.rolePk })
    .from(role)
    .where(clash);

  return existing !== undefined;
}

/**
 * Everything the client is allowed to send, cleaned up.
 *
 * The role name and description are trimmed and length-checked, and the
 * permission selection is reduced to keys that could legitimately have been
 * ticked: the restricted Roles-page keys are dropped because the editor never
 * renders them, and the rest is narrowed to one side of the admin/staff
 * split because a role is only ever one kind. A request that mixes the two,
 * or that carries a restricted key, came from something other than the
 * editor.
 */
function readRoleForm(form: FormData) {
  const roleName = ((form.get("roleName") as string) ?? "").trim();
  const rawDescription = ((form.get("description") as string) ?? "").trim();
  const submitted = form.getAll("permissions") as string[];
  const requestedKind = form.get("kind") as RoleKind | null;

  const kind: RoleKind =
    requestedKind === "admin" || requestedKind === "staff"
      ? requestedKind
      : (roleKindOf(submitted) ?? "staff");

  return {
    roleName,
    description: rawDescription.slice(0, DESCRIPTION_MAX_LENGTH) || null,
    kind,
    permissions: keysForKind(submitted, kind) as PermissionKey[],
  };
}

function validateRoleForm(input: ReturnType<typeof readRoleForm>) {
  if (!input.roleName) return "Enter a name for this role.";
  if (input.roleName.length > ROLE_NAME_MAX_LENGTH) {
    return `The role name can be at most ${ROLE_NAME_MAX_LENGTH} characters.`;
  }
  if (input.permissions.length === 0) {
    return "Pick at least one thing this role can do.";
  }
  return null;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Viewing the page needs only view_roles; the create/update/delete actions
  // below still each require admin:manage_roles.
  if (!can(locals.permissions, "admin:view_roles")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const roles = await db.select().from(role);

  const permissionRows = await db
    .select({
      roleFk: rolePermission.roleFk,
      key: permission.key,
    })
    .from(rolePermission)
    .innerJoin(
      permission,
      eq(rolePermission.permissionFk, permission.permissionPk),
    );

  const permissionsByRole = new Map<number, PermissionKey[]>();
  for (const row of permissionRows) {
    const keys = permissionsByRole.get(row.roleFk) ?? [];
    keys.push(row.key as PermissionKey);
    permissionsByRole.set(row.roleFk, keys);
  }

  // Shown in the table, and the reason a delete can be refused — an admin
  // seeing "4 users" understands the refusal before they try.
  const userCounts = await db
    .select({ roleFk: user.roleFk, total: count() })
    .from(user)
    .groupBy(user.roleFk);

  const usersByRole = new Map(userCounts.map((r) => [r.roleFk, r.total]));

  const roles_with_permissions = roles.map((r) => ({
    ...r,
    permissions: permissionsByRole.get(r.rolePk) ?? [],
    userCount: usersByRole.get(r.rolePk) ?? 0,
  }));

  /**
   * Templates are pre-checked defaults for the create form and nothing more —
   * they are never stored, and a role created from one keeps no link back to
   * it. The Super Admin template is withheld: it is the only one carrying the
   * Roles-page keys, and it exists for scripts/create-admin.ts, not for the
   * editor. It is identified by that key rather than by its name.
   */
  const templates = ROLE_TEMPLATES.filter(
    (template) => !template.permissions.some((key) => restrictedKeys.has(key)),
  ).map((template) => {
    const kind = roleKindOf(template.permissions) ?? "staff";
    return {
      roleName: template.roleName,
      description: template.description,
      kind,
      permissions: keysForKind(template.permissions, kind),
    };
  });

  return {
    roles: roles_with_permissions,
    permissionDefs: PERMISSIONS,
    templates,
    superAdminRolePk: await getSuperAdminRolePk(),
  };
};

/**
 * Persists the role's permissions as the implication CLOSURE of what was
 * ticked, not the raw selection — ticking "Manage org units" also stores
 * "View org units" and "View the admin page". Otherwise the role would be
 * blocked by the very load functions it is meant to reach.
 *
 * The editor already cascades ticks, so in practice the closure is a no-op on
 * anything the UI produced. It runs anyway because a POST can be crafted by
 * hand: expanding here means the database can never reach a state the editor
 * would not have produced.
 *
 * Returns the expanded key list so the caller can echo it back to the client.
 */
async function setRolePermissions(rolePk: number, selected: PermissionKey[]) {
  const keys = [...expandPermissions(selected)].filter(
    (key) => !restrictedKeys.has(key),
  ) as PermissionKey[];

  await db.delete(rolePermission).where(eq(rolePermission.roleFk, rolePk));

  if (!keys.length) return keys;

  const permissionRows = await db
    .select({ permissionPk: permission.permissionPk })
    .from(permission)
    .where(inArray(permission.key, keys));

  if (!permissionRows.length) return keys;

  await db.insert(rolePermission).values(
    permissionRows.map((p) => ({
      roleFk: rolePk,
      permissionFk: p.permissionPk,
    })),
  );

  return keys;
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_roles")) {
      return fail(403, { error: "You do not have permission to add roles." });
    }

    const form = await request.formData();
    const input = readRoleForm(form);

    const invalid = validateRoleForm(input);
    if (invalid) return fail(400, { error: invalid });

    if (await isRoleNameTaken(input.roleName)) {
      return fail(409, {
        error: `There is already a role named "${input.roleName}". Pick a different name.`,
      });
    }

    const result = await db.insert(role).values({
      roleName: input.roleName,
      description: input.description,
      createdByFk: locals.user?.userPk ?? null,
    });
    const rolePk = result[0].insertId;

    const storedKeys = await setRolePermissions(rolePk, input.permissions);

    const [newRow] = await db.select().from(role).where(eq(role.rolePk, rolePk));
    if (!newRow) {
      return fail(500, {
        error: "The role was saved but could not be read back.",
      });
    }

    return {
      success: true,
      newRow: { ...newRow, permissions: storedKeys, userCount: 0 },
    };
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_roles")) {
      return fail(403, { error: "You do not have permission to edit roles." });
    }

    const form = await request.formData();
    const rolePk = Number(form.get("rolePk"));
    const input = readRoleForm(form);
    const status = form.get("status") === "inactive" ? "inactive" : "active";

    const [existing] = await db
      .select()
      .from(role)
      .where(eq(role.rolePk, rolePk));

    if (!existing) return fail(404, { error: "That role no longer exists." });

    const superAdminRolePk = await getSuperAdminRolePk();
    const isSuperAdmin = superAdminRolePk === rolePk;

    /**
     * The super-admin role is frozen. Its description is the only field
     * anyone may change — the name, the status, and the permission set are
     * fixed, and the permission set is kept current by the sync script's
     * backfill rather than by anything here. The editor already renders those
     * fields as read-only, so reaching this branch with other changes means
     * the request did not come from the editor; the extra fields are ignored
     * rather than refused, so a legitimate description edit still lands.
     */
    if (isSuperAdmin) {
      const description =
        ((form.get("description") as string) ?? "")
          .trim()
          .slice(0, DESCRIPTION_MAX_LENGTH) || null;

      await db
        .update(role)
        .set({ description, updatedAt: new Date() })
        .where(eq(role.rolePk, rolePk));

      const [updatedRow] = await db
        .select()
        .from(role)
        .where(eq(role.rolePk, rolePk));

      const [{ total }] = await db
        .select({ total: count() })
        .from(user)
        .where(eq(user.roleFk, rolePk));

      // Read the keys back rather than echoing the form: the editor sends
      // none for this role, and its permission set is not ours to restate.
      const held = await db
        .select({ key: permission.key })
        .from(rolePermission)
        .innerJoin(
          permission,
          eq(rolePermission.permissionFk, permission.permissionPk),
        )
        .where(eq(rolePermission.roleFk, rolePk));

      return {
        success: true,
        updatedRow: {
          ...updatedRow,
          permissions: held.map((row) => row.key as PermissionKey),
          userCount: total,
        },
      };
    }

    const invalid = validateRoleForm(input);
    if (invalid) return fail(400, { error: invalid });

    if (await isRoleNameTaken(input.roleName, rolePk)) {
      return fail(409, {
        error: `There is already a role named "${input.roleName}". Pick a different name.`,
      });
    }

    await db
      .update(role)
      .set({
        roleName: input.roleName,
        description: input.description,
        status,
        updatedAt: new Date(),
      })
      .where(eq(role.rolePk, rolePk));

    const storedKeys = await setRolePermissions(rolePk, input.permissions);

    const [updatedRow] = await db
      .select()
      .from(role)
      .where(eq(role.rolePk, rolePk));

    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .where(eq(user.roleFk, rolePk));

    return {
      success: true,
      updatedRow: { ...updatedRow, permissions: storedKeys, userCount: total },
    };
  },

  delete: async ({ request, locals }) => {
    if (!can(locals.permissions, "admin:manage_roles")) {
      return fail(403, {
        error: "You do not have permission to delete roles.",
      });
    }

    const form = await request.formData();
    const rolePk = Number(form.get("rolePk"));

    const superAdminRolePk = await getSuperAdminRolePk();
    if (superAdminRolePk === rolePk) {
      return fail(409, {
        error:
          "This role is the only one that can manage roles, so it can't be deleted. Without it nobody could open this page again.",
      });
    }

    const [assignedUser] = await db
      .select({ pk: user.userPk })
      .from(user)
      .where(eq(user.roleFk, rolePk));

    if (assignedUser) {
      return fail(409, {
        error:
          "One or more users are assigned to this role and it can't be deleted. Reassign them first.",
      });
    }

    await db.delete(rolePermission).where(eq(rolePermission.roleFk, rolePk));
    await db.delete(role).where(eq(role.rolePk, rolePk));

    return { success: true, deleted: true };
  },
};
