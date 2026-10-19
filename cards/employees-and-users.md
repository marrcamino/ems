---
type: module
status: active
next: build "Mark as employed" (Topic 13)
updated: 2026-10-19
---
# Employees and users

`employee` holds every person in the office; `user` holds only the login, and every login points at one employee.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/employees/`, `src/routes/admin/users/`, `src/lib/server/super-admin.ts`, `scripts/lib/super-admin.ts`, schema `employee.ts`, `employee-history.ts`, `employee-history-correction.ts`, `user.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/employee-and-user-separation.md` (Topics 1–13) |
| Graph nodes | `employee-actions-cell.svelte`, `name-position-history-sheet.svelte`, `listSuperAdminsWhoCanSignIn`, `duplicate-check.ts` |
| Related cards | `cards/roles-and-permissions.md`, `cards/signatories.md` |

## Open
- Topic 13 "Mark as employed": designed, not built. The edit dialog's Currently employed switch must change with it.
- The reset script's message when the only super admin has left: waits for Topic 13.
- Topic 10: the message when saving a change fails (today "Something went wrong.").
- Not built: a screen for the correction log; the "Give this person a login" idea (never discussed).
- Nobody has an abbreviated position title yet; the first printed document will force it.

## Gotchas
- Two different statuses: `employee.employment_status` (works here?) vs `user.account_status` (may sign in?).
- Name changes start a new history entry; corrections overwrite it and are logged (Topics 9–10).
- Delete is refused while a login points at the person; the lockout guard is `refuseIfSeparationLocksOut`.
