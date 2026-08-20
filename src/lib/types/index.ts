import type * as db from "$lib/server/db/schema";

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

export type SessionUser = Omit<
  User,
  | "passwordHash"
  | "failedLoginAttempts"
  | "lockedUntil"
  | "lastLoginAt"
  | "createdByFk"
  | "createdAt"
  | "updatedAt"
>;
