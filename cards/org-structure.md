---
type: module
status: done
next: none planned
updated: 2026-10-21
---
# Organizational structure

Offices, divisions, sections and units, shown as a chart or a table at `/org-structure`.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/(admin)/org-structure/`, schema `org-unit.ts`, `src/lib/server/org-unit-guard.ts` |
| Tests | none |
| Decisions / notes | none of its own; the GSU guard is in `.claude/docs/features/signatory.md` |
| Graph nodes | `org-chart.svelte`, `chart-layout.ts`, `move-rules.ts`, `settingUsingOrgUnit` |
| Related cards | `cards/signatories.md`, `cards/employees-and-users.md` |

## Open (tracked in Linear)
- MPP-107 serial comma in two on-screen lists (search box, inactive switch)

## Gotchas
- A unit with units or employees under it cannot be deleted; the message suggests making it inactive.
- Permission refusals in the actions must be `return fail(…)`, never `throw fail(…)` (fixed in `6e24906`).
