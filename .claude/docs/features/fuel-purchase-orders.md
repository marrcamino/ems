# Fuel purchase orders, suppliers and withdrawal slips

> **Paths and keys updated on 24 October 2026.** The pages moved out of
> `/admin` and every permission key was renamed to `thing:action` (MPP-121,
> `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md`).
> The paths and keys below are the new ones, also where an older date stands
> next to them. Passages that explain the old split into an admin area and
> staff pages are kept as they were written.

Suppliers, purchase orders (POs) and their allocations at
`/fuel/purchase-orders`, how the office handles fuel today, the paperwork,
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
3. **Each unit asks GSU for the fuel it needs,** such as CDS 30 L and OPENRO
   25 L. The request is probably verbal; no separate document per unit has been
   seen (7 October 2026). Whether each unit makes a purchase request (PR) does
   not matter to EMS, so GSU is not asked (decided by the user, 22 October 2026,
   MPP-115): if PRs exist, GSU can write their numbers in the PO's optional
   "Basis for the allocation" note.
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
   (7 October 2026). Planning asks CDS in person or by chat, and a CDS staff
   member records the withdrawal. Planning may also go to GSU, but GSU still
   needs CDS's agreement (told by the user, 22 October 2026). The record does
   not show that Planning used the fuel, because CDS knows it anyway (point 7
   of "Recording a fuel issuance").
7. **A new PO is supposed to wait until the whole PO is used up,** because the
   PO's terms say so. In practice this is not always followed: a new PO can be
   made earlier, so a unit can have fuel on two POs at once. There is no fixed
   limit on how many POs are open together (7 and 10 October 2026). GSU says
   that this is possible but rare (told by the user, 29 October 2026). A year
   has several POs, and some POs have only 5 to 10 withdrawals. A PO made near
   the end of the year, such as in December, can still have fuel left in the
   next year (told by the user, 29 October 2026). Two open POs with the same
   supplier happen only when that supplier agrees to it, because otherwise the
   supplier may take a withdrawal off the old PO when it belongs to the new one,
   especially on a litre-based PO (told by the user, 10 November 2026).
8. **A withdrawal, step by step** (told by the user, 6–7 October 2026):
   1. The driver fills in the withdrawal slip with the litres they want.
   2. GSU approves the litres asked for, by signing the slip.
   3. At the station, the driver gets the fuel, and the supplier writes on the
      slip what was actually pumped.
   4. The slip has two copies: the supplier's copy stays at the station, and the
      office copy goes back to GSU.
   5. GSU copies the slip into its logbook. "Issued" is the litres the driver
      wrote on the slip, not what the supplier pumped, and "Amount" is the
      pesos (corrected by the owner, 27 October 2026; see point 2 of "GSU's
      fuel logbook"). In the system, a GSU user will type them in; the
      supplier never uses the system.
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
13. **A PO is litre-based or price-based.** On a litre-based PO the price is the
    PO's unit cost. On a price-based PO the supplier charges the day's pump price
    (since 6 October 2026), so its litres left can only be estimated. Every PO
    before the PO of 10 October 2026 was litre-based. From that PO on, the owner
    expects that POs will probably always be price-based, because a supplier
    loses nothing on one; the supplier has not said so (told by the owner,
    11 November 2026, replacing the rough figure of 7 November that about 80% of
    POs are litre-based). The price-based PO is new: no withdrawal has been made on
    one yet (told by the owner, 5 November 2026), so GSU has no experience of a
    unit going past its allocation, or of a unit leaving part of it unused, and
    cannot yet say how such slips are written.
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


1. **Permission keys** `purchase_orders:view` and
   `purchase_orders:manage`, synced on 11 October 2026. The manage key
   also covers suppliers.
2. **Page** `/fuel/purchase-orders`, in the sidebar under Fuel, after
   Assets. It has "Manage suppliers", "Add purchase order", and the list
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
   `GET /fuel/purchase-orders/suppliers?status=archived` the first time
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

1. **The fuel page** `/fuel`, titled "Fuel", shows only made-up withdrawals
   from `sample-withdrawals.ts` (see `cards/fuel.md`). Until 24 October 2026
   there was a staff page and an admin page; MPP-121 made them one.
2. **Recording a fuel issuance.** Saving a new withdrawal is built
   (9 November 2026, MPP-80; how it works is in `cards/fuel.md`): the
   `fuel_issuance` table, the `form_counter` table for the control, WS, RIS,
   and DTT numbers, and the key `fuel:record`. A trip only, a reimbursed
   trip, approving, completing, cancelling, and editing were built on
   23 November 2026 (`cards/fuel.md`); printing is not built. What is decided so far, and what is still open, is in "Recording a
   fuel issuance" below.
3. **Marking a slip as approved,** and the permission key that controls it.
4. **The reports,** mainly the GHG Focal Person's report to the DENR regional
   office (MPP-82), which needs the litres of gasoline and diesel (point 7 of
   "The rules and reports that apply"). Not designed.

## Questions that are still waiting for GSU

Each question is its own Linear issue with the Ask label, with its background
and an example, and the open ones are listed in the Open list of
`cards/fuel.md`. Until 21 October 2026 they were all in MPP-75. An answer that
comes back is written where its fact belongs in this document, mostly in "How
the office handles fuel today" or "The paperwork". Each place in this document
that is still waiting for an answer names its issue.

## How POs and withdrawal slips work (decided 6–20 October 2026)

1. **The PO.** One PO covers both fuels, one row each (quantity, unit cost,
   amount), with an overall total. "Price-based" is GSU's own term (told by the
   user, 20 October 2026) for a PO that is paid at the prevailing pump price on
   the day of each withdrawal. The user knows that the term is not ideal and may
   change it later.

   **Every PO has a type, litre-based or price-based** (decided by the owner,
   7 November 2026, MPP-132; until then a PO had no type). The type never
   changes how a PO is counted: EMS has one way of counting, and every PO counts
   down pesos, the litre-based one too. The type changes only what the screens
   show, so that a reader can tell an exact number from an estimate:
   1. **The list's column is called "Balance"** and shows the litres with the
      pesos under them on every row. On a price-based PO the litres carry ≈,
      and hovering over the balance says why. The pesos never carry it.
   2. **The New withdrawal form names the PO, its type, and its balance,** and
      what the request comes to at the PO's price or, on a price-based PO, at
      the last known price.
   3. **The type is locked once a withdrawal is charged to the PO** (not built
      yet; it belongs with the PO edit checks of MPP-60). The PO form's required
      "PO type" field was built on 9 November 2026; a new PO starts as
      liter-based (decided by the user, 9 November 2026).
   4. **A slip that is still Out takes off the requested amount** on both types,
      so a balance is exact only after the slip is back.
