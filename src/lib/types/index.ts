import type * as db from "$lib/server/db/schema";

// employee
export type Employee = typeof db.employee.$inferSelect;
export type NewEmployee = typeof db.employee.$inferInsert;

// user
export type User = typeof db.user.$inferSelect;
export type NewUser = typeof db.user.$inferInsert;

// role
export type Role = typeof db.role.$inferSelect;
export type NewRole = typeof db.role.$inferInsert;

// session
export type Session = typeof db.session.$inferSelect;
export type NewSession = typeof db.session.$inferInsert;

// org_unit
export type OrgUnit = typeof db.orgUnit.$inferSelect;
export type NewOrgUnit = typeof db.orgUnit.$inferInsert;

// permission
export type Permission = typeof db.permission.$inferSelect;
export type NewPermission = typeof db.permission.$inferInsert;

// role_permission
export type RolePermission = typeof db.rolePermission.$inferSelect;
export type NewRolePermission = typeof db.rolePermission.$inferInsert;

/**
 * The signed-in person as the app sees them. The login half comes from `user`,
 * with the sensitive and bookkeeping columns stripped; the person half comes
 * from the `employee` row the login points at.
 *
 * Kept nested rather than flattened so it stays obvious which table each field
 * came from — the whole point of separating the two.
 */
export type SessionUser = Omit<
  User,
  | "passwordHash"
  | "failedLoginAttempts"
  | "lockedUntil"
  | "lastLoginAt"
  | "createdByFk"
  | "createdAt"
  | "updatedAt"
> & {
  employee: Pick<
    Employee,
    | "employeePk"
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "positionTitle"
    | "orgUnitFk"
  >;
};
