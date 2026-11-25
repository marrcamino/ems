---
type: module
status: active
next: recording by building, from the office's workbook, built and checked in the browser on `feature/electricity` on 25 November 2026 (table added with `tmp/electricity-plan/electricity-buildings.sql`); waits for the commit and the merge
updated: 2026-11-25
---
# Electricity

A role of its own (not GSU, for now) records each building's monthly electricity use in kWh, for the whole PENRO, and submits each month; the GHG Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/electricity/` (`+page.server.ts`, `+page.svelte`, `electricity-use-dialog.svelte`, `electricity-types.ts`, `electricity-format.ts`, `electricity-month.ts`, `electricity-year.server.ts`, `electricity-buildings.server.ts`), the year summary in `electricity/summary/`, the building list in `electricity/buildings/`, schema `src/lib/server/db/schema/electricity.ts`; month helpers shared from `paper/paper-month.ts` |
| Tests | none; the browser checks of 25 November 2026 are in `tmp/electricity-plan/test/` (`try-electricity.mjs`, and `try-buildings.mjs` with its screenshots in `buildings/`) |
| Decisions / notes | `.claude/docs/features/electricity.md` (rules, the office's workbook and its CO2 method, what is left out, research sources) |
| Graph nodes | `graphify-out/graph.json` has every file above (updated after the merge) |
| Related cards | `cards/water.md` (the page copies it), `cards/other-modules.md` (GHG, which reads this data) |

## Open (tracked in Linear)
- MPP-84 Electricity: built and merged, waiting for the office's answers
- MPP-151 ask whoever records electricity whether the figures are copied from the DIELCO bill
- MPP-153 ask the GHG Focal Person whether the office sends GEMP's monthly electricity report
- MPP-154 ask whoever records electricity under which month a bill goes
- MPP-159 ask the GHG Focal Person whether "Watch Tower" and "Look Out Tower" are the same building
- MPP-78 (Fuel): the research points to no; waiting for the owner to close it

## Gotchas
- The page shows only months that are over: it opens on last month, and the server refuses the current month.
- An entry has no date; it belongs to the month of its report and never moves.
- A month with no entry has no figure, which is not 0 kWh: the card, the year list, and the Summary show "—" or nothing.
- One entry per building a month (`elc_month_building_unique`); the dialog greys out the buildings already entered.
- A building's colour on the Summary comes from the order it was added (`electricity-format.ts`), so it never changes.
- No CO2 on these pages. The GHG Focal Person's method (0.8522 tCO2/MWh, plus a 5.12% system loss as Scope 3) is in the feature doc, for the GHG report (MPP-89).
- `created_at` is filled by MySQL in the server's local time, so the page reads its date with `date_format` in SQL, as Water does.
- The constraint names start with `elmr_` and `elc_`, because `emr_` belongs to ESWM.
