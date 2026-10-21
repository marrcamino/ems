# Fuel purchase orders, suppliers and withdrawal slips

Suppliers, purchase orders (POs) and their allocations at
`/admin/fuel/purchase-orders`, how the office handles fuel today, the paperwork,
and the decisions on how withdrawal slips will be charged to a PO.

This is the one home for these facts. On 20 October 2026 everything still true in
the old discovery notes was moved in here or into
[fuel-assets.md](fuel-assets.md), which covers the assets page and asset types;
the notes themselves are retired to
`tmp/archive/2026-10-20-fuel-discovery-notes.md`. The sample PO's price clause and
the procurement rules behind it are in `tmp/fuel-po-reference.md`.

**Fuel is the only area with an approval step.** A staff member requests a fuel
withdrawal slip, and GSU approves it by signing the printed slip. Afterwards,
somebody marks the slip as approved in the system, so the system records an
approval that already happened on paper.

## How the office handles fuel today

These are facts about how the office works, told by the user or by GSU. They are
not system decisions; those are in "How POs and withdrawal slips work" below. A
scenario or example about fuel must stay inside these facts. When it needs a fact
that is not written here, ask the owner instead of assuming one.

1. **No fuel is kept at the office.** The office is not allowed to keep a stock
   of fuel, so bought fuel stays at the gas station, under an approved purchase
   order (told by GSU, 6 October 2026).
2. **Each unit has its own budget.** Every division, section and unit pays for
   its own fuel from its own budget, and GSU is one of these units, with its own
   budget too (11 and 20 October 2026). GSU's budget does not pay for the whole
   PO. The units are the ones on the Organizational Structure page.
3. **Each unit asks GSU for the fuel it needs,** such as CSD 30 L and OPENRO
   25 L. The request is probably verbal; no separate document per unit has been
   seen (7 October 2026). Whether each unit makes a purchase request is still to
   be asked (MPP-75).
4. **GSU adds up all the requests into one PO for the whole office.** GSU does
   not decide how the fuel is split; making the PO is simply its job as General
   Services (20 October 2026). The sample PO's purpose reads "Requested fuel to be
   used for CDS, GSU, and PENR Office".
5. **Each unit's allocation is the amount it requested.** Once the PO is
   accepted, GSU tells each unit what it has, and each unit then controls its own
   withdrawals.
6. **A withdrawal counts down one unit's allocation, for one fuel.** A unit may
   use another unit's fuel with that unit's agreement: when Planning uses CDS's
   fuel, the withdrawal is recorded under CDS and counts down CDS's allocation
   (7 October 2026). Whether the record must also show that Planning used it is
   still to be asked (MPP-75).
7. **A new PO is supposed to wait until the whole PO is used up,** because the
   PO's terms say so. In practice this is not always followed: a new PO can be
   made earlier, so a unit can have fuel on two POs at once. There is no fixed
   limit on how many POs are open together (7 and 10 October 2026).
8. **A withdrawal, step by step** (told by the user, 6–7 October 2026):
   1. The driver fills in the withdrawal slip with the litres they want.
   2. GSU approves the litres asked for, by signing the slip.
   3. At the station, the driver gets the fuel, and the supplier writes on the
      slip what was actually pumped.
   4. The slip has two copies: the supplier's copy stays at the station, and the
      office copy goes back to GSU.
   5. GSU copies the litres and the pesos into its logbook, as "Issued" and
      "Amount". In the system, a GSU user will type them in; the supplier never
      uses the system.
9. **The actual litres can be less than asked, and are not whole numbers.** A
   driver asks for 5 L, the tank is full at 3.7 L, and fueling stops (10 October
   2026). If the PO's money runs out first, the driver simply gets less.
10. **A slip is used at one station,** and the next PO may be with a different
    supplier, so one slip cannot take fuel from two POs (GSU's rule, 10 October
    2026).
11. **The old PO is used up first, per unit and per fuel.** When CDS has nothing
    left on the old PO, CDS may withdraw from the new one, even while other units
    still have fuel on the old one. A unit must use up what it has left, even if
    it is only ₱10, so one fueling can take two slips, and the supplier pumps the
    total of both in one go (10 and 12 October 2026).
