---
type: module
status: active
next: recording by month and type, from the office's workbook, built and committed on `feature/eswm` on 26 November 2026, not merged yet; waits for the office's answer in MPP-160
updated: 2026-11-26
---
# ESWM

The ESWM Focal Person records each month's kilos by type, for the coastal cleanups and for the office's own waste, for the whole PENRO, and submits each month; the EMS Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/eswm/` (`+page.server.ts`, `+page.svelte`, `waste-dialog.svelte`, `eswm-waste.ts`, `eswm-year.server.ts`, `eswm-types.ts`, `eswm-format.ts`), the year summary in `eswm/summary/`, schema `src/lib/server/db/schema/eswm.ts`; month helpers shared from `paper/paper-month.ts` |
| Tests | none; the browser checks of 26 November 2026 are in `tmp/eswm-plan/test/` (`try-eswm-waste.mjs` with its screenshots in `workbook/`, `clean-october.mjs`, and `enter-workbook.mjs`, which entered January to May) |
| Decisions / notes | `.claude/docs/features/eswm.md` (rules, the office's workbook, what is left out, research sources) |
| Graph nodes | `eswm-waste.ts` (`WASTE_TYPES`, `blockTotal`), `eswm-year.server.ts` (`yearWaste`), `eswm/+page.server.ts` (`load`) |
| Related cards | `cards/paper.md` (the page copies its layout), `cards/electricity.md` (changed the same way, from the same workbook), `cards/other-modules.md` |

## Open (tracked in Linear)
- MPP-88 ESWM: rebuilt from the office's workbook
- MPP-160 ask the ESWM Focal Person who types the office's own waste

## Gotchas
- One record for the PENRO: `eswm_monthly_report` has no office column, and `report_month` is unique.
- `eswm_waste` has one line per month, source, and type (`ew_month_source_type_unique`). A type that was not weighed has no line; 0 kg is a line. Saving a block deletes the lines of the types left empty.
- Which types belong to Coastal and to Office is `WASTE_TYPES` in `eswm-waste.ts`; the table's enum holds all five.
- The current month can be filled in, but Submit waits until it is over.
- A submitted month can still be corrected; the `received` status and the lock come with the EMS Focal Person's step.
- January to May 2026 in the database are the office's real figures, from the workbook; never remove them as test data.

## Polish
- The year list marks every month before the office started using EMS as Open, the same as on Paper.
