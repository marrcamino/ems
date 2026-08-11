/**
 * scripts/lib/super-admin.ts
 *
 * Query helper for the critical permission pair (admin:manage_roles +
 * admin:manage_users) — see "RBAC design — locked decisions.md" for the
 * uniqueness / self-edit-lock / last-user-guard rules this pair enforces.
 * Shared by create-admin.ts and reset-admin-password.ts, which both need
 * to know which active users currently hold both permissions.
 */

import type mysql from "mysql2/promise";

export const CRITICAL_PERMISSION_KEYS = [
  "admin:manage_users",
  "admin:manage_roles",
] as const;

export interface SuperAdmin {
  userPk: number;
  username: string;
}

/** Active users whose role holds BOTH critical permissions. */
export async function getActiveSuperAdmins(
  connection: mysql.Connection,
): Promise<SuperAdmin[]> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
    SELECT u.user_pk, u.username
    FROM user u
    JOIN role r ON u.role_fk = r.role_pk
    JOIN role_permission rp ON rp.role_fk = r.role_pk
    JOIN permission p ON p.permission_pk = rp.permission_fk
    WHERE u.status = 'active'
      AND p.\`key\` IN (?)
    GROUP BY u.user_pk, u.username
    HAVING COUNT(DISTINCT p.\`key\`) = 2
    ORDER BY u.username
    `,
    [CRITICAL_PERMISSION_KEYS],
  );

  return rows.map((row) => ({
    userPk: row.user_pk as number,
    username: row.username as string,
  }));
}