12. **The supplier is paid after the fuel is consumed** (told by GSU, 7 October
    2026). An approved PO sets the money aside; it is not a payment. The paperwork
    for paying is probably a disbursement voucher with the supplier's bill rather
    than a "liquidation"; not confirmed.
13. **The supplier charges the day's pump price** (since 6 October 2026), so a PO
    is counted in pesos, and its litres left can only be estimated. GSU calls this
    a price-based PO. It is new: no such PO has been used up yet, so GSU has no
    experience of a unit going past its allocation, or of a unit leaving part of
    it unused.
14. **A real example,** PO 2026-03-22, given by the user, in litres:

    | unit | gasoline | diesel |
    | --- | --- | --- |
    | GSU | 22 | 0 |
    | OPENRO | 13 | 64 |
    | CDS | 0 | 206 |
    | **total** | **35** | **270** |

    305 litres in all.

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
   exact-sum check cannot be thrown off by decimal rounding. That check is on
   liters; the pesos of the allocations are rounded one by one and can come to a
   centavo more or less than the PO's amount (see "Rounding and tiny leftovers",
   problem 2). The page lists
   the POs in a plain table (number, date, supplier, gasoline, diesel,
   amount). A supplier named on a PO can no longer be deleted.
   Not built: editing or deleting a PO, and viewing a PO's allocations.

## Not started

1. **The staff page** `/fuel` is an empty page with a heading.
2. **The admin page** `/admin/fuel`, titled "Fuel Dashboard", is empty.
3. **Recording a fuel issuance.** There is nothing in the database for the
   withdrawal slip, the Driver Trip Ticket, the RIS or GSU's logbook. The
   direction discussed so far is in "Recording a fuel issuance" below; it is not
   decided.
4. **Marking a slip as approved,** and the permission key that controls it.
5. **The reports,** such as the DOE Monthly Fuel Consumption Report (litres of
   gasoline and diesel per month) and what GEMP asks for. Not designed.

## Questions that are still waiting for GSU

They are listed in Linear, in MPP-75, which carries the Ask label. Answers that
have come back are written into "How the office handles fuel today" above.

## How POs and withdrawal slips work (decided 6–20 October 2026)

1. **The PO.** One PO covers both fuels, one row each (quantity, unit cost,
   amount), with an overall total. It has no litre-based or price-based type: the
   system always counts down pesos, and shows litres left only as an estimate.
   "Price-based" is GSU's own term (told by the user, 20 October 2026) for a PO
   that is paid at the prevailing pump price on the day of each withdrawal, and
   so is counted down in pesos. The user knows that the term is not ideal and may
   change it later.
