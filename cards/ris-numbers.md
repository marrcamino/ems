---
type: module
status: active
next: committed on `feature/fuel-issuance` as 73cf348 (17 November 2026); the owner has tried the starting numbers, and still tries the reuse of the newest not-used number and Delete in the browser (MPP-135, MPP-136), then reviews the "Needs your check" items of 17 November 2026: a deleted or reused number may already be written on a paper RIS
updated: 2026-11-17
---
# RIS Numbers

The Requisition and Issue Slip numbers that GSU reserves in EMS before writing a paper RIS for a supply that is not fuel, listed beside the numbers that fuel withdrawals took, so the one sequence shows with no gaps.

## Home
| Source | Path |
|---|---|
| Code | `src/routes/(app)/ris-numbers/` (`+page.server.ts`, `+page.svelte`, `columns.ts`, `ris-row.ts`, `reservation-dialog.svelte`, `not-used-dialog.svelte`, `delete-reservation-dialog.svelte`), schema `ris-reservation.ts` and `form-counter.ts`, the counts in `src/lib/server/form-counter.ts`, number formatting in `src/lib/utils/form-numbers.ts` |
| Tests | none |
| Decisions / notes | point 6 of "Recording a fuel issuance" in `.claude/docs/features/fuel-purchase-orders.md` (the rules; 6.5 covers not used, reuse, and delete, and 6.6 the starting numbers), `.claude/skills/rbac-design/SKILL.md` (the keys and templates) |
| Graph nodes | `+page.server.ts` (ris-numbers), `reservation-dialog.svelte`, `form-counter.ts` |
| Related cards | `cards/fuel.md` (the withdrawals that take RIS numbers from the same count) |

## Open (tracked in Linear)
- MPP-135 reserve RIS numbers for supplies that are not fuel (built 17 November 2026, to be tried by the owner)
- MPP-136 the one-time go-live step for all four counts (built 17 November 2026, shared `src/lib/components/starting-numbers-note.svelte` and `startingNumbersActions` in `form-counter.ts`, to be tried by the owner)

## Gotchas
- Built 17 November 2026 on `feature/fuel-issuance`, committed as 73cf348 on top of the withdrawal work (a3448c9), because the RIS list and the withdrawal save share the count. The page is at `/ris-numbers`, sidebar "RIS Numbers" (icon file-digit), not under Fuel, because the numbers cover every supply. Keys `ris_numbers:view` and `ris_numbers:manage` are in the GSU template only; the Admin template never gets them (decided by the owner, 17 November 2026). The go-live step uses `fuel:set_starting_numbers`, held by GSU and the super-admin.
- The list shows every RIS number, newest first: reservations from `ris_reservation` and the fuel withdrawals' numbers read from `fuel_issuance`. A fuel row has no menu; its number belongs to the Fuel page. Numbers show without the year (`form-numbers.ts`), and the search matches the number only as shown. A reservation is always dated today (point 6.2), and "what it is for" is required. Marking a number not used asks the reason and can be undone from the toast or the menu. The Status column shows only the badge (Reserved, Not used, Fuel withdrawal), and a Remarks column beside it shows the not-used reason, or "Withdrawal cancelled" for a cancelled withdrawal, which keeps its number (point 9.8). When the newest number of the year is not used, the next RIS takes it again with its own month (`nextRisNumber` in `src/lib/server/form-counter.ts`, used by the withdrawal save too), and the reserve dialog offers it first, already chosen; the not-used row is then deleted (point 6.5). Delete (row menu, `delete-reservation-dialog.svelte`) works only on the newest RIS number of its year and takes the count back by one (point 6.5); the menu item is always there, and the dialog shows the reason with Delete unavailable when a newer number exists, or when the server finds one while the count is locked.
- Until the starting numbers are set, `form_counter` is empty, the note "Starting numbers not set" shows on this page and on Fuel, and reserving or saving a withdrawal is refused (point 6.6). On the owner's dev database the test withdrawals already filled `form_counter`, so the note only shows after that table is emptied, which also means emptying the test withdrawals' numbers. The number view's Copy button falls back to the older copy command (`src/lib/utils/clipboard.ts`), because EMS runs over plain http.

## Polish
- The status toasts say "RIS 11-013 marked not used" (five words); the validator prefers four.
