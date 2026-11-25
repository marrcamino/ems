---
type: module
status: not-started
next: none planned; fuel comes first
updated: 2026-11-25
---
# GHG

The GHG emission report: the last tracked area without a page. Its permission keys exist; nothing else does. ESWM, water, electricity, and air travel have their own cards since 25 November 2026 (`cards/eswm.md`, `cards/water.md`, `cards/electricity.md`, `cards/air-travel.md`).

Nobody enters GHG data. The GHG Focal Person builds the GHG emission report from fuel, electricity, and air travel, and that data goes on to the EMS Focal Person (owner, 25 November 2026; process in `.claude/docs/project-brief.md`, "The process at a glance").

## Home
| Source | Path |
|---|---|
| Code | none |
| Tests | none |
| Decisions / notes | `.claude/docs/project-brief.md` ("The process at a glance": who enters each area and who receives it) |
| Graph nodes | none yet |
| Related cards | `cards/fuel.md`, `cards/electricity.md`, `cards/air-travel.md` (the three sources), `cards/signatories.md`, `cards/paper.md`, `cards/eswm.md`, `cards/water.md` |

## Open (tracked in Linear)
- MPP-89 GHG

## Gotchas
- The paper form of the GHG report has not been examined yet; only the fuel documents have.
- Electricity is recorded in kWh only, one figure per building a month. The GHG Focal Person's workbook already turns it into CO2: kWh × 0.8522 tCO2/MWh (Scope 2), plus a system loss of 5.12%, worked out as MWh × 0.0512 ÷ (1 − 0.0512) × 0.8522 and counted with air travel as Scope 3 (`tmp/2026 EMS DATA.xlsx`, sheets "Electricity" and "Air travel" rows 38–45 and 58–65; details in `.claude/docs/features/electricity.md`, "The office's workbook").
- Air travel is one line per person and flight, with its places and distance in km (one way) copied from the Routes page (`air_travel_route`, each with its source), and a round trip tick that doubles it.
- The GHG Focal Person's own method is in `tmp/2026 EMS DATA.xlsx`, sheet "Air travel" (shared by the owner, 25 November 2026): each flight is a short haul (under 300 miles), medium haul (300 to 700), or long haul (700 or more), and its passenger-miles are multiplied by factors for CO2 (0.277, 0.229, 0.185 kg per passenger-mile), CH4, and N2O (with GWPs of 28 and 265). The sheet also holds the yearly totals from 2020 and the number of staff each year, for emissions per employee. Its Electricity sheet was read on 25 November 2026 (see the line above).
