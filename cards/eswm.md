---
type: module
status: active
next: committed on `feature/eswm` on 25 November 2026 with the year summary (`/eswm/summary`), tried in the browser, test data removed; not merged into `main` yet
updated: 2026-11-25
---
# ESWM

The ESWM Focal Person records the garbage collected at each cleanup drive, for the whole PENRO, and submits each month; the EMS Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/eswm/` (`+page.server.ts`, `+page.svelte`, `cleanup-drive-dialog.svelte`, `eswm-types.ts`, `eswm-format.ts`), the year summary in `eswm/summary/`, schema `src/lib/server/db/schema/eswm.ts`; month helpers shared from `paper/paper-month.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/eswm.md` (rules, what is left out, research sources) |
| Graph nodes | none yet |
| Related cards | `cards/paper.md` (the page copies its layout), `cards/other-modules.md` |

## Open (tracked in Linear)
- MPP-88 ESWM

## Gotchas
- One record for the PENRO: `eswm_monthly_report` has no office column, and `report_month` is unique.
- A submitted month can still be corrected; the `received` status and the lock come with the EMS Focal Person's step.
- The office's own waste by type is parked until the office confirms it weighs it (feature doc, "Left out").

## Polish
- The year list marks every month before the office started using EMS as Open, the same as on Paper.
