---
type: module
status: active
next: design the issuance page (MPP-80): one page for withdrawals and trip-only trips, named "issuance" (point 4 of "Recording a fuel issuance" in fuel-purchase-orders.md); design the screens and what a withdrawal and a trip store before building; MPP-80 is blocked by the "Ask GSU" issues in the Open list, all but MPP-117; still open: MPP-104 problem 3, tiny leftovers; the PO form must take whole liters only, with no pesos typing (MPP-118)
updated: 2026-10-24
---
# Fuel

Assets, suppliers, purchase orders, and later the withdrawal slips. The only area with an approval step.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/fuel/` (`assets/`, `purchase-orders/`), schema `asset.ts`, `asset-type.ts`, `supplier.ts`, `purchase-order.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md` (where fuel's pages and keys are going), `.claude/docs/features/fuel-assets.md`, `.claude/docs/features/fuel-purchase-orders.md` (start at "How the office handles fuel today"), `tmp/fuel-po-tests/findings.md` (rounding tests, 20 October 2026) |
| Graph nodes | `po-actions.server.ts`, `po-math.ts`, `add-purchase-order-dialog.svelte`, `suppliers-dialog.svelte`, `add-edit-asset-dialog.svelte` |
| Related cards | `cards/signatories.md`, `cards/app-foundation.md` (DialogViews, Stepper) |

## Open (tracked in Linear)
- MPP-121 move fuel from `/admin/fuel` to `/fuel`, shared by GSU and the other offices; each office sees only its own allocation unless its role holds `fuel:view_all_offices`
- MPP-60 checks on editing and deleting a PO (after MPP-80) · MPP-61 close a PO by hand
- MPP-80 record a fuel issuance · MPP-81 mark a slip approved · MPP-82 fuel report for the DENR regional office
- MPP-118 whole liters only on the PO form · MPP-76 overruns · MPP-104 rounding and tiny leftovers · MPP-106 editing forms after a PO is closed
- Ask GSU: MPP-108 how the DTT number runs · MPP-109 one RIS per withdrawal? · MPP-117 reimbursed trips: slip or RIS?
- MPP-77 more asset states? · MPP-78 assets for electricity?

## Gotchas
- The PO page (layout 2a of the Claude Design "Purchase Orders Page") shows real POs, but slips not back and the Closed list are made up in `sample-purchase-orders.ts`, and "used" is ₱0, until slips and closing exist. Editing and deleting a PO have no checks yet (TODOs in `updatePurchaseOrder` and `deletePurchaseOrder`).
- Liters and pesos are counted in whole hundredths (`po-math.ts`), so allocations add up exactly in liters. Their pesos are rounded one by one and can be a centavo off, until MPP-118 limits the PO form to whole liters (decided 22 October 2026).
- Suppliers are active or **archived**; every other lookup table is active/inactive.
- "Allocation" is the word, never "share" or "allotment" (decided 13 October 2026).