2. **Allocations.** When adding a PO, GSU types each unit's request as its
   allocation of each fuel (see points 2 to 5 of "How the office handles fuel
   today"). Allocations are required and must add up exactly to that fuel's row on
   the PO. A PO may have only one fuel, and the whole of a fuel may go to one unit
   (7 October 2026). An optional note records where the allocations came from,
   such as a memo number; it is built as "Basis for the allocation".
   **Whole liters only** on the PO and in its allocations (decided by the user,
   22 October 2026, MPP-105). The PO rows in GSU's logbook have no decimals,
   and a unit has no reason to ask for part of a liter. A withdrawal's actual
   liters still have decimals (point 9 of "How the office handles fuel today").
   The pesos of an allocation are only an estimate anyway, because each
   withdrawal is charged at that day's pump price. So an allocation is typed in
   liters only, and EMS shows its pesos beside them; typing an allocation in
   pesos is dropped (decided by the user, 22 October 2026). Not built yet
   (MPP-118): the PO form still accepts two decimals and pesos typing.
3. **The slip.** It records the litres the driver requested. When it comes back
   from the station, a GSU user types what the supplier wrote on it. **Changed on
   20 October 2026:** the unit price (that day's pump price) is required, and at
   least one of the amount and the actual litres must be written, preferably the
   amount. When one of the two is blank, the system works it out from the other
   and the unit price, for that slip alone. This replaces the rule of 15 October,
   under which the litres and the unit price were required and the amount was
   optional. Today's slip has no boxes for these, so the printed slip gets new
   boxes for the supplier. GSU agreed to the new boxes when the user talked it
   through with GSU staff (told by the user, 22 October 2026). The supplier has
   not been asked, but the user does not expect the supplier to object.

   **Changed on 11 November 2026 (decided by the owner):** what the supplier
   writes depends on the PO's type, so the printed slip differs by type. The
   slip is not a COA form (point 1 of "Three forms, and they are not peers"),
   and GSU has already changed its own slip: "Available" and "Remaining Balance" are gone, and it now has
   "No. of liters", "Unit price", and "Total amount" (seen by the owner on a
   finished slip).
   - **Price-based slip:** the supplier writes the unit price (that day's pump
     price) and the total amount, never the litres. EMS works out the actual
     litres from the two, for that slip alone. Both slip types have a space
     for the supplier's remarks (decided by the owner, 11 November 2026).
   - **Litre-based slip:** the supplier writes no numbers, only a name and a
     signature, with a space for remarks. EMS takes the requested litres as the
     litres pumped, at the PO's unit cost. When the driver gets less than was
     asked (point 9 of "How the office handles fuel today"), the owner expects
     the driver to go back to the station later for the rest. The slip can also
     be edited in EMS to the litres actually pumped, printed again, and approved
     again by GSU, keeping its numbers. A rest as small as 0.02 L or 0.10 L is
     simply left.

   **A request above the balance is never saved,** on either PO type (decided
   by the owner, 11 November 2026). On a litre-based PO the balance in litres
   is exact, and the supplier writes no number that would catch the extra
   later. On a price-based PO a request in pesos is compared with the pesos
   left, which is exact too. A request in litres there is compared with the
   estimated litres left, so an office that wants more litres than the estimate
   shows asks in pesos instead. Built on 17 November 2026: the New withdrawal
   form shows the refusal under the request and turns Save off, and the server
   refuses it with the same words.

   **The printed slip shows the PO number** (decided by the owner, 11 November
   2026), so that a supplier with two open POs knows which PO the withdrawal is
   taken off (point 7 of "How the office handles fuel today"). The sample
   slip prints it as "Charge to: PO 2026-10-13".

   **On a litre-based PO, the price is always the PO's unit cost** (decided by
   the owner, 7 November 2026, MPP-132), so EMS fills it in and nobody types a
   unit price when the slip comes back.

   **A price-based PO can also be requested by pesos** (decided by the owner,
   5 and 7 November 2026, MPP-132), for example when an office wants what is
   left of its allocation (point 5). The form has a switch between litres and
   pesos, and a "Use the rest" button that fills in that amount. Still open:
   such a request has no requested quantity for the RIS when it is made. If the
   RIS is signed before the fuel is pumped, it shows a blank quantity with the
   pesos in the Description. If it is not, it is printed after the slip is back.

   Each withdrawal keeps both numbers: the actual litres for the CO2 figures
   (point 7 of "The rules and reports that apply"), and the pesos to count down
   the PO.

   The user's plan of 20 October 2026, told to GSU (confirmed by the user,
   22 October 2026, MPP-114): the slip shows an
   estimated amount when it is requested, and the amount that the supplier
   writes is what is deducted from the unit's allocation and the PO, even when
   the supplier rounded it. If the pump charged ₱881.24 and the supplier wrote
   ₱881, the system deducts ₱881, and the 24 centavos are the supplier's loss.
   Never the requested liters or an estimated price, because the pump price
   changes from day to day.