2. **Allocations.** When adding a PO, GSU types each unit's request as its
   allocation of each fuel (see points 2 to 5 of "How the office handles fuel
   today"). Allocations are required and must add up exactly to that fuel's row on
   the PO. A PO may have only one fuel, and the whole of a fuel may go to one unit
   (7 October 2026). An optional note records where the allocations came from,
   such as a memo number; it is built as "Basis for the allocation".
3. **The slip.** It records the litres the driver requested. When it comes back
   from the station, a GSU user types what the supplier wrote on it. **Changed on
   20 October 2026:** the unit price (that day's pump price) is required, and at
   least one of the amount and the actual litres must be written, preferably the
   amount. When one of the two is blank, the system works it out from the other
   and the unit price, for that slip alone. This replaces the rule of 15 October,
   under which the litres and the unit price were required and the amount was
   optional. Today's slip has no boxes for these, so the printed slip gets new
   boxes for the supplier; GSU and the supplier still have to agree to that.

   Each withdrawal keeps both numbers: the litres for the DOE monthly report, and
   the pesos to count down the PO.

   The user's plan, not yet told to GSU (20 October 2026): the slip shows an
   estimated amount when it is requested, and the amount that the supplier
   writes is what is deducted from the unit's allocation and the PO, even when
   the supplier rounded it. If the pump charged ₱881.24 and the supplier wrote
   ₱881, the system deducts ₱881, and the 24 centavos are the supplier's loss.
4. **Which PO.** One slip is charged to one PO: the oldest PO where that unit
   still has an allocation of that fuel. Several POs can be open at once. The PO
   on a slip is therefore worked out by the system, not picked by anyone.
5. **Leftovers (12 October).** A unit must use up what is left on the old PO, even
   ₱10. So one fueling can take two or more slips: one for the leftover on the old
   PO, the next for the rest on the new PO. The supplier pumps the total of both.
6. **Overruns.** Proposed on 11 October, not yet confirmed: show an overrun
   whenever the actual amount is typed in and never refuse the slip; give GSU a
   hint at approval (what is left, minus slips still out); and a per-unit report
   for each PO. Also open: what the system shows when a slip goes past the unit's
   own allocation while the PO as a whole still has money.

7. **Closing (15 October).** A GSU user closes a PO by hand once the supplier is
   paid; the system never closes one by itself, so "closed" means "paid". A
   finished PO is **closed** and the opposite is **open**, not active and
   inactive, which are for records that are switched on and off. The system may
   show a hint when the remaining amount reaches ₱0. The PO page lists Open /
   Closed / All and opens on Open. Close is refused while any slip is still out
   or any money is left, because the supplier is paid only after all the fuel is
   used. **Decided on 20 October 2026:** once a PO is closed, its withdrawal
   slips cannot be edited, because their numbers make up the fuel consumed on
   the PO, which is what the supplier is paid for. Still open (MPP-106): whether
   the RIS and the Driver's Trip Ticket are locked too (the owner leans that way,
   since one trip can have all three forms), and which parts stay editable
   because they change only the consumption in the EMS reports, not the fuel
   consumed on the PO. Proposed, not confirmed:
   1. A Reopen action for a PO closed by mistake.
   2. On an open PO, an edit is refused when it would leave a unit's allocation
      below what that unit has already used.
   3. The user's idea, to stop an accidental close: pressing Close shows a check
      of the slips against the PO. It compares pesos, not litres, because under
      pump pricing the litres never match the PO's quantity, and when money is
      left it lists which units have some.
8. **Wording on screen (15 October), proposed:** "remaining amount" for the pesos
   left and "remaining quantity" for the litres left, following the PO's own
   columns. "Remaining balance" was set aside because it can mean either. For
   example: "Remaining amount: ₱1,450 (about 22.3 L)".

## Rounding and tiny leftovers (from the tests of 20 October 2026, MPP-104)

The tests and their results are in `tmp/fuel-po-tests/findings.md`. They found
three problems for a price-based PO, which are being discussed one at a time.

1. **Rounding the pesos and liters of each slip.** In the tests, the system
   worked out each withdrawal's liters from its pesos, and rounding each one on
   its own made the PO's liters miss the exact total. In the real flow (point 3,
   "The slip", of "How POs and withdrawal slips work"), the system copies the numbers that the supplier wrote and works out
   only a missing one, for that slip alone, which is also how the pump charges.
   An amount that the supplier rounded is used as written. **Decided on
   20 October 2026:** each slip is rounded on its own, and the unit price stays
   required. The system needs the price to work out the missing number, and it
   is the number that people know best: the posted pump price can be seen from
   far away on the station's price display.
