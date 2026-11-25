---
type: module
status: active
next: office side built 23 November 2026 and paper POs on 24 November 2026, uncommitted on `feature/paper`; the office's paper form (seen 24 November 2026) is being followed topic by topic (list in the feature doc's "The office's paper form"): topics 1 (one date distributed per PO) and 2 (the month's four rows and the starting balance) are built and tried in the browser (SQL applied); topic 3 (each entry a line of the form, with Received by) is built and tried on 24 November 2026 (SQL applied); topic 4 (no balance below zero) is built on 24 November 2026; topic 5 (sizes on the form) set aside, since the form is the office's own; topic 6: Submit asks for Prepared by and Noted by, and a Print button (not yet working) shows after submit, built and tried 24 November 2026 (SQL applied); the print layout itself waits. ICT's November 2026 is submitted as test data. Suppliers moved to their own page and came back on paper POs on 24 November 2026, SQL applied and tried in the browser; PO 34523 needs its supplier picked on its next edit. The owner also ticks the paper keys on the GSU and Staff roles and asks GSU MPP-143 GSU holding paper for an office (24 November 2026): allocated versus handed over is built as a rapid build and tried in the browser (SQL applied; test PO TEST-HO-01 added and deleted); MPP-145 asks GSU when an office counts paper as New; the Stock room step (what GSU keeps, and the Stock/Property No.) replaced the hand-over switch the same day, SQL applied and tried in the browser with test PO TEST-ST-01, since deleted; next topics are giving held paper to another office, a GSU view of held paper, and the PPMP (list in the feature doc's "How GSU gets the paper"). A month can be submitted only once it is over (25 November 2026, built and tried).
updated: 2026-11-25
---
# Paper

Each office records the reams of bond paper it opens, and submits each month to GSU. GSU records each paper PO that COA forwards, and the reams of each size it gave each office, on the Paper Purchase Orders page. The report to the EMS focal person is not built.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/paper/` (`+page.server.ts`, `+page.svelte`, `entry-dialog.svelte`, `paper-month.ts`, `paper-types.ts`), the paper POs in `paper/purchase-orders/` (`paper-po-actions.server.ts`, `paper-po-dialog.svelte` with `po-details-step.svelte` and `distribution-step.svelte`, `paper-po-form.svelte.ts`, `paper-po-card.svelte`), sizes in `src/lib/paper-sizes.ts`, schema `paper.ts`. The retired stock page is in `tmp/archive/paper-stock-2026-11-23/` |
| Tests | none |
| Decisions / notes | `.claude/docs/features/paper-consumption.md` (the office's process, the flowchart, and what EMS does) |
| Graph nodes | none yet |
| Related cards | `cards/other-modules.md`, `cards/fuel.md` (the fuel POs, whose keys and supplier list the paper POs share), `cards/ris-numbers.md` (a distribution may need an RIS, MPP-143) |

## Open (tracked in Linear)
- MPP-86 paper: built, waiting for GSU's answers
- MPP-143 ask GSU whether each distribution is on its own RIS
- MPP-145 ask GSU when an office counts paper as New (on hand-over or on allocation)
- MPP-146 ask GSU when the Stock/Property No. is written on a paper PO

## Gotchas
- `feature/paper` starts from the committed fuel work (baeb3ff), not from `main`, because the database is shared: a schema push from a branch without the fuel tables would drop them. Merge fuel into `main` before paper.
- Keys: `paper:view`, `paper:manage` (own office only), and `paper:view_all_offices` (read-only, an office picker). The templates give GSU all three and Staff the first two; roles made before 23 November 2026 need them ticked on the Roles page. The paper POs use `purchase_orders:view` and `purchase_orders:manage`, as the fuel POs do.
- Paper POs name a supplier from the shared list on `/suppliers` (since 24 November 2026; PO 34523, typed before that, has none until edited), so a supplier named on either kind of PO cannot be deleted. Their numbers are unique among paper POs only. A PO's distributions must add up to the PO exactly, size by size, and GSU's hand-overs (`paper_handover`, each with its date) are what counts in an office's "New"; what is allocated but not handed over is held by GSU; an edit replaces its sizes and distributions as a whole, as on fuel.
- A report row is made with a month's first entry, or by Submit for an empty month (submitted as no paper used). Submitted months cannot change, and nothing reopens them yet. Test data on the dev database: January 2026 of the ICT office is submitted, with no entries, and paper PO TEST-PAPER-01 (50 A4 and 20 Long, given to ICT and GSU).

## Polish
- "Add opened ream" hides on a submitted month; it could stay and add to today's month.
- The year list marks every month before the office started using EMS as Open.
- Print layout for the monthly summary, once the office's form is seen.
