---
type: chore
status: paused
next: correct the four out-of-date passages in employee-and-user-separation.md
updated: 2026-10-19
---
# Housekeeping

Small clean-ups that belong to no single module.

## Home
| Source | Path |
|---|---|
| Full list as of 4 October | `tmp/archive/2026-10-19-before-icm/status/08-open-items.md`, sections F and G |

## Open
- `employee-and-user-separation.md` is out of date in four places: "Merged and pushed" (Topic 9 is merged), "The next piece of work" (Topic 10 is built), Topic 10 "Still to decide" (the action left `employee-actions-cell.svelte`), Topic 11 ("Nothing is committed").
- `.claude/docs/project-brief.md`, last line, and the comment atop `scripts/lib/super-admin.ts` name `RBAC-design-locked-decisions.md`, which is now `.claude/skills/rbac-design/SKILL.md`.
- Comments: `src/lib/server/db/schema/config.ts` says "Settings page" (it is Signatories); `src/lib/server/db/schema/employee.ts` says signatory records point at `employee` (they point at `employee_history`).
- `tmp/fuel-module-discovery-notes.md` still says the `asset` table does not exist and asset types have their own page.
- Git: an old stash from 20 August, and four `refs/original/...` backup refs left by `git filter-branch`.

## Gotchas
- None.