2. **The units' allocations adding up in pesos.** Each allocation's pesos are
   rounded on their own today, so together they can come to a centavo more or
   less than the PO's amount. Discussed on 20 October 2026: with whole liters it
   cannot happen, and the units ask in liters (point 3 of "How the office handles
   fuel today"). The owner leans towards allowing decimals, but only quarter
   liters (.25, .50, .75); whether to allow them is to be asked of GSU or decided
   (MPP-105). Quarter liters still need rounding at some prices (12.5 L at
   ₱65.75 is ₱821.875), so with any decimals the system has to make the units'
   pesos add up to the PO's amount. Not decided.
3. **Tiny leftovers.** A few centavos, or 0.01 L, cannot be pumped. But a unit
   must use up what is left on the old PO (point 5, "Leftovers", of "How POs and
   withdrawal slips work"), and a PO cannot be closed while money is left
   (point 7, "Closing"). Not discussed yet.

## The paperwork

Analysed from a real set of 30 June 2026 (one motorcycle withdrawal), and from
GSU's fuel logbook.

### Three forms, and they are not peers

| Form | Origin | Job | Always used? |
| --- | --- | --- | --- |
| Driver's Trip Ticket | COA circulars, content only | Justifies official travel; reconciles the tank | Only for vehicles with a driver |
| Requisition and Issue Slip (RIS) | COA Appendix 63 | Records that the fuel left; the accounting record | Yes |
| Withdrawal Slip (WS) | The office's own design | Gets the fuel from the supplier; names the asset | Yes |

1. **The withdrawal slip is not a COA form.** It is the office's own control
   document ("Office copy", noted by the supplier), so the office may redesign
   it.
2. **The RIS must be reproduced exactly.** It is a numbered COA form (Appendix 63
   of the Government Accounting Manual) with a specimen layout. It is the generic
   form for taking anything out of stock, which is why it has about 25 rows and a
   "Stock No." column; the office uses one row. It is outbound only. Its four
   signatories on the observed form:

   | Role | Observed |
   | --- | --- |
   | Requested by | LMO-I / Chief, GSU |
   | Approved by | OIC, PENR Officer |
   | Issued by | AA-I / Property Officer |
   | Received by | GSU Support Staff |

3. **The trip ticket's content is prescribed, not its layout.** COA Circular
   75-6 requires "the prescribed driver's trip ticket" before vehicle expenses are
   allowed, and COA Circular 92-61A amended the manual on its use. Agencies lay
   out their own sheet; the Province of Agusan del Sur publishes one with the
   same wording.
4. **Division of labour:** the trip ticket says why (destination, purpose,
   dates) and reconciles the tank; the RIS records that the fuel left; the
   withdrawal slip physically gets the fuel and names the asset.

### Which forms apply

The RIS and the withdrawal slip are always used; the trip ticket only when
something travels with a driver (a genset or a grass cutter uses a slip alone,
told on 10 October 2026). When nothing travels, the RIS "Purpose" is the only
justification, so it carries more weight.

| Case | Trip ticket | RIS | Withdrawal slip line |
| --- | --- | --- | --- |
| Motorcycle, official travel | Yes | Yes | Gasoline → Motorcycle |
| Grass cutter, grounds upkeep | No | Yes | Gasoline → Grass Cutter |
| Generator during a brownout | No | Yes | Diesel → Generator |
| Chainsaw, field work | No | Yes | Gasoline → Others |
| Boat | No | Yes | ? |

A boat gets no trip ticket (told by the user, 21 October 2026). **Every
withdrawal has a withdrawal slip and an RIS;** none uses the slip alone
(confirmed by GSU, 21 October 2026, asked because the user remembered a
slip-only case).

**A trip ticket can come without a withdrawal** (told by the user, 21 October
2026). When a vehicle still has enough fuel in its tank, the driver makes the
trip with a trip ticket only: no withdrawal slip and no RIS, because no fuel is
taken. So a trip and a withdrawal are separate events; a trip ticket records a
trip, and only some trips include a withdrawal (its "issued" line on the tank
lines).

### What the observed forms showed

1. **Document numbers:** trip ticket `2026-06-070`, WS `06-070` (the same
   sequence), office control number `GSU-2026-06-002` (GSU's own sequence), RIS
   `2026-06-094` (a separate, higher sequence, probably shared with supplies that
   are not fuel). If it is shared, gaps in the RIS numbers are normal and must
   not be checked for (MPP-75).
2. **The trip ticket's tank lines:** balance in tank 0.50 L, issued 6.00 L, total
   6.50 L, used 6.00 L, balance after 0.50 L.
3. **The slip's running balance:** 19 available, 6 issued, 13 left. GSU checks
   this number before approving. It is what is left on the PO: litres on older
   slips, pesos under a price-based PO.
4. **The odometer was left blank.** The trip ticket asks for the reading before
   and after the trip and the distance; none were filled in. Without them the
   km/L figure, the full-tank method and the MFCR's total kilometres cannot be
   worked out. Requiring an odometer reading in the system asks staff for
   something the paper let them skip, so raise it with GSU before making it
   required (MPP-75).

### GSU's fuel logbook

GSU keeps one logbook for all assets together, one line per withdrawal. It is
the closest thing on paper to the record this module builds, so its columns are
the best evidence for the fields a withdrawal needs.

1. **Its columns,** as checked for the discovery notes: WS control no., DTT
   control no., TT control no., vehicle name, date, type of gasoline, issued,
   amount, balance, remarks. The photo of 14 September 2026 in
   [fuel-assets.md](fuel-assets.md) reads them a little differently; whether
   "DTT" and "TT" are two numbers is asked in MPP-75.
2. **"Issued" is litres and "Amount" is pesos,** copied from what the supplier
   writes on the slip (answered on 6 October 2026).
3. **The balance is kept per fuel type,** in a gasoline set and a diesel set of
   columns, as a running ledger: each row's balance is the next row's
   "available".
4. **There is no meter column at all,** no odometer and no engine hours, for any
   asset. Whether a separate generator logbook exists is asked in MPP-75.
5. **Three headings use a looser word than the data under them,** and the system
   uses the precise one: "Speedometer" on the trip ticket holds the odometer
   reading, "Vehicle name" holds any asset, and "Type of gasoline" holds diesel
   too. With the columns already split by fuel, "Type of gasoline" may hold the
   grade instead (unleaded, premium); not confirmed, and the MFCR does not need
   it.

**Decision: the trip ticket says "Odometer reading, if any:".** A speedometer
reads zero when parked, so the number written after a trip can only be the
odometer. The office's trip ticket uses that wording and keeps its three
sub-lines unchanged, so nothing an auditor looks for goes missing. `odometer` is
also the column name and the label on screen.

## The rules and reports that apply

1. **GEMP** (the Government Energy Management Program) names DENR explicitly. It
   asks for monthly electricity and fuel reports by the 15th of the next month,
   a yearly Energy Efficiency and Conservation Plan by 15 January, at least 10%
   less fuel than the average month of the first half of 2005, and an inventory
   of all energy-using equipment. Reports go through the GEMP Online System;
   since the app is offline, its export must suit somebody typing or uploading it
   there.
2. **The DOE Monthly Fuel Consumption Report (MFCR)** asks for the monthly
   baseline and current gasoline litres, the same for diesel, and the total
   kilometres travelled. So every withdrawal must resolve to gasoline or diesel,
   and the kilometres come only from assets with an odometer.
3. **A DOE advisory of March 2026** asks agencies for regular vehicle
   maintenance, a standard vehicle monitoring system, better trip planning, a
   gradual move to electric or hybrid vehicles, fuel-saving driving, the monthly
   report, and the full-tank method for fuel efficiency: fill to full, note the
   odometer, drive, fill to full again; litres over kilometres gives km/L. That
   needs the odometer at filling, the litres to full, and whether the tank was
   filled.
4. **Audit:** COA Circular 92-61A covers government motor vehicles. GPPB
   Resolution 05-2018 allows direct purchase of fuel for official vehicles and
   equipment. Accounting books all of it as Fuel, Oil and Lubricants Expenses,
   whoever owns the asset.

## Recording a fuel issuance (direction discussed, partly decided)

1. **The withdrawal is the record.** The module keeps a log of what happened,
   one row per withdrawal, and totals per asset are added up from it, never
   stored. The suggested name is `fuel_issuance`, which matches the paperwork and
   what GSU says. Because no fuel is kept at the office, there is no delivery
   side to record. Since 21 October 2026 the log also holds trips with no
   withdrawal (point 4).
2. **The fuel type comes from the asset,** never picked on the withdrawal; see
   "Fuel type belongs to the asset" in [fuel-assets.md](fuel-assets.md).
3. **A withdrawal for something that is not on the assets page,** such as a
   borrowed machine, would have no asset and a short description instead. This
   is parked with the other questions about assets the office does not own, in
   [fuel-assets.md](fuel-assets.md). If it is ever built, such withdrawals are a
   good case for a second approval, since nothing else constrains them.
4. **One page, called "issuance", for withdrawals and trip-only trips**
   (decided by the owner, 21 October 2026). A trip with fuel left in the tank
   has a trip ticket and nothing else ("Which forms apply" above), and it goes
   on the same page as the withdrawals, not on a page of its own. The owner
   chose "issuance" knowing that a trip-only row issues no fuel; "logbook" was
   rejected as a page name. GSU just calls its paper record "logbook", so they
   cannot settle the word either. Route, table, and screen names are still to
   be written down when the page is designed.
5. **The add button, proposed, not confirmed (21 October 2026):** a button
   group whose main button is "New withdrawal", with a menu holding "Trip only
   (no fuel taken)". The withdrawal form adds the trip ticket part on its own
   when the asset's type reads an odometer, and leaves it out for a generator,
   grass cutter, chainsaw, or boat, so the asset decides it rather than a third
   button.
