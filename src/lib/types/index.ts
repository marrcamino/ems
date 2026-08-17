import type {
  user,
  role,
  permission,
  session,
  rolePermission,
} from "$lib/server/db/schema";

// user
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

// role
export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

// session
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

// permission
export type Permission = typeof permission.$inferSelect;
export type NewPermission = typeof permission.$inferInsert;

// role_permission
export type RolePermission = typeof rolePermission.$inferSelect;
export type NewRolePermission = typeof rolePermission.$inferInsert;
