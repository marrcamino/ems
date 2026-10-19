---
type: module
status: active
next: unknown (ask the owner): finish POs (edit, delete, view allocations) or start withdrawal slips
updated: 2026-10-19
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

## Open
- POs: editing, deleting and viewing a PO's allocations are not built.
- Recording a withdrawal slip, marking it approved, and the fuel reports: not started.
- Questions still waiting for GSU, PO closing and overruns: fuel-purchase-orders.md, last three sections.
- Whether an asset needs more states, and whether assets also serve electricity: same document, "Also undecided".

## Gotchas
- Liters and pesos are counted in whole hundredths (`po-math.ts`), so allocations add up exactly.
- Suppliers are active or **archived**; every other lookup table is active/inactive.
- "Allocation" is the word, never "share" or "allotment" (decided 13 October 2026).
