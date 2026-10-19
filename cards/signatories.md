---
type: module
status: blocked
next: wait for the fuel document screens; a signature block only exists on a document
updated: 2026-10-19
---
# Signatories

Who signs each printed document. No signatory table: a document points at one `employee_history` row per signature block.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/signatories/`, schema `config.ts`, `src/lib/server/org-unit-guard.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/signatory.md` (start at "Where this stands") |
| Graph nodes | `tab-content-fuel.svelte`, `settingUsingOrgUnit`, `config` |
| Related cards | `cards/fuel.md`, `cards/employees-and-users.md`, `cards/org-structure.md` |

## Open
- The document screens themselves; until they exist, none of the signature-block rules are in code.
- Where a default name comes from: two of the three answers are still open (signatory.md).
- A document that prints the abbreviated position title must refuse to print when it is empty.
- Check that the standing OIC's position title reads correctly on the RIS.
- Tabs for the other five areas arrive as each area is built.

## Gotchas
- The people offered are those valid on the document's filed date, not today.
- A stored approver who has since left reads as empty.
- The General Services Unit set here cannot be deleted or deactivated on the org structure page.
