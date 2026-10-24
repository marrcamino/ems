---
type: module
status: done
next: none planned; the office rule for rows (MPP-125) comes with the first page that needs it
updated: 2026-10-24
---
# Roles and permissions

Each user has one role; a role is a set of permission keys fixed in code.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/(admin)/roles/`, `src/lib/server/permissions.ts` (`PERMISSION_DEFS`), `src/lib/server/role-templates.ts`, `src/lib/rbac/`, `scripts/sync-permissions.ts`, schema `role.ts`, `permission.ts`, `role-permission.ts` |
| Tests | none |
| Decisions / notes | `.claude/skills/rbac-design/SKILL.md` (locked rules, rewritten 24 October 2026), `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md` (why) |
| Graph nodes | `PERMISSION_DEFS`, `expandPermissions`, `permission-picker.svelte`, `access.ts` |
| Related cards | `cards/employees-and-users.md`, `cards/app-foundation.md` |

## Open (tracked in Linear)
- MPP-125 show each person only their own office's records
- MPP-123 decide whether the super-admin needs a "view as this role" tool
- Fuel's later keys, `fuel:approve` and one for recording withdrawals, come with MPP-80 and MPP-81 (shape in the 24 October decision).

## Gotchas
- After changing `PERMISSION_DEFS`, run `npm run sync-permissions`. Renaming a key needs a one-off step first, or every role loses it (see "Permission sync" in the skill).
- The super-admin role is frozen except its description, and at least one active user must hold it.
- A role is switched off only once no user holds it; a user left on an inactive role holds no keys (`validateSessionToken`, MPP-120).
