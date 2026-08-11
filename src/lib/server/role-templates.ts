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
    permissions: ["admin:manage_users", "admin:manage_roles"],
  },

  {
    roleName: "GSU",
    description:
      "General Services Unit. Broad access across consumption sections; approves requests from encoder/requester roles.",
    permissions: [
      "fuel:view",
      "fuel:submit",
      "fuel:approve",
      "fuel:view_all",
      "electricity:view",
      "electricity:submit",
      "electricity:approve",
      "electricity:view_all",
      "water:view",
      "water:submit",
      "water:approve",
      "water:view_all",
      "paper:view",
      "paper:submit",
      "paper:approve",
      "paper:view_all",
      "air-travel:view",
      "air-travel:submit",
      "air-travel:approve",
      "air-travel:view_all",
      "eswm:view",
      "eswm:submit",
      "eswm:approve",
      "eswm:view_all",
    ],
  },

  {
    roleName: "Fuel Requester",
    description: "Submits fuel requests for approval.",
    permissions: ["fuel:view", "fuel:submit"],
  },

  {
    roleName: "Electricity Encoder",
    description: "Encodes electricity consumption data. No approval step.",
    permissions: ["electricity:view", "electricity:submit"],
  },

  {
    roleName: "Water Encoder",
    description: "Encodes water consumption data. No approval step.",
    permissions: ["water:view", "water:submit"],
  },

  {
    roleName: "Paper Encoder",
    description: "Encodes paper consumption data. No approval step.",
    permissions: ["paper:view", "paper:submit"],
  },

  {
    roleName: "Air Travel Encoder",
    description: "Encodes air travel data. No approval step.",
    permissions: ["air-travel:view", "air-travel:submit"],
  },

  {
    roleName: "ESWM Encoder",
    description: "Encodes ESWM data. No approval step.",
    permissions: ["eswm:view", "eswm:submit"],
  },

  {
    roleName: "GHG Focal",
    description:
      "View-only role. Sees GHG-relevant data rolled up from fuel, electricity, and air travel — does not encode anything itself.",
    permissions: ["ghg:view", "ghg:view_all"],
  },
] as const satisfies readonly RoleTemplate[];

/**
 * Convenience type: a union of the role names above, e.g.
 *   "Admin" | "GSU" | "Fuel Requester" | ... | "GHG Focal"
 * Handy if you ever want to look up a specific template by name with
 * type-checking (e.g. in create-admin.ts, which looks up "Admin").
 */
export type RoleTemplateName = (typeof ROLE_TEMPLATES)[number]["roleName"];
