---
type: module
status: done
next: none planned
updated: 2026-10-20
---
# Roles and permissions

Each user has one role; a role is a set of permission keys fixed in code.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/roles/`, `src/lib/server/permissions.ts` (`PERMISSION_DEFS`), `src/lib/server/role-templates.ts`, `src/lib/rbac/`, `scripts/sync-permissions.ts`, schema `role.ts`, `permission.ts`, `role-permission.ts` |
| Tests | none |
| Decisions / notes | `.claude/skills/rbac-design/SKILL.md` (locked rules) |
| Graph nodes | `PERMISSION_DEFS`, `expandPermissions`, `permission-picker.svelte`, `access.ts` |
| Related cards | `cards/employees-and-users.md`, `cards/app-foundation.md` |

## Open (tracked in Linear)
- None. Staff keys beyond `view` (fuel will need `submit` and `approve`) were set aside with the staff side (MPP-72, canceled).

## Gotchas
- After changing `PERMISSION_DEFS`, run `npm run sync-permissions`.
- The super-admin role is frozen except its description, and at least one active user must hold it.
