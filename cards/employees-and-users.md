---
type: module
status: active
next: build "Mark as employed" (Topic 13)
updated: 2026-10-20
---
# Employees and users

`employee` holds every person in the office; `user` holds only the login, and every login points at one employee.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/(admin)/employees/`, `src/routes/(app)/(admin)/users/`, `src/lib/server/super-admin.ts`, `scripts/lib/super-admin.ts`, schema `employee.ts`, `employee-history.ts`, `employee-history-correction.ts`, `user.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/employee-and-user-separation.md` (Topics 1–13) |
| Graph nodes | `employee-actions-cell.svelte`, `name-position-history-sheet.svelte`, `listSuperAdminsWhoCanSignIn`, `duplicate-check.ts` |
| Related cards | `cards/roles-and-permissions.md`, `cards/signatories.md` |

## Open (tracked in Linear)
- MPP-67 "Mark as employed" (Topic 13) · MPP-70 reset script message, waits for MPP-67
- MPP-71 message when saving a change fails · MPP-63 try the history panel
- MPP-90 correction log screen · MPP-79 "Give this person a login" idea
- MPP-91 type an abbreviated position title for each person

## Gotchas
- Two different statuses: `employee.employment_status` (works here?) vs `user.account_status` (may sign in?).
- Name changes start a new history entry; corrections overwrite it and are logged (Topics 9–10).
- Delete is refused while a login points at the person; the lockout guard is `refuseIfSeparationLocksOut`.
