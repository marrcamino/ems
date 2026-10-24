/**
 * scripts/lib/super-admin.ts
 *
 * Query helpers for the critical permission `roles:manage` — see
 * "RBAC design — locked decisions.md" for the uniqueness / immutability /
 * last-user-guard rules it enforces. Exactly one role in the system may hold
 * this key, and only create-admin.ts ever creates that role; the role editor
 * never renders the key at all.
 *
 * `users:manage` is deliberately NOT part of this check any more. A
 * role that manages users but not roles is a legitimate sub-admin, so the key
 * is freely grantable and says nothing about super-admin status.
 *
 * Shared by create-admin.ts and reset-admin-password.ts, which both need to
 * know which role holds the key and which users under it can still sign in.
 */

import type mysql from "mysql2/promise";

export const CRITICAL_PERMISSION_KEY = "roles:manage";

export interface SuperAdmin {
  userPk: number;
  username: string;
}

/**
 * The single role holding `roles:manage`, or null if it does not exist
 * yet. Looked up by permission rather than by role name: the name is only a
 * label and is editable in principle, whereas holding the key IS what makes a
 * role the super-admin role.
 */
export async function findSuperAdminRolePk(
  connection: mysql.Connection,
): Promise<number | null> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
    SELECT r.role_pk
    FROM role r
    JOIN role_permission rp ON rp.role_fk = r.role_pk
    JOIN permission p ON p.permission_pk = rp.permission_fk
    WHERE p.\`key\` = ?
    LIMIT 1
    `,
    [CRITICAL_PERMISSION_KEY],
  );

  return rows.length > 0 ? (rows[0].role_pk as number) : null;
}

/**
 * Users whose role holds `roles:manage` and who can actually sign in:
 * an active account, and still employed here.
 *
 * The employee half matters. Somebody marked as no longer employed keeps an
 * active account but is refused at sign-in, so counting them would make
 * reset-admin-password offer a password nobody can use, and make create-admin
 * refuse to set up a replacement while nobody can get in.
 */
export async function getActiveSuperAdmins(
  connection: mysql.Connection,
): Promise<SuperAdmin[]> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
    SELECT DISTINCT u.user_pk, u.username
    FROM user u
    JOIN employee e ON e.employee_pk = u.employee_fk
    JOIN role r ON u.role_fk = r.role_pk
    JOIN role_permission rp ON rp.role_fk = r.role_pk
    JOIN permission p ON p.permission_pk = rp.permission_fk
    WHERE u.account_status = 'active'
      AND e.employment_status = 'active'
      AND p.\`key\` = ?
    ORDER BY u.username
    `,
    [CRITICAL_PERMISSION_KEY],
  );

  return rows.map((row) => ({
    userPk: row.user_pk as number,
    username: row.username as string,
  }));
}