4. **Which PO.** One slip is charged to one PO: the oldest PO where that unit
   still has an allocation of that fuel. Several POs can be open at once.
   **Changed on 10 November 2026 (decided by the user):** the New withdrawal
   form shows a PO picker, so nobody wonders where the PO comes from. It lists
   only the POs where that office still has that fuel, oldest first, and the
   oldest is filled in. A newer one can still be picked, but then a message
   under the picker names the older PO and what is left on it, and Save is
   turned off. The server refuses it too. Still open: whether this holds when
   the older PO is with a different supplier, since the driver would then go
   to two stations for one fueling (point 11 of "How the office handles fuel
   today" assumes one supplier pumps both slips).
5. **Leftovers (12 October).** A unit must use up what is left on the old PO, even
   ₱10. So one fueling can take two or more slips: one for the leftover on the old
   PO, the next for the rest on the new PO. The supplier pumps the total of both.
   **Each slip is its own transaction** (decided by the owner, 4 November 2026),
   with its own control number, WS, and RIS, because each PO is liquidated
   separately (told by GSU, MPP-109). One transaction never holds several slips,
   which was the earlier plan: it would count down two POs at once, and closing
   the old PO would lock half of it. When GSU makes one DTT for the trip, the
   second transaction links to the DTT of the first instead of getting a new
   number, which the owner likes; whether GSU makes one DTT or two is asked in
   MPP-129.
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
   the PO, which is what the supplier is paid for. Which parts of the RIS and
   the DTT are locked too is "What a closed PO locks" below. **Decided on
   26 October 2026** (MPP-61), without asking
   GSU, because the owner is sure that GSU will accept these rules; the finer
   details are settled while testing:
   1. A Reopen action for a PO closed by mistake.
   2. On an open PO, an edit is refused when it would leave a unit's allocation
      below what that unit has already used.
   3. The user's idea, to stop an accidental close: pressing Close shows a check
      of the slips against the PO. It compares pesos, not litres, because under
      pump pricing the litres never match the PO's quantity, and when money is
      left it lists which units have some. **Decided on 26 October 2026:** the
      check appears when a GSU user presses Close, before the PO is closed,
      because a warning after the close comes too late to act on. It has two
      kinds of items, each linking to its withdrawal:
      1. **Problems that stop the close:** a slip still out, or money left on
         the PO. The Close button on the PO page is never disabled, because
         the page has no place to show why a PO cannot be closed; pressing it
         opens the check. Inside the check, the Close button is disabled while
         any problem is listed, because the reason is shown right there. The
         check uses what the PO page already has, such as the remaining
         amount, and asks the server only for what the page does not have
         (confirmed by the owner, 27 October 2026;
         `.claude/skills/unavailable-actions/SKILL.md`). Nothing else blocks, because the locked fields are already required when a
         withdrawal is saved.
      2. **Warnings that do not stop it:** for example, a withdrawal with a DTT
         whose tank balances are missing, or whose tank lines do not add up
         (balance before plus issued, minus used, must equal the balance
         after). GSU can still press "Close anyway", which is safe because the
         tank balances stay editable after the close.

      Missing odometer readings raise no warning: they are optional, drivers
      usually skip them, and a warning on almost every PO would teach GSU to
      ignore the whole list. The same warnings also show earlier, when a
      withdrawal is saved and as a marker on its row in the issuance list, so
      problems are fixed as they happen instead of piling up until the close.
      An idea to make this check read each withdrawal's history is MPP-126.

   **What a closed PO locks (decided by the owner on 26 October 2026, MPP-106).**
   A withdrawal is one record, and the withdrawal slip, the RIS, and the DTT are
   three printouts of it (point 1 of "Recording a fuel issuance"), so the lock
   works per field, not per form: a locked field is locked on every form that
   shows it. The rule: what the supplier wrote or what counts against the PO is
   locked, and what describes the trip and its purpose stays open.
   1. **Locked:** the litres, the pesos, and the unit price, which are also the
      RIS quantity and the DTT "issued" line; the office whose allocation the
      withdrawal counts down; the withdrawal date, because the WS and RIS
      numbers hold the month; and the WS, RIS, and DTT numbers, because they
      are how the supplier and COA find the paper.
   2. **Still editable:** the DTT's trip details (destination, purpose, travel
      dates, odometer readings, and the tank balances before and after), since
      they change only the consumption in the EMS reports, not the fuel
      consumed on the PO; the RIS "Purpose"; the remarks; and the asset, but only to another
      asset with the same fuel type, because a change of fuel type moves litres
      between gasoline and diesel on the PO.
   3. A trip with no withdrawal has no PO, so a PO closing never locks it.
   4. A withdrawal on a closed PO cannot be deleted, since that is the same as
      editing its litres to zero. A locked number that is really wrong is fixed
      by reopening the PO.
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
   fuel today"). **Settled on 22 October 2026:** the PO and its allocations take
   whole liters only (point 2, "Allocations", of "How POs and withdrawal slips
   work"), so this cannot happen. Quarter liters were considered and dropped,
   because they still need rounding at some prices (12.5 L at ₱65.75 is
   ₱821.875).
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
| Driver's Trip Ticket | COA circulars, content only | Justifies official travel; reconciles the tank | Only for an asset that travels with a driver, boats included |
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
5. **The RIS and the trip ticket each have their own remarks** (told by GSU,
   16 November 2026). A withdrawal keeps two remarks, one printed on the RIS
   and one on the DTT, never one shared for both. **The RIS stock number is
   optional** (told by GSU, the same day): a withdrawal may leave it blank.
   **The RIS also takes a fund cluster and a responsibility center code**,
   both optional and rarely filled in, kept for when they are needed
   (decided by the owner, 17 November 2026). **The RIS purpose is optional
   too** (decided by the owner, the same day); the trip ticket's purpose is
   still required. The New withdrawal form asks
   for the RIS's fields in this order: fund cluster, responsibility center
   code, stock number, remarks, then purpose.
   **The purpose is usually the same on the RIS and the trip ticket** (told by
   GSU, the same day), but each form keeps its own (decided by the owner, 17
   November 2026). Typing one purpose copies it into the other while the
   other is empty or still a copy; a purpose the person typed is never
   overwritten, and emptying it makes it a copy again. Only the purpose is
   copied: remarks and every other field stay separate.
6. **Each form names its own people** (told by the owner, 17 November 2026).
   - The withdrawal slip names the person sent to withdraw the fuel, who is
     not always the trip ticket's driver: a boat cannot go to the gas station,
     so someone else fetches its fuel.
   - The trip ticket's driver may not be an employee of the office: one boat's
     driver is a ranger from another municipality.
   - The RIS "Requested by" can differ from the slip's "Requested by", so it
     is chosen on each withdrawal, not fixed.
   - The trip ticket lists its passengers by name, typed, never picked from
     the employees.
7. **What the trip ticket takes when the withdrawal is added** (decided by
   the owner, 17 November 2026). Besides the driver, passengers,
   destination, purpose, dates of travel, and remarks: the number of hours,
   after the dates of travel (kept, though the owner sees no use for it); and
   the lines known before the trip: departure time, balance in tank, the
   "Oil / Fuel Lubricant" line, and the odometer reading at the start. The
   lines after the trip (arrival time, purchased during the trip, used,
   balance after, the odometer after, and the distance) come with the
   Complete step. "Issued by the Officer", the total in the tank, and the
   distance are worked out by EMS, never typed. What the "Oil / Fuel
   Lubricant" line holds is still asked of GSU (MPP-139).
8. **The trip ticket's lines, as printed on the office's sheet** (a filled-in
   DTT for a motorcycle, shared by the owner on 23 November 2026). The paper
   gets no new lines; only "Speedometer" reads "Odometer" in EMS ("What the
   observed forms showed"). From top to bottom:
   - the date and the number;
   - "To be filled-up by the Authorized Representative": the driver's name,
     the vehicle ("RP Vehicle") with its plate number, the passengers, the
     destination, the purpose, the dates of travel (from and to), and the
     number of hours;
   - "Approved", with the approver's name and position;
   - three times: "Office/Garage - Departure Time", "Arrival Time From (Per
     No.)", and "Office/Garage-Arrival Time". What the middle one means is
     not known yet;
   - "Fuel and Other Issued by the Office", in liters: a. balance in tank,
     b. issued by the Officer, c. purchased during trip, d. total fuel in
     tank, e. used during the trip, f. balance in tank after the trip issued;
   - "Oil / Fuel Lubricant";
   - the odometer ("Speedometer" on the paper), in km: the reading after the
     trip, at the beginning of the trip, and the distance travelled;
   - remarks;
   - two certifications, each with a signature line: the driver's ("I hereby
     certify in accordance of the statement of travel"), with the driver's
     name printed, and a passenger's ("I hereby certify that I used the
     vehicle in official travel").

### Which forms apply

The RIS and the withdrawal slip are always used; the trip ticket only when
something travels with a driver (a genset or a grass cutter has no trip ticket,
told on 10 October 2026). When nothing travels, the RIS "Purpose" is the only
justification, so it carries more weight.

| Case | Trip ticket | RIS | Withdrawal slip line |
| --- | --- | --- | --- |
| Motorcycle, official travel | Yes | Yes | Gasoline → Motorcycle |
| Grass cutter, grounds upkeep | No | Yes | Gasoline → Grass Cutter |
| Generator during a brownout | No | Yes | Diesel → Generator |
| Chainsaw, field work | No | Yes | Gasoline → Others |
| Boat, official travel | Yes | Yes | ? |

**A boat gets a trip ticket,** because boats are mostly used for travel (told
by the owner, 12 November 2026, after seeing a DTT made for a motor bangka). An
earlier line here said that a boat gets none (21 October 2026); the owner does
not remember saying it, and it was wrong. A boat that is not used for travel
gets no trip ticket. In EMS, each asset carries a Trip ticket switch that GSU
sets ("Trip ticket belongs to the asset" in [fuel-assets.md](fuel-assets.md)).
**Every withdrawal has a withdrawal slip and an RIS;** none uses the slip alone
(confirmed by GSU, 21 October 2026, asked because the user remembered a
slip-only case).

**A trip ticket can come without a withdrawal** (told by the user, 21 October
2026). When a vehicle still has enough fuel in its tank, the driver makes the
trip with a trip ticket only: no withdrawal slip and no RIS, because no fuel is
taken. So a trip and a withdrawal are separate events; a trip ticket records a
trip, and only some trips include a withdrawal (its "issued" line on the tank
lines).

**A reimbursed trip has a trip ticket and an RIS, but no withdrawal slip**
(answered on 26 October 2026, MPP-117, as a trip ticket only; corrected on
27 October 2026, when GSU realised that a reimbursed trip has an RIS too).
When a staff member pays for the fuel of an official trip and is paid back by
the office afterwards, there is no withdrawal slip, because no fuel is taken
under a PO, so a reimbursed trip never counts down a PO or an allocation.
**A reimbursed trip uses one of the office's own vehicles, never a personal
one** (told by the owner's unit chief, 23 November 2026; the owner thinks a
COA rule is behind it). So it is recorded against an asset on the Assets page,
like a withdrawal, and the form offers only assets whose Trip ticket switch is
on, because it is a trip (decided by the owner, the same day). This replaces
the link that was made here to case 2, "Privately owned", in
[fuel-assets.md](fuel-assets.md). **It can be entered before the trip, on
the day of the trip, or after it** (decided by the owner, 23 November 2026,
after first saying "before or on the day of the trip"; MPP-140 asks GSU which
the office does). Entered before the trip, the driver may already know how
much to buy, as when the PENR Officer says "buy 15 liters later"; a section
may also choose a reimbursed trip because it is out of fuel and a new PO
cannot be made yet. **The litres on the "purchased during trip" line are
required when it is entered,** whenever that is: before the trip they are
the litres the driver was told to buy, after it the litres bought. GSU
corrects them at Complete against the paper DTT, and only that final number
is counted (decided by the owner, 23 November 2026). They are kept in
`fuel_issuance.purchased_liters`. **Its RIS and DTT are the same papers as a
withdrawal's, with the same signatories,** the RIS's "Issued by" from GSU
included; only the withdrawal slip comes and goes between the kinds (told
by the owner, 23 November 2026). Its DTT is still
entered in EMS and gets its number from EMS, like every DTT; GSU never writes a
form number by hand (told by the owner, 26 October 2026). The fuel of a
reimbursed trip is still fuel consumed, and fuel consumption for the CO2
figures is what EMS is for; the POs are a help for GSU on the side. Its litres
are counted in the CO2 figures, because the office paid for them (point 7 of
"The rules and reports that apply"), but its pesos are never counted in a PO's
total (confirmed by the owner, 27 October 2026). The driver writes the litres
on the DTT's "purchased during trip" line. GSU's logbook lists reimbursed trips
too, with the fuel type, the litres, and the amount: for example, DTT
`2026-04-043`, diesel, 15.38 L, with a handwritten amount that the owner could
not read for sure (seen by the owner, 27 October 2026).

### What the observed forms showed

1. **Document numbers:** trip ticket `2026-06-070`, WS `06-070`, office
   control number `GSU-2026-06-002` (a separate sequence), RIS
   `2026-06-094` (a separate, higher sequence). The RIS numbering is shared with
   supplies that are not fuel (told by the user, 21 October 2026), so the fuel
   RIS numbers alone have gaps. Its running number starts again at 001 every
   January, not every month (told by GSU, 21 October 2026), so the first RIS of
   July carries on from the last number of June. The RIS running number can
   reach 4 digits within a year (told by the owner, 27 October 2026). How EMS
   hands out these numbers is point 6 of "Recording a fuel issuance".
   **On screen (decided by the owner, 27 October 2026):** a list shows the
   numbers without their year, as `10-118`, to keep them short; the file date
   in the same row tells the years apart. The running number shows 3 digits,
   and all the numbers in a list show 4 only once one of them has 4, so they
   stay lined up. The same rule applies to the other forms' numbers. EMS still
   saves and prints the full number with its year. **A search matches a
   number only as the list shows it,** without the year (decided by the user,
   28 October 2026), so typing "2026" does not find every number of the
   year. **The trip ticket and the WS each
   have their own running number** (seen by the user in GSU's logbook and
   explained by GSU, 22 October 2026). They match only while every withdrawal
   has both. A slip with no trip ticket, such as for the generator, moves the
   WS ahead, and a trip with no slip moves the trip ticket ahead, so the two
   can drift apart and later match again. The WS's running number starts again
   every January, like the RIS; only the month part changes during the year
   (told by the user, 22 October 2026). The trip ticket's running number, the
   last part of `2026-06-070`, also starts again every January, and only its
   month part changes during the year (answered on 26 October 2026, MPP-108).
   **The office control
   number is counted per division, section, or unit,** and each one writes its
   own, because each manages its own fuel from its own budget (told by the
   user, 22 October 2026). GSU writes only its own. Its code shows whose slip it is, and its running number
   shows the order of that unit's own slips, so `GSU-2026-06-002` and
   `CDS-2026-06-002` can both exist. EMS does not produce it (point 8 of
   "Recording a fuel issuance").
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
   required (MPP-116). Drivers fill in the tank lines (the balance in the tank
   before and after the trip) but prefer to skip the odometer readings (told by
   the user, 22 October 2026). No report needs the kilometres (point 2 of "The
   rules and reports that apply"), so **EMS keeps the odometer readings
   optional** (MPP-116, 22 October 2026). Kilometres per litre can be worked out
   only for the trips that have both readings.

### GSU's fuel logbook

GSU keeps one logbook for all assets together, one line per withdrawal. It is
the closest thing on paper to the record this module builds, so its columns are
the best evidence for the fields a withdrawal needs.

1. **Its columns:** WS control no., trip ticket no., vehicle name, date, type
   of gasoline, issued, amount, balance, remarks. There is one trip ticket
   number, not two. The discovery notes listed a "DTT control no." and a "TT
   control no.", but DTT (Driver's Trip Ticket) and TT (Trip Ticket) are two
   names for the same form (told by the user, 21 October 2026). Neither the
   photo of 14 September 2026 in [fuel-assets.md](fuel-assets.md), which shows a
   single "Trip Ticket No." column, nor the owner's own sample of the logbook
   has two columns for it. The owner shortens the form's name to DTT, not TT.
2. **"Issued" is the litres the driver wrote on the slip, and "Amount" is
   pesos** (corrected by the owner, 27 October 2026; recorded on 6 October
   2026 as both copied from what the supplier writes). "Issued" is not what
   the supplier pumped. GSU keeps "Amount" because the supplier's pesos
   sometimes differ from GSU's own working-out. **GSU writes the "Amount"
   itself** (told by the owner, 4 November 2026, MPP-128). It is filled in only
   on the rows from the days of a sudden price rise, when trouble abroad pushed
   up the price of imported fuel while the PO was still open, and it is empty
   again a few rows later. The rise was in January, and the PO after that one
   has the column empty (seen by the owner in the logbook, told on 11 November
   2026). GSU wrote it to keep track of the fuel left on the
   PO while the price moved. How each figure was worked out is not known: the
   GSU chief could only say "based on PO". EMS does not need the formula,
   because it records the day's price and the amount on every slip and counts
   the PO down in pesos (points 1 and 3 of "How POs and withdrawal slips
   work"). The logbook was made for
   litre-based POs. Under price-based POs the litres actually pumped can
   differ from "Issued", so EMS keeps the requested litres and the actual
   litres as two numbers.
3. **The balance is kept per fuel type,** in a gasoline set and a diesel set of
   columns, as a running ledger: each row's balance is the next row's
   "available".
4. **There is no meter column at all,** no odometer and no engine hours, for any
   asset. GSU keeps no separate generator logbook either (asked by the user,
   22 October 2026), so nothing on paper records engine hours.
5. **Three headings use a looser word than the data under them,** and the system
   uses the precise one: "Speedometer" on the trip ticket holds the odometer
   reading, "Vehicle name" holds any asset, and "Type of gasoline" holds diesel
   too. With the columns already split by fuel, "Type of gasoline" may hold the
   grade instead (unleaded, premium); not confirmed, and the MFCR does not need
   it.
6. **A new PO gets one highlighted row of its own,** with the PO's details,
   between the last withdrawal of the old PO and the first one of the new PO.
   The row works as a gap that shows that the old PO is used up. The logbook
   has only one open PO at a time (seen by the user in GSU's sample logbook,
   29 October 2026).

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
   there. **But the office submits no GEMP fuel report** (told by the user,
   22 October 2026).
2. **The DOE Monthly Fuel Consumption Report (MFCR)** asks for the monthly
   baseline and current gasoline litres, the same for diesel, and the total
   kilometres travelled. So every withdrawal must resolve to gasoline or diesel,
   and the kilometres come only from assets with an odometer. **But the office
   does not report to the DOE** (told by the user, 22 October 2026, after
   asking the GHG Focal Person, MPP-116). The GHG Focal Person submits the
   office's report to the DENR regional office, which may use its own form, and
   no part of that report needs the kilometres travelled. Only the litres of
   gasoline and diesel are needed.
3. **A DOE advisory of March 2026** asks agencies for regular vehicle
   maintenance, a standard vehicle monitoring system, better trip planning, a
   gradual move to electric or hybrid vehicles, fuel-saving driving, the monthly
   report, and the full-tank method for fuel efficiency: fill to full, note the
   odometer, drive, fill to full again; the kilometres divided by the litres
   give km/L. That needs the odometer at filling, the litres to full, and
   whether the tank was filled.
4. **Audit:** COA Circular 92-61A covers government motor vehicles. GPPB
   Resolution 05-2018 allows direct purchase of fuel for official vehicles and
   equipment. Accounting books all of it as Fuel, Oil and Lubricants Expenses,
   whoever owns the asset.
5. **GHG reporting works from litres, not kilometres.** The GHG Protocol and the
   IPCC prefer the fuel-based method, because the fuel burned is what produces
   the CO2; the distance-based method is a fallback for when there is no fuel
   data. So the GHG figures need only litres (point 7), and no odometer or
   hour reading. The report the user checked calculates from fuel
   too (22 October 2026).
6. **Only fuel paid for from the office's budget is counted, for now** (told by
   the owner, 26 October 2026). The office sometimes receives fuel that is given
   to it and that it does not pay for. That fuel is consumed, but the GHG Focal
   Person says that it is not counted in the CO2 figures, so EMS does not cover
   it yet; the owner expects it to be added later. Given fuel goes into the
   same tanks, so on a trip with a DTT and no withdrawal, nobody can tell
   whether the fuel used was left from an earlier withdrawal or was given fuel.
7. **The CO2 figures count the fuel bought, not the DTT's litres used** (told
   by the GHG Focal Person to the owner, 27 October 2026, MPP-127).
   1. **A withdrawal counts its actual litres,** the litres the supplier
      pumped, whether or not the trip has a DTT. If the supplier pumps 5 L,
      EMS counts 5 L, even when some of it is still in the tank after the
      trip, because that fuel will be used up anyway. The litres the driver
      requested are never counted.
   2. **A trip with a DTT and no withdrawal counts nothing,** whether the fuel
      in the tank came from a withdrawal or was given fuel. Fuel from a
      withdrawal was already counted when it was pumped, and given fuel is not
      counted (point 6).
   3. **A reimbursed trip counts the litres that the office paid back,**
      because the office paid for that fuel, as if it were a direct purchase.
      It has no withdrawal slip, so its DTT record in EMS is where those litres
      are kept. They come from the DTT's "purchased during trip" line, where
      the driver writes them; EMS records nothing from the official receipt
      (told by the owner, 27 October 2026).
   4. **The DTT's tank lines** (the balance before, the litres used, and the
      balance after) are still recorded, but they are never counted in the
      CO2 figures.

