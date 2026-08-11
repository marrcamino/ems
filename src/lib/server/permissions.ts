/**
 * Permissions are grouped by module first, then by action. This is the
 * fixed, dev-defined list of every permission key in the system — never
 * created/edited by an admin at runtime (roles, which ARE runtime-editable,
 * just pick from this list).
 *
 * NOTE: This is still a SAMPLE set. Modules/actions are placeholders —
 * edit freely once the approval workflow per module is finalized.
 */

export const PERMISSION_DEFS = {
  fuel: {
    view: "View the fuel section",
    submit: "Submit a fuel request",
    approve: "Approve or reject a fuel request",
    view_all: "View all users' fuel requests, not just your own",
  },
  electricity: {
    view: "View the electricity section",
    submit: "Submit electricity consumption data",
    approve: "Approve or reject electricity data",
    view_all: "View all electricity records, not just your own",
  },
  water: {
    view: "View the water section",
    submit: "Submit water consumption data",
    approve: "Approve or reject water data",
    view_all: "View all water records, not just your own",
  },
  paper: {
    view: "View the paper section",
    submit: "Submit paper consumption data",
    approve: "Approve or reject paper data",
    view_all: "View all paper records, not just your own",
  },
  "air-travel": {
    view: "View the air travel section",
    submit: "Submit air travel data",
    approve: "Approve or reject air travel data",
    view_all: "View all air travel records, not just your own",
  },
  eswm: {
    view: "View the ESWM section",
    submit: "Submit ESWM data",
    approve: "Approve or reject ESWM data",
    view_all: "View all ESWM records, not just your own",
  },
  // GHG has no submit/approve of its own — read-only rollup over
  // fuel + electricity + air-travel data.
  ghg: {
    view: "View GHG compliance data",
    view_all: "View GHG data across all users/sections",
  },
  // See RBAC_design___locked_decisions.md for the special rules around
  // this pair (uniqueness, self-edit lock, last-user guard).
  admin: {
    manage_users: "Create, edit, deactivate, and reassign users",
    manage_roles: "Create, edit, and delete roles and their permissions",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Everything below this line is DERIVED from PERMISSION_DEFS above.
// You should never need to edit below here just to add a module/action —
// add it to PERMISSION_DEFS and the rest updates itself.
// ─────────────────────────────────────────────────────────────────────────

type PermissionDefs = typeof PERMISSION_DEFS;

/**
 * PermissionKey = a union of every "module:action" string implied by the
 * object above, e.g. "fuel:view" | "fuel:submit" | ... | "admin:manage_roles"
 *
 * How this reads: for each module M in PERMISSION_DEFS, and each action
 * name inside it, produce the template-literal string `${M}:${action}`.
 * TypeScript builds the full union for you — you never type these strings
 * out twice.
 */
export type PermissionKey = {
  [M in keyof PermissionDefs]: `${M & string}:${keyof PermissionDefs[M] & string}`;
}[keyof PermissionDefs];

/**
 * Flat list of every permission, shaped like a row in your `permission`
 * table (key / module / description). Built once at import time from
 * PERMISSION_DEFS — this is what you'd loop over to seed the DB.
 */
export const PERMISSIONS: {
  key: PermissionKey;
  module: keyof PermissionDefs;
  description: string;
}[] = Object.entries(PERMISSION_DEFS).flatMap(([module, actions]) =>
  Object.entries(actions).map(([action, description]) => ({
    key: `${module}:${action}` as PermissionKey,
    module: module as keyof PermissionDefs,
    description,
  })),
);
