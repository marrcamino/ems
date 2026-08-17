/**
 * Per the locked RBAC decisions:
 * - These templates are NEVER saved to the DB as their own record.
 * - They're only used as pre-checked defaults when an admin creates a new
 *   role in the UI (admin can still tick/untick before saving).
 * - The "Admin" entry here is also what create-admin.ts reads to bootstrap
 *   the very first Admin role + user on a fresh server.
 *
 * NOTE: This is a SAMPLE set showing the pattern. Role names, and exactly
 * which permissions each one starts with, are yours to edit — nothing here
 * is locked except the overall shape (roleName / description / permissions).
 */

import type { PermissionKey } from "./permissions";

export interface RoleTemplate {
  roleName: string;
  description: string;
  permissions: readonly PermissionKey[];
}

export const ROLE_TEMPLATES = [
  {
    roleName: "Admin",
    description:
      "Full system access. Manages users, roles, and permissions. Not a routine participant in approval workflows.",
    permissions: ["admin:manage_users", "admin:manage_roles", "admin:view"],
  },

  {
    roleName: "GSU",
    description:
      "General Services Unit. Broad access across consumption sections; approves requests from encoder/requester roles.",
    permissions: [
      "fuel:view",
      "electricity:view",
      "water:view",
      "paper:view",
      "air-travel:view",
      "eswm:view",
    ],
  },

  {
    roleName: "Fuel Requester",
    description: "Submits fuel requests for approval.",
    permissions: ["fuel:view"],
  },

  {
    roleName: "Electricity Encoder",
    description: "Encodes electricity consumption data. No approval step.",
    permissions: ["electricity:view"],
  },

  {
    roleName: "Water Encoder",
    description: "Encodes water consumption data. No approval step.",
    permissions: ["water:view"],
  },

  {
    roleName: "Paper Encoder",
    description: "Encodes paper consumption data. No approval step.",
    permissions: ["paper:view"],
  },

  {
    roleName: "Air Travel Encoder",
    description: "Encodes air travel data. No approval step.",
    permissions: ["air-travel:view"],
  },

  {
    roleName: "ESWM Encoder",
    description: "Encodes ESWM data. No approval step.",
    permissions: ["eswm:view"],
  },

  {
    roleName: "GHG Focal",
    description:
      "View-only role. Sees GHG-relevant data rolled up from fuel, electricity, and air travel — does not encode anything itself.",
    permissions: ["ghg:view"],
  },
] as const satisfies readonly RoleTemplate[];

/**
 * Convenience type: a union of the role names above, e.g.
 *   "Admin" | "GSU" | "Fuel Requester" | ... | "GHG Focal"
 * Handy if you ever want to look up a specific template by name with
 * type-checking (e.g. in create-admin.ts, which looks up "Admin").
 */
export type RoleTemplateName = (typeof ROLE_TEMPLATES)[number]["roleName"];