## Recording a fuel issuance (direction discussed, partly decided)

1. **The withdrawal is the record.** The module keeps a log of what happened,
   one row per withdrawal, and totals per asset are added up from it, never
   stored. The suggested name is `fuel_issuance`, which matches the paperwork and
   what GSU says. Because no fuel is kept at the office, there is no delivery
   side to record. Since 21 October 2026 the log also holds trips with no
   withdrawal (point 4).

   **Every transaction has a control number** (decided by the owner,
   27 October 2026; the GHG Focal Person agreed, and GSU left the choice to
   the owner). The control
   number belongs to the transaction itself and is not the number of any
   form. The forms that the transaction needs are linked to it, and which
   forms those are depends on the asset and the case ("Which forms apply"):

   ```
   Control number (the transaction)
   ├── WS   06-070
   ├── RIS  2026-06-094
   └── DTT  2026-06-070
   ```

   A generator withdrawal has only a WS and an RIS under its control number.
   A trip-only trip has only a DTT, and a reimbursed trip has a DTT and an
   RIS. Both get a control number too, so that they behave like any other transaction.
   GSU's logbook gives these trips no number, but EMS hands out every number
   anyway. Each transaction still records which kind it is, a withdrawal, a
   trip only, or a reimbursed trip, because only a withdrawal counts down a
   PO and an allocation; the trips are in the log because they use a DTT.
   The list shows every kind in one order, by date and then by the order of
   entry. What happens to the forms when a transaction is deleted, given
   that an RIS number is never deleted (point 6.5), is still to be discussed.
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
   when the asset's Trip ticket switch is on, and leaves it out for a
   generator, grass cutter, or chainsaw, so the asset decides it rather than a
   third button. Until 12 November 2026 the asset type's meter decided it
   ("Trip ticket belongs to the asset" in [fuel-assets.md](fuel-assets.md)).
   **Built:** the menu holds "Trip only" and "Reimbursed trip". Trip only
   opens its own form (23 November 2026), whose DTT is the same paper as a
   withdrawal's (confirmed by the owner, 23 November 2026); it offers only
   assets whose Trip ticket switch is on. Reimbursed trip opens the New
   withdrawal form's RIS and Trip ticket steps, without the slip step
   (23 November 2026). Details are in `cards/fuel.md`.
