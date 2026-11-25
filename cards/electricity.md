---
type: module
status: active
next: built and checked in the browser on `feature/electricity` (25 November 2026); waits for the owner's commit and merge, then `graphify update`, then the office's answers in MPP-151 to MPP-154
updated: 2026-11-25
---
# Electricity

GSU records the office's monthly electricity use in kWh, for the whole PENRO, and submits each month; the GHG Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/electricity/` (`+page.server.ts`, `+page.svelte`, `electricity-use-dialog.svelte`, `electricity-types.ts`, `electricity-format.ts`, `electricity-month.ts`, `electricity-year.server.ts`), the year summary in `electricity/summary/`, schema `src/lib/server/db/schema/electricity.ts`; month helpers shared from `paper/paper-month.ts` |
| Tests | none; the browser check of 25 November 2026 is in `tmp/electricity-plan/test/` |
| Decisions / notes | `.claude/docs/features/electricity.md` (rules, what is left out, research sources) |
| Graph nodes | none yet (run `graphify update` after the merge) |
| Related cards | `cards/water.md` (the page copies it), `cards/other-modules.md` (GHG, which reads this data) |

## Open (tracked in Linear)
- MPP-84 Electricity: built, not merged
- MPP-151 ask GSU whether the figures are copied from the DIELCO bill
- MPP-152 ask GSU how many electric meters or DIELCO accounts the office has
- MPP-153 ask the GHG Focal Person whether the office sends GEMP's monthly electricity report
- MPP-154 ask GSU under which month a bill goes
- MPP-78 (Fuel): the research points to no; waiting for the owner to close it

## Gotchas
- The page shows only months that are over: it opens on last month, and the server refuses the current month.
- An entry has no date; it belongs to the month of its report and never moves.
- A month with no entry has no figure, which is not 0 kWh: the card, the year list, and the Summary show "—" or nothing.
- No CO2 on these pages: Dinagat is off the grid on diesel, so the DOE grid factors do not fit, and the factor is the GHG Focal Person's choice (MPP-89).
- `created_at` is filled by MySQL in the server's local time, so the page reads its date with `date_format` in SQL, as Water does.
- The constraint names start with `elmr_` and `elc_`, because `emr_` belongs to ESWM.
