---
type: module
status: active
next: unknown (ask the owner): finish POs (edit, delete, view allocations) or start withdrawal slips
updated: 2026-10-20
---
# Fuel

Assets, suppliers, purchase orders, and later the withdrawal slips. The only area with an approval step.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/admin/fuel/` (`assets/`, `purchase-orders/`), schema `asset.ts`, `asset-type.ts`, `supplier.ts`, `purchase-order.ts` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/fuel-assets.md`, `.claude/docs/features/fuel-purchase-orders.md`, `tmp/fuel-module-discovery-notes.md` (partly out of date) |
| Graph nodes | `po-actions.server.ts`, `po-math.ts`, `add-purchase-order-dialog.svelte`, `suppliers-dialog.svelte`, `add-edit-asset-dialog.svelte` |
| Related cards | `cards/signatories.md`, `cards/app-foundation.md` (DialogViews, Stepper) |

## Open (tracked in Linear)
- MPP-60 edit, delete and view a PO's allocations · MPP-61 close a PO by hand
- MPP-80 record a fuel issuance · MPP-81 mark a slip approved · MPP-82 fuel reports
- MPP-75 answers from GSU · MPP-76 overruns
- MPP-77 more asset states? · MPP-78 assets for electricity?

## Gotchas
- Liters and pesos are counted in whole hundredths (`po-math.ts`), so allocations add up exactly.
- Suppliers are active or **archived**; every other lookup table is active/inactive.
- "Allocation" is the word, never "share" or "allotment" (decided 13 October 2026).
