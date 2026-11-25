---
type: module
status: active
next: built and checked in the browser on `feature/air-travel` with the Routes page (25 November 2026); waits for the owner's commit and merge, then `graphify update`, then the office's answers in MPP-156 and MPP-158
updated: 2026-11-25
---
# Air Travel

The Finance office records each flight that staff took on official business, for the whole PENRO, and submits each month; the GHG Focal Person reads it.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/air-travel/` (`+page.server.ts`, `+page.svelte`, `flight-dialog.svelte`, `air-travel-types.ts`, `air-travel-format.ts`, `air-travel-year.server.ts`, `air-travel-routes.server.ts`), the year summary in `air-travel/summary/`, the Routes page in `air-travel/routes/`, schema `src/lib/server/db/schema/air-travel.ts`; the traveller picker is Fuel's `search-picker.svelte`, and the name versions come from Fuel's `versionsOn` |
| Tests | none; the browser check of 25 November 2026 is in `tmp/air-travel-plan/test/` (`try-air-travel.mjs`) |
| Decisions / notes | `.claude/docs/features/air-travel.md` (rules, what is left out, research sources) |
| Graph nodes | none yet (run `graphify update` after the merge) |
| Related cards | `cards/eswm.md` (the page copies its layout), `cards/electricity.md` (the Summary copies its chart), `cards/other-modules.md` (GHG, which reads this data) |

## Open (tracked in Linear)
- MPP-87 Air Travel: built, not merged
- MPP-156 ask the GHG Focal Person whether a flight someone else paid for is counted
- MPP-158 ask Finance whether a seat is ever not economy

## Gotchas
- One entry is one person's flight from one place to the next, because each staff member has their own travel order; a trip through Cebu is two entries. The Round trip tick counts the flight back as a second flight (`legsOf` in `air-travel-format.ts`), so Flights and Kilometers flown both double for it.
- MPP-155 and MPP-157 were answered by the office's workbook `tmp/2026 EMS DATA.xlsx`, sheet "Air travel" (25 November 2026).
- Distances come from `air_travel_route` (the Routes page). A flight picks its places from the routes and copies the route's places and distance when saved, so correcting a route does not change past flights. A route in use keeps its places, and routes are made inactive, never deleted.
- `air_travel_flight.traveller_fk` points at a name version, so `countDocumentsUsingVersions` in `src/lib/server/employee-history.ts` counts flights too.
- A submitted month with no flights is 0; an open one is "—". Water and Electricity never show an empty month as 0.
