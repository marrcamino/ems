---
type: module
status: not-started
next: none planned; fuel comes first
updated: 2026-11-25
---
# Air travel, GHG

The other tracked areas. Each has its permission keys; nothing else exists yet. ESWM and water have their own cards since 25 November 2026 (`cards/eswm.md`, `cards/water.md`), and electricity since the same day (`cards/electricity.md`).

Unlike fuel and paper, these areas have no GSU step: their data is entered and submitted, and goes straight to the focal person, with nobody receiving it or marking it complete in between (owner, 25 November 2026; process in `.claude/docs/project-brief.md`, "The process at a glance").
- Air travel: the Finance office enters it; it goes to the GHG Focal Person.
- GHG: not entered by anyone; the GHG Focal Person builds the GHG emission report from fuel, electricity, and air travel, and that data goes on to the EMS Focal Person.

## Home
| Source | Path |
|---|---|
| Code | empty staff page `src/routes/(app)/air-travel/` |
| Tests | none |
| Decisions / notes | `.claude/docs/project-brief.md` ("The process at a glance": who enters each area and who receives it) |
| Graph nodes | none yet |
| Related cards | `cards/fuel.md`, `cards/signatories.md`, `cards/paper.md` (own card since 23 November 2026), `cards/eswm.md`, `cards/water.md`, and `cards/electricity.md` (own cards since 25 November 2026) |

## Open (tracked in Linear)
- MPP-87 air travel · MPP-89 GHG
- MPP-87 also asked to confirm air travel is in scope. The owner's flowchart of 25 November 2026 confirms it.

## Gotchas
- Their paper forms have not been examined yet; only the fuel documents have.
- GHG: the electricity data is in kWh only. Dinagat runs on its own diesel plants, so the DOE's grid emission factors do not fit it, and no official factor for it was found (`.claude/docs/features/electricity.md`). The GHG Focal Person has to choose the factor.
