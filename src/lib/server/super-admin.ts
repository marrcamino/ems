// src/lib/server/super-admin.ts
import { SUPER_ADMIN_KEY } from "$lib/rbac/permission-tree";
import { db } from "$lib/server/db";
import {
  employee,
  permission,
  rolePermission,
  user,
} from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * The super-admin role is found by the permission it holds, never by name —
 * there is no is_protected column, and the role's name is editable data.
 * Exactly one role may hold this key.
 */
export async function getSuperAdminRolePk(): Promise<number | null> {
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

/**
 * The people who can manage roles and can actually sign in to do it: on the
 * super-admin role, with an active account, and still employed here.
 *
 * The employee half is what matters. The sign-in refuses anybody marked as no
 * longer employed whatever their account says, so a count taken from the
 * account alone includes people who are locked out.
 */
export async function listSuperAdminsWhoCanSignIn(): Promise<
  { userPk: number; employeePk: number }[]
> {
  const superAdminRolePk = await getSuperAdminRolePk();
  if (superAdminRolePk === null) return [];

  return db
    .select({ userPk: user.userPk, employeePk: employee.employeePk })
    .from(user)
    .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
    .where(
      and(
        eq(user.roleFk, superAdminRolePk),
        eq(user.accountStatus, "active"),
        eq(employee.employmentStatus, "active"),
      ),
    );
}
