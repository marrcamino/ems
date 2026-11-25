---
type: module
status: active
next: built on `feature/water` on 25 November 2026, not committed yet; waits for the office's answers in MPP-149 (water bill) and MPP-150 (meters)
updated: 2026-11-25
---
# Water

GSU records the office's monthly water use in cubic meters, for the whole PENRO, and submits each month; the EMS Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/water/` (`+page.server.ts`, `+page.svelte`, `water-use-dialog.svelte`, `water-types.ts`, `water-format.ts`, `water-month.ts`, `water-year.server.ts`), the year summary in `water/summary/`, schema `src/lib/server/db/schema/water.ts`; month helpers shared from `paper/paper-month.ts` |
| Tests | none; the browser check of 25 November 2026 is in `tmp/water-plan/test/` |
| Decisions / notes | `.claude/docs/features/water.md` (rules, what is left out, research sources) |
| Graph nodes | none yet (run `graphify update` after the merge) |
| Related cards | `cards/eswm.md` (the page copies its layout), `cards/other-modules.md` |

## Open (tracked in Linear)
- MPP-85 Water: built, waiting for the office's answers
- MPP-149 ask GSU whether the water figures are copied from the water bill
- MPP-150 ask GSU how many water meters or accounts the office has

## Gotchas
- The page shows only months that are over: it opens on last month, and the server refuses the current month. A month's water is known only once the meter is read, early in the next month.
- An entry has no date; it belongs to the month of its report and never moves.
- A month with no entry has no figure, which is not 0 m³: the card, the year list, and the Summary show "—" or nothing, and an entry of 0 m³ is a real figure (no water came).
- `created_at` is filled by MySQL in the server's local time, so the page reads its date with `date_format` in SQL rather than through Drizzle, which would add 8 hours.

## Polish
- The year list marks every month before the office started using EMS as Open, the same as on Paper and ESWM.
