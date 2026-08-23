/**
 * location of this file: src/lib/server/role-templates.ts
 *
 * Per the locked RBAC decisions:
 * - These templates are NEVER saved to the DB as their own record.
 * - They're only used as pre-checked defaults when an admin creates a new
 *   role in the UI (admin can still tick/untick before saving).
 * - The "Super Admin" entry here is also what create-admin.ts reads to
 *   bootstrap the very first super-admin role + user on a fresh server.
 *
 * ADMIN vs STAFF: a role is either an admin role (only `admin:*` keys) or a
 * staff role (only non-admin keys) — never both. Holding `admin:view`
 * redirects the user into /admin, so a staff key on an admin role could
 * never be exercised. Every template below picks a side.
 *
 * CRITICAL: no template may include `admin:manage_roles` except "Super
 * Admin". Exactly one role in the system may hold that key, and it is
 * created only by scripts/create-admin.ts — the role editor never renders
 * it at all.
 *
 * Descriptions are shown verbatim in the role editor, so they're written for
 * a non-technical admin: plain language, no permission keys.
 *
 * NOTE: This is a SAMPLE set showing the pattern. Role names, and exactly
 * which permissions each one starts with, are yours to edit — nothing here
 * is locked except the overall shape (roleName / description / permissions).
 */

import { PERMISSIONS, type PermissionKey } from "./permissions";

export interface RoleTemplate {
  roleName: string;
  description: string;
  permissions: readonly PermissionKey[];
}

// Every `admin:*` key. PERMISSIONS is the single source of the full key list
// — it already handles flattening nested submodules, so this stays correct as
// the admin module grows. Deliberately NOT every permission in the system:
// staff keys are unreachable for a user who lands in /admin.
const ALL_ADMIN_PERMISSIONS: readonly PermissionKey[] = PERMISSIONS.filter(
  (p) => p.module === "admin",
).map((p) => p.key);

// The same list minus the two roles-page keys. An ordinary Admin gains any
// new admin page automatically, but the Roles page stays super-admin-only:
// with `admin:manage_roles` restricted to one role, a view-only Roles page
// would be a dead end for everyone else. Role details are surfaced in the
// user editor instead.
const ROLES_PAGE_KEYS = ["admin:view_roles", "admin:manage_roles"] as const;

const ADMIN_PERMISSIONS: readonly PermissionKey[] =
  ALL_ADMIN_PERMISSIONS.filter(
    (key) => !ROLES_PAGE_KEYS.includes(key as (typeof ROLES_PAGE_KEYS)[number]),
  );

export const ROLE_TEMPLATES = [
  {
    // This role name as "Super Admin" can't be edited in the database once it
    // is inserted.
    roleName: "Super Admin",
    description:
      "Highest level of access. Can do everything an Admin can, and is the only role allowed to create and edit roles. Set up once when the system is installed, and cannot be renamed, deactivated, or deleted afterwards.",
    permissions: ALL_ADMIN_PERMISSIONS,
  },

  {
    roleName: "Admin",
    description:
      "Full access to every admin page: all consumption records, user accounts, and the organizational structure. Does not have access to role management.",
    permissions: ADMIN_PERMISSIONS,
  },

  {
    roleName: "GSU",
    description:
      "General Services Unit. Can open every consumption section and reviews the entries submitted by encoders.",
    permissions: [
      "fuel:view",
      "electricity:view",
      "water:view",
      "paper:view",
      "air_travel:view",
      "eswm:view",
    ],
  },

  {
    roleName: "Electricity Encoder",
    description: "Records electricity consumption.",
    permissions: ["electricity:view"],
  },

  {
    roleName: "Air Travel Encoder",
    description: "Records air travel details.",
    permissions: ["air_travel:view"],
  },

  {
    roleName: "ESWM Encoder",
    description: "Records ecological solid waste management data.",
    permissions: ["eswm:view"],
  },

  {
    roleName: "GHG Focal",
    description:
      "Views the greenhouse gas figures compiled from fuel, electricity, and air travel. Does not record anything.",
    permissions: ["ghg:view"],
  },
] as const satisfies readonly RoleTemplate[];

/**
 * Convenience type: a union of the role names above, e.g.
 *   "Super Admin" | "Admin" | "GSU" | ... | "GHG Focal"
 * Handy if you ever want to look up a specific template by name with
 * type-checking (e.g. in create-admin.ts, which looks up "Super Admin").
 */
export type RoleTemplateName = (typeof ROLE_TEMPLATES)[number]["roleName"];
