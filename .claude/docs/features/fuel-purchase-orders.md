# Fuel purchase orders, suppliers and withdrawal slips

Suppliers, purchase orders (POs) and their allocations at
`/admin/fuel/purchase-orders`, and the decisions on how withdrawal slips will be
charged to a PO. Moved here on 19 October 2026 from the old status file
(`tmp/archive/2026-10-19-before-icm/status/06-fuel.md`), word for word. The
research behind it is in `tmp/fuel-module-discovery-notes.md`, which is partly
out of date.

The assets page has its own document: [fuel-assets.md](fuel-assets.md).

**Fuel is the only area with an approval step.** A staff member requests a fuel
withdrawal slip, and GSU approves it by signing the printed slip. Afterwards,
somebody marks the slip as approved in the system, so the system records an
approval that already happened on paper.

## Built and merged — purchase orders (branch `feature/fuel-purchase-orders`)

Committed on 15 October 2026, on top of `main` at `5959947`:

1. `1994563` feat: add supplier and purchase order tables and permissions
2. `f6bfb65` feat: manage fuel suppliers in a dialog
3. `bc77673` feat: add purchase orders with their fuel allocations
4. `0c6764b` refactor: drop the missing-abbreviation fallback in PO allocations

The shared pieces they use went to `main` first (see
`cards/app-foundation.md`). The branch was merged into
`main` with `--no-ff` on 19 October 2026 (`93a4cc8`). Pushing stays with you.


1. **Permission keys** `admin:view_purchase_orders` and
   `admin:manage_purchase_orders`, synced on 11 October 2026. The manage key
   also covers suppliers.
2. **Page** `/admin/fuel/purchase-orders`, in the Fuel navigation after the
   Dashboard. It has "Manage suppliers", "Add purchase order", and the list
   of POs.
