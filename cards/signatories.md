---
type: module
status: blocked
next: wait for the fuel document screens; a signature block only exists on a document
updated: 2026-10-20
---
# Signatories

Who signs each printed document. No signatory table: a document points at one `employee_history` row per signature block.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/(admin)/signatories/`, schema `config.ts`, `src/lib/server/org-unit-guard.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/signatory.md` (start at "Where this stands") |
| Graph nodes | `tab-content-fuel.svelte`, `settingUsingOrgUnit`, `config` |
| Related cards | `cards/fuel.md`, `cards/employees-and-users.md`, `cards/org-structure.md` |

## Open (tracked in Linear)
- MPP-80 the fuel document screens; until they exist, no signature-block rule is in code
- MPP-74 where a default name comes from
- MPP-102 refuse to print with an empty abbreviated title · MPP-103 check the OIC's title on the RIS
- Tabs for the other five areas arrive with each area (MPP-84 to MPP-89).

## Gotchas
- The people offered are those valid on the document's filed date, not today.
- A stored approver who has since left reads as empty.
- The General Services Unit set here cannot be deleted or deactivated on the org structure page.
