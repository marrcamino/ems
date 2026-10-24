---
type: module
status: done
next: fix MPP-120; then MPP-121, moving the pages out of /admin and renaming every key (decided 24 October 2026, not started)
updated: 2026-10-24
---
# Roles and permissions

Each user has one role; a role is a set of permission keys fixed in code.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/roles/`, `src/lib/server/permissions.ts` (`PERMISSION_DEFS`), `src/lib/server/role-templates.ts`, `src/lib/rbac/`, `scripts/sync-permissions.ts`, schema `role.ts`, `permission.ts`, `role-permission.ts` |
| Tests | none |
| Decisions / notes | `.claude/skills/rbac-design/SKILL.md` (locked rules, partly replaced by `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md`) |
| Graph nodes | `PERMISSION_DEFS`, `expandPermissions`, `permission-picker.svelte`, `access.ts` |
| Related cards | `cards/employees-and-users.md`, `cards/app-foundation.md` |

## Open (tracked in Linear)
- MPP-121 move the pages out of /admin and switch to the new permission keys
- MPP-123 decide whether the super-admin needs a "view as this role" tool
- MPP-120 switching a role off does not take access away from the people who hold it
- Fuel's later keys, `fuel:approve` and one for recording withdrawals, come with MPP-80 and MPP-81 (shape in the 24 October decision).

## Gotchas
- After changing `PERMISSION_DEFS`, run `npm run sync-permissions`.
- The super-admin role is frozen except its description, and at least one active user must hold it.