6. **RIS numbers are reserved in EMS before they are written** (the owner's
   plan, told on 21 October 2026). Because the RIS numbering is shared with
   supplies that are not fuel ("What the observed forms showed", point 1), EMS
   hands out every RIS number, fuel or not.
   1. **A fuel withdrawal gets its RIS number when it is saved,** and so does
      a reimbursed trip, which has an RIS too. EMS takes the next number by
      itself; GSU never types an RIS number for a withdrawal or a reimbursed
      trip.
      Each withdrawal has its own RIS (told by GSU, MPP-109, answered by
      4 November 2026), so this plan stands.
   2. **A non-fuel RIS is reserved first.** A GSU staff member reserves the next
      number in EMS, and only then writes it on the paper. Writing the paper
      first and typing the number in later is ruled out, because someone could
      record a withdrawal in the meantime and take the same number.
   3. **Only GSU reserves numbers,** because GSU has control of all property.
      Anyone outside GSU who needs an RIS number asks a GSU staff member.
   4. **A reserved number saves who reserved it and when,** so GSU can see which
      staff member took it, and a remarks field that says what it is for. The
      owner would like more fields than remarks, to be thought about later.
   5. **A reserved number that ends up unused is marked "not used",** with a
      short reason such as "paper spoiled", and GSU reserves a new number for
      the next RIS (decided by the owner, 21 October 2026). It is never deleted,
      because later numbers already come after it, and it is never reused,
      because the number holds the month: reusing `2026-03-024` for a May RIS
      would give that RIS a March number, placed before RIS made weeks earlier.
      **The exception is the newest number of its year** (decided by the
      owner, 17 November 2026): no later number comes after it yet, so a
      reservation that is still the newest RIS number, reserved or not used,
      can be deleted, and the count goes back by one, so the next reservation
      gets the same number again and no gap is left. A fuel withdrawal's RIS
      number is never deleted here. The check is made again on the server
      while the count is locked, because a withdrawal or another reservation
      may take a number in the meantime.
      **The newest number, once marked not used, is given out again**
      (decided by the owner, 17 November 2026, so that unused numbers do not
      pile up). The next RIS of the same year takes its running number with
      its own month: a not-used `2026-10-024` becomes `2026-11-024` on a
      November RIS, because only the running number orders the year, so the
      month problem above does not arise. A fuel withdrawal takes it by
      itself; "Reserve next number" offers it first, already chosen, with
      "Take a new number" beside it. The not-used reservation is deleted
      then, with its reason, so the list never shows a number twice. A newer
      number, or a new year, means a new number: a not-used `2026-12-031`
      is never given out in January.
   6. **The counts start from the last numbers used before EMS, set once at
      go-live** (decided by the owner, 17 November 2026). When EMS goes live
      partway through a year, the forms of that year are already numbered,
      so GSU or the super-admin types, for each of the four counts (RIS, WS, DTT,
      and control number), the first number that EMS gives out: the one after
      the last number that was used before EMS, or 1 when none was used that
      year. The dialog asks for the first number rather than the last one
      used, because the owner typed 1 expecting the count to start at 001
      (17 November 2026); the count row stores one below what was typed.
      Until this is done, a save that needs a number is refused and says to
      ask GSU (GSU holds the step too, decided by the owner, 17 November
      2026, because the counts are GSU's); otherwise the first withdrawal would start the
      count at 001 by itself and lock it. The step happens once: the check is
      whether EMS has ever given out a number, not whether the year has
      started, so every later January starts at 001 by itself, with no step.
      Once set, the numbers are locked. No separate setting records the
      step: setting the numbers writes the count rows themselves, so the
      counts table already shows it, and a second record could disagree with
      it (the owner suggested the config table; the counts table was chosen
      instead, 17 November 2026). The past numbers are not entered into EMS:
      each would need its details, EMS would give them its own numbers, and
      the paper forms stay the record for the months before go-live. The
      screens never say "logbook", because there is no logbook once EMS is
      in use (told by the owner, 17 November 2026). Built on 17 November 2026 (MPP-136): the note
      "Starting numbers not set" shows on the Fuel and RIS Numbers pages to
      everyone until the step is done, with the button and the dialog for
      the holder of `fuel:set_starting_numbers`, GSU and the super-admin; saving a withdrawal or
      reserving an RIS number before it is refused.
   7. **Built on 17 November 2026** as the RIS Numbers page, `/ris-numbers`
      (`cards/ris-numbers.md`, MPP-135), which lists every RIS number, the
      reserved ones beside the fuel withdrawals', so the sequence shows with
      no gaps. Its keys are in the GSU template only; the Admin template never
      gets them (decided by the owner, 17 November 2026).
7. **A withdrawal counts down the allocation of the unit of the person who
   saves it** (decided by the owner, 22 October 2026). Staff of a division,
   section, or unit have no picker for it, so they can only use their own
   allocation. When Planning uses CDS's fuel, a CDS staff member saves the
   withdrawal, so CDS always knows, and the withdrawal has no "used by" field
   (this answers MPP-113). **GSU is the exception:** a GSU staff member picks
   the division, section, or unit whose allocation the withdrawal counts down,
   labelled "Office" on screen, because GSU controls all the fuel. GSU still
   needs that unit's agreement first, and EMS records which GSU staff member
   saved the withdrawal.
8. **No office's own control number** (decided by the user, 22 October 2026).
   EMS does not produce the control number that each division, section, or
   unit writes on its own slips, such as `GSU-2026-06-002`. This is not the
   control number of a transaction (point 1), which EMS does give out.
   Without its prefix the number is not unique, and the prefix is the
   division, section, or unit's abbreviation, which can be changed on the
   Organizational Structure page. A slip is known by its own WS number, and
   the list of one unit's withdrawals, in order, comes from filtering the
   issuance page by that unit. **Reconsidered on 26 October 2026 and kept.**
   Producing it would be possible: a count per office (by the office's ID, so
   a renamed office carries on its count), with the full number saved as
   printed so that a later rename leaves old slips unchanged. The owner still
   prefers to leave it out.
   **Changed on 27 October 2026:** the issuance list shows each office's own
   count for the year as a small badge beside the control number (layout 1b of the
   Claude Design "Withdrawals Table"). The count is worked out when the list
   is shown, for viewing only: it is never saved in the database, never
   printed, and it starts over every January (decided by the owner). It
   counts every transaction of that office, trips with no withdrawal
   included, as if the list were filtered by the office, in the order in
   which they were entered in EMS. A cancelled withdrawal is still counted,
   because it is still one of the office's transactions. Only GSU or an admin can move a withdrawal to another office,
   which is allowed while its PO is open, and the move changes the counts of
   both offices (told by the owner, 27 October 2026).
9. **The status of a withdrawal or a trip** (decided by the owner, 27 October 2026). Before
   this, nothing changed a withdrawal after it was approved, so EMS could not
   tell a finished withdrawal from one still at the station.

   | Status | Colour | Meaning |
   | --- | --- | --- |
   | Waiting for approval | gray | Entered in EMS and printed; GSU has not signed the slip yet. |
   | Out | blue | GSU signed the slip and it was marked approved in EMS (MPP-81); the driver takes it to the gas station. |
   | Complete | green | The slip is back, a GSU user typed the supplier's numbers and pressed **Complete**, and nothing is missing. |
   | Incomplete | yellow | A GSU user pressed **Complete**, but the DTT's tank balances are still missing. |
   | Cancelled | destructive | The withdrawal never happened. |

   1. **Complete is a button, and only GSU presses it.** A GSU user first
      types the unit price and the amount or the actual litres (point 3 of
      "How POs and withdrawal slips work"), then presses Complete. The
      withdrawal does not become complete by itself. Only GSU completes,
      because every slip and every DTT goes back to GSU on paper, even a DTT
      with no withdrawal slip, and GSU checks the details in EMS against the
      paper before pressing Complete (told by the owner, 27 October 2026).
   2. **Complete or Incomplete is decided when Complete is pressed.** When the
      withdrawal has a DTT and its tank balances are missing, it becomes
      Incomplete. A withdrawal with no DTT, such as one for a generator or a
      grass cutter, has no tank balances, so it becomes Complete. Saving with
      missing tank balances is allowed (confirmed by the owner, 27 October
      2026), which matches the warnings of the Close check (point 7 of "How
      POs and withdrawal slips work").
   3. **Who may type the tank balances:** the person who entered the record,
      and GSU. Typing them is not limited to GSU (told by the owner,
      27 October 2026).
   4. **From Incomplete to Complete.** Once the missing tank balances are
      typed in, GSU checks them against the paper DTT and presses Complete
      again. On an Incomplete withdrawal, pressing Complete while any tank
      balance is still empty saves nothing and points to the empty fields, so
      the second press always ends in Complete. The withdrawal never turns
      green by itself, because a balance typed in later must still be checked
      against the paper (decided by the owner, 27 October 2026).
   5. **A trip with a DTT and no withdrawal slip gets statuses too,** both a
      trip-only trip and a reimbursed trip, because every DTT goes back to GSU
      (told by the owner, 27 October 2026). There is no slip for GSU to sign,
      so the trip starts as Out, skipping Waiting for approval, and GSU
      presses Complete after checking the paper DTT.
   6. **A trip with no withdrawal slip is never Incomplete,** whether it is a
      trip-only trip or a reimbursed trip. It has no withdrawal slip, so no
      supplier's numbers come back later, and its DTT is submitted with every
      detail at once. Complete is therefore refused until every detail is filled in, including the
      tank balances, and on a reimbursed trip the litres on the "purchased
      during trip" line (decided by the owner, 27 October 2026).
   7. **The Complete button is never disabled.** When something is missing,
      pressing it saves nothing, and the form points to the empty field. This
      follows the form-submit rule of
      `.claude/skills/unavailable-actions/SKILL.md` (told by the owner,
      27 October 2026).
   8. **Cancelled is the word,** not "not used"; "not used" stays the word for
      a reserved RIS number (point 6.5). A cancelled withdrawal keeps its WS,
      RIS, and DTT numbers, and they are never given to another withdrawal,
      for the reason in point 6.5.
10. **How the list shows the POs** (decided by the owner, 30 October 2026).
    The list follows GSU's logbook (point 6 of "GSU's fuel logbook"): it has
    no PO column, and a PO row with the PO's details goes where the PO's
    withdrawals start.
    1. **Only a withdrawal has a PO.** A trip-only trip and a reimbursed trip
       save no PO in the database, because they take nothing off a PO (item 3
       of "What a closed PO locks"). They still have a control number
       (point 1) and sit among the withdrawals by their date.
    2. **The PO rows show only while the list is sorted by date,** then by
       the order of entry, which is the list's own order (point 1). Sorted by
       any other column, a PO row would land among rows that have nothing to
       do with it, so the PO rows are hidden until the list is sorted by date
       again.
    3. **Where two POs mix.** Several POs can be open at once, and each slip
       goes to the oldest PO where its office still has an allocation of that
       fuel (point 4 of "How POs and withdrawal slips work"). So one office's
       slips can move to the new PO while another office's slips still use the
       old one. EMS finds this from the PO saved on each withdrawal: when a
       PO's first withdrawal comes before an older PO's last withdrawal, the
       rows from the one to the other are the mixed part. The mixed part gets
       a PO row of its own, with extra details and a colour legend on its
       right. Inside it, each withdrawal shows its PO number under the file
       date, with a coloured dot that the legend explains, and a trip shows
       none. Outside a mixed part no row shows a PO number, as in the
       logbook. The same check works when three POs mix.

       ```
       [PO-001]
       Mar 2   CN-26-010
       Mar 5   CN-26-011
       [PO-001 and PO-002 mixed]                    legend
       Mar 9   CN-26-012   ● PO-002
       Mar 10  CN-26-013   (trip only: no PO number)
       Mar 11  CN-26-014   ● PO-001
       [remaining PO-002]
       Mar 12  CN-26-015
       ```
    4. **No switch to open a PO** (proposed by the owner and dropped,
       30 October 2026). The idea was that GSU opens a PO after adding it, so
       that the list can tell when POs mix. But open means "not paid yet"
       (point 7 of "How POs and withdrawal slips work"), so a used-up PO stays
       open until the supplier is paid. Counting the open POs would then show
       a mixed part even when every new withdrawal is already on the new PO.
       The PO saved on each withdrawal shows the real mixing instead.
    5. **Still to discuss:** what the extra details on the PO row and the
       legend look like, and the colours of the dots; the owner's sample used
       red and blue, which are already the colours of Cancelled and Out
       (point 9). Also not decided: the owner's idea of 29 October 2026 that
       the list shows only the transactions of open POs.
