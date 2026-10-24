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
 * A role may mix any keys. The four templates are the starting points
 * decided on 24 October 2026
 * (.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md).
 *
 * CRITICAL: no template may include `roles:manage` or `roles:view` except
 * "Super Admin". Exactly one role in the system may hold `roles:manage`, and
 * it is created only by scripts/create-admin.ts — the role editor never
 * renders either key at all.
 *
 * Descriptions are shown verbatim in the role editor, so they're written for
 * a non-technical admin: plain language, no permission keys.
 */

import { PERMISSIONS, type PermissionKey } from "./permissions";

export interface RoleTemplate {
  roleName: string;
  description: string;
  permissions: readonly PermissionKey[];
}

// Every key. PERMISSIONS is the single source of the full key list, so a new
// module reaches the super-admin template without anyone listing it here.
const ALL_PERMISSIONS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);

export const ROLE_TEMPLATES = [
  {
    // This role name as "Super Admin" can't be edited in the database once it
    // is inserted.
    roleName: "Super Admin",
    description:
      "Highest level of access. Can do everything in the system, and is the only role allowed to create and edit roles. Set up once when the system is installed, and cannot be renamed, deactivated, or deleted afterwards.",
    permissions: ALL_PERMISSIONS,
  },

  {
    // No Roles keys, and no fuel work: the admin does not do GSU's job.
    roleName: "Admin",
    description:
      "Runs the system: user accounts, employee records, the organizational structure, and the signatories. Does not do fuel work or manage roles.",
    permissions: [
      "users:view",
      "users:manage",
      "employees:view",
      "employees:manage",
      "org_units:view",
      "org_units:manage",
      "signatories:view",
      "signatories:manage",
    ],
  },

  {
    roleName: "GSU",
    description:
      "General Services Unit. Records fuel purchase orders and assets, and sees the fuel records of every office.",
    permissions: [
      "fuel:view",
      "fuel:view_all_offices",
      "purchase_orders:view",
      "purchase_orders:manage",
      "assets:view",
      "assets:manage",
    ],
  },

  {
    roleName: "Staff",
    description: "Sees the fuel records of their own office.",
    permissions: ["fuel:view"],
  },
] as const satisfies readonly RoleTemplate[];

/**
 * Convenience type: a union of the role names above, e.g.
 *   "Super Admin" | "Admin" | "GSU" | "Staff"
 * Handy if you ever want to look up a specific template by name with
 * type-checking (e.g. in create-admin.ts, which looks up "Super Admin").
 */
export type RoleTemplateName = (typeof ROLE_TEMPLATES)[number]["roleName"];