3. **Suppliers** (11 October 2026), pushed to the database and tried in a
   browser. A dialog opened with `?suppliers` lists the
   suppliers as cards. Add and Edit slide a form in over the list, using the
   shared `DialogViews` component (`src/lib/components/dialog-views/`);
   Cancel or Escape returns to the list. The fields are:
   1. The supplier name, which is required and does not have to be unique.
   2. The business address, which is required.
   3. The TIN, which is required and unique. The field takes digits only
      and adds a space after every 3 as they are typed (123 456 789 000).
      It is stored as digits only, and 9, 12 or 14 digits are accepted.
   4. The PhilGEPS registration number, which is optional.

   A supplier is **active or archived** (`status` column). It was first built
   as active/inactive on 12 October 2026 and renamed the same day: a
   supplier is a reference record, and "archived" says "hidden from new use,
   kept for history" better. Only suppliers use "archived"; every other
   lookup table keeps active/inactive. Exactly two values, no third.
   `tmp/convert-supplier-status.ts` converts a database that already had the
   inactive version. A dropdown picks Active, Archived or All, kept in the
   address as `?supplier-status=`. The page loads only active suppliers,
   nothing about archived ones (not even a count); those are fetched from
   `GET /admin/fuel/purchase-orders/suppliers?status=archived` the first time
   Archived or All is picked, with a skeleton while they load (AnimatedList),
   and then kept for the rest of the visit. Each card's menu has "Archive supplier"
   or "Restore supplier", and Delete. The PO form must offer only active
   suppliers, except the one a PO being edited already names.

   Delete is refused once a PO names the supplier ("…N purchase orders name
   it. Archive it instead."), checked on the server.
4. **Adding a PO with its allocations** (12–15 October 2026), tried in a
   browser. Tables `purchase_order`, `purchase_order_item` (one row per
   fuel: liters, unit cost) and `purchase_order_allocation` (one allocation
   per unit per fuel row, in liters).

   **Wording, decided on 13 October 2026:** the fuel each division, section
   or unit gets from a PO is its **allocation**, and GSU **allocates** it.
   Earlier screens and notes said "share"; that word is no longer used on
   screen or in the code. "Allotment" is avoided too, because in government
   budgeting it is a specific DBM authority to spend.

   The "Add purchase order" dialog has two steps, with the shared `Stepper`
   (`src/lib/components/stepper/`) down its left side (across the top on a
   narrow screen). Since 14 October 2026 the steps are `DialogViews` views
   that slide, with the stepper in DialogViews' new `sidebar` snippet:
   1. PO details, as printed: PO number (unique), PO date, supplier (active
      only), and quantity and unit cost for gasoline and diesel. Amount is
      worked out and rolls to its new value (`@number-flow/svelte`); a fuel
      not on the PO is left blank, and its amount shows "—". Quantity and
      unit cost take at most 999.99 (3 whole digits, 2 decimals), checked
      while typing, on Next, and on the server. The PO date uses the shared
      `DateInput` (15 October 2026), starts at today, and cannot be later
      than today; the field, Next and the server all refuse a later date.
   2. Allocation: each fuel starts with one allocation holding all of its
      liters. "Add unit" adds an allocation that starts with whatever is
      still left, and picking a unit for an empty allocation fills in what
      is left. Each allocation can be typed in liters or as a budget in
      pesos; each field fills in the other at the PO's unit cost, and only
      the liters are saved. A unit can have only one allocation per fuel.
      Save is refused until each fuel's allocations add up exactly.

      Layout redesigned on 14 October 2026 from a Claude Design mockup
      (project "Fuel Allocation Redesign"): each fuel's header shows
      "35 L × ₱65.50/L = ₱2,292.50", a progress bar, and a status line
      with Add unit; each allocation is one row (unit, liters, pesos, ×,
      `allocation-row.svelte`), wrapping to two lines on a narrow screen.
      The status is plain while typing and turns red only when over the PO
      or after a refused Save; that message sits in the footer by Save, and
      the list scrolls to the first fuel with a problem. Added and removed
      allocations animate in and out (`AnimatedList`, 15 October 2026), and
      Add unit puts the cursor in the new row's unit picker. Escape on this
      step goes back to the details. An optional "Basis for the allocation"
      note records where they came from.

   Liters and pesos are counted in whole hundredths (`po-math.ts`), so the
   exact-sum check cannot be thrown off by decimal rounding. The page lists
   the POs in a plain table (number, date, supplier, gasoline, diesel,
   amount). A supplier named on a PO can no longer be deleted.
   Not built: editing or deleting a PO, and viewing a PO's allocations.

## Not started

1. **The staff page** `/fuel` is an empty page with a heading.
2. **The admin page** `/admin/fuel`, titled "Fuel Dashboard", is empty.
3. **Recording a fuel issuance.** There is nothing in the database for the
   withdrawal slip, the Driver Trip Ticket, the RIS or GSU's logbook. The
   discovery notes suggest a `fuel_issuance` table that may point at an asset;
   that was discussed and not decided.
4. **Marking a slip as approved,** and the permission key that controls it.
5. **The reports,** such as the DOE Monthly Fuel Consumption Report (litres of
   gasoline and diesel per month) and what GEMP asks for. Not designed.

## Questions that are still waiting for GSU

These come from section 8 of `tmp/fuel-module-discovery-notes.md`, and the numbers
are the ones that file uses.

1. ~~Where is bought fuel kept?~~ Answered on 6 October 2026: it stays at the
   gas station, under an approved purchase order. The supplier is paid after the
   fuel is consumed, and now charges in pesos at that day's pump price.
2. ~~What is the balance on the slip?~~ Answered with 1: what is left on the PO.
3. Is every withdrawal slip paired with a trip ticket? Partly answered on
   10 October: no, a genset or a grass cutter uses a slip alone. Still open: the
   slip number when nothing travels.
4. Is the RIS numbering shared with supplies that are not fuel?
5. Is there always one RIS per issuance, or are several issuances sometimes put
   on one RIS?
6. Do small items such as chainsaws use the same property numbering, or are they
   on an ICS with a different scheme?
7. Does GSU keep a generator logbook that records engine hours? (Question 14 in
   the file.)
8. In the logbook, are "DTT" and "TT" two different numbers? (Question 15.)
9. In the logbook, what is the difference between "Issued" and "Amount" — litres
   and pesos? (Question 16.) Answered on 6 October 2026: yes, litres and pesos.

## How POs and withdrawal slips work (decided 6–12 October 2026)

Details in section 8, question 1, of the discovery notes.

1. **The PO.** One PO covers both fuels, one row each (quantity, unit cost,
   amount), with an overall total. It has no litre-based or peso-based type: the
   system always counts down pesos, and shows litres left only as an estimate.
2. **Allocations.** Each division, section or unit pays from its own budget. When
   adding a PO, GSU types each unit's allocation of each fuel; it is required and
   must add up exactly to that fuel's row on the PO.
3. **The slip.** It records the litres the driver requested. When it comes back
   from the station, a GSU user types what the supplier wrote on it: the actual
   litres (with decimals) and the unit price, which are required, and the amount,
   which is optional. A blank amount is calculated as litres × unit price
   (15 October). Today's slip has no boxes for these, so the printed slip gets new
   boxes for the supplier; GSU and the supplier still have to agree to that.
4. **Which PO.** One slip is charged to one PO: the oldest PO where that unit
   still has an allocation of that fuel. Several POs can be open at once.
5. **Leftovers (12 October).** A unit must use up what is left on the old PO, even
   ₱10. So one fueling can take two or more slips: one for the leftover on the old
   PO, the next for the rest on the new PO. The supplier pumps the total of both.
6. **Overruns.** Proposed on 11 October, not yet confirmed: show an overrun
   whenever the actual amount is typed in and never refuse the slip; give GSU a
   hint at approval (what is left, minus slips still out); and a per-unit report
   for each PO.

7. **Closing (15 October).** A GSU user closes a PO by hand once the supplier is
   paid; the system never closes one by itself. The PO page lists Open / Closed /
   All. Close is refused while any slip is still out or any money is left,
   because the supplier is paid only after all the fuel is used. Proposed: a
   closed PO and its slips are locked, with a Reopen action.

Open: whether a withdrawal made with another unit's fuel shows who used it.

Questions 7 to 11 in the file, about rented and borrowed assets, and 12 to 13,
about wording, are parked, because the page holds only assets that the office
owns.

## Also undecided

1. **Whether an asset needs more states than active and inactive.** The notes
   suggest adding unserviceable and disposed, to match how government property is
   handled.
2. **Whether the asset list also serves electricity.** GEMP asks for an inventory
   of everything that uses energy, air conditioners and lighting included, which
   is why the table is called `asset_type` and not `fuel_asset_type`.
