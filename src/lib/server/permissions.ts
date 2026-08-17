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
  "basic-user": {
    view: "View the fuel and paper section",
  },
  fuel: {
    view: "View the fuel section",
  },
  electricity: {
    view: "View the electricity section",
  },
  water: {
    view: "View the water section",
  },
  paper: {
    view: "View the paper section",
  },
  "air-travel": {
    view: "View the air travel section",
  },
  eswm: {
    view: "View the ESWM section",
  },
  ghg: {
    view: "View GHG compliance data",
  },
  admin: {
    manage_users: "Create, edit, deactivate, and reassign users",
    manage_roles: "Create, edit, and delete roles and their permissions",
    view: "View the admin page",
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
