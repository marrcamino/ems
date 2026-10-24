# Fuel assets

The vehicles, boats and machines the office fuels, and the dialog on
`/admin/fuel/assets` where an admin adds one. Asset types (motorcycle,
pick-up, generator) are managed in a dialog on the same page (`?asset-types`), which
replaced their own page on 24 September 2026; this document
is about the assets recorded under them.

## Where this stands

- Topic 1, the fields in the add asset dialog: decided.
- Scope (24 September 2026): the page holds office-owned assets only. The GSU
  question about assets the office does not own is no longer blocking; if GSU
  later wants them entered, they are added then.
- Topic 2, the database columns: decided.
- Built (24 September 2026): the `asset` table, the list on
  `/admin/fuel/assets`, and the add, edit and delete dialogs. Delete is
  allowed because no fuel record points at an asset yet; once one does, the
  server refuses and says to switch the asset off instead.

## Evidence — the GSU fuel logbook

A photo of the paper logbook GSU keeps, shared by the user on 14 September
2026. The logbook as a whole is described under "GSU's fuel logbook" in
[fuel-purchase-orders.md](fuel-purchase-orders.md); this section is about what
it shows of the assets. The photo's columns are: Date, Control No. / Withdrawal Slip No., Gasoline
(issued, balance, amount), Diesel (issued, balance, amount),
Vehicle/Equipment, Trip Ticket No., Remarks.

What the Vehicle/Equipment column shows:

1. Assets are written in whatever form the person chose: a model only
   ("D'MAX"), a plate only ("SLA 7074"), a model and a plate ("XR 538ZND"),
   a model and what looks like an LTO MV file number ("Honda XR
   1501-365306"), or a description ("pumpboat", "PA Patrol Boat").
2. The same machine is written differently on different rows ("XR 538ZND"
   and "538ZND"). A report cannot tell these apart, which is the reason assets
   are picked from a list in the system instead of typed.
3. Each asset stays in one fuel column: SLA 7074 is always diesel, the Honda
   XRs are always gasoline.
4. Boats carry no plate.
5. No property number appears anywhere.
6. Control numbers start with a section code (CDS, MES, GSU).

## Evidence — who owns the assets that receive fuel

Told by the user on 14 September 2026. These are situations the user has
seen happen, recorded as practice, not as a statement of what the rules allow.
"Office fuel" below means fuel taken from the office's own stock, which was
already bought, as opposed to money paid back to somebody.

1. **Owned by the office.** The normal case, with a property number. Fuel
   comes from office stock, and the Withdrawal Slip, Driver Trip Ticket and RIS
   are all prepared.
2. **Privately owned.** Known: when a personal vehicle was used for official
   travel, the owner was reimbursed. No Withdrawal Slip was approved by GSU and
   no office fuel was taken.
3. **Borrowed.** A GSU staff member mentioned that a borrowed banca (boat)
   sometimes gets office fuel. Possibly the "PA Patrol Boat" in the logbook;
   not confirmed.
4. **Rented.** A rented boat, with fuel possibly provided by the office.
   Not confirmed.

**Not blocking (24 September 2026).** The page is limited to office-owned
assets, so this question only matters if GSU later asks to enter others. The user is about 80% sure that an asset the
office does not own is paid through reimbursement and never takes office
fuel. Cases 3 and 4 are the reason for the remaining doubt. Also open: whether
such assets need to be entered into the system at all.

## Topic 1 — Fields in the add asset dialog

**Problem.** An asset record did not exist yet, so the dialog had nothing to
ask for.

**Decision (14 September 2026).** The user chose this layout:

```
┌─ Add asset ─────────────────────────────┐
│ Asset type     [ Pick-up           ▾ ]  │
│                Reads an odometer        │
│ Name           [ Toyota Hilux, blue   ] │
│ Plate number   [ SAB 1234             ] │
│ Property no.   [ 2019-06-0123         ] │
│ Fuel           ( ) Gasoline (•) Diesel  │
│                                         │
│ Active         [on]                     │
│                        [Cancel] [Save]  │
└─────────────────────────────────────────┘
```

| field | required | notes |
| --- | --- | --- |
| Asset type | yes | Lists active types only. The meter shown under it comes from the type and is not picked again here. |
| Name | yes | What people pick from the list when recording fuel. |
| Plate number | depends | Required when the asset type reads an odometer; optional for an hour meter or no meter, since a boat or generator has none. |
| Property no. | yes | Still open for assets the office does not own, see below. |
| Fuel | yes | Gasoline or diesel. Every asset on this page takes fuel; a machine with no fuel does not belong here. |
| Active | — | Switched off rather than deleted, the same as asset types. Labelled "In use" until 24 September 2026, renamed to match the Active / Inactive used on users, roles and org units. |

**Property number stays required.** On 24 September 2026 the user limited the
page to office-owned assets, every one of which has a property number. If a
borrowed or rented asset ever has to be entered, this rule is revisited then.
Small items, such as chainsaws and grass cutters, have property numbers too
(told by the user, 22 October 2026, MPP-110). The field takes any text, so a
number in another series still fits, and the rule stays.

**How the plate rule was chosen (14 September 2026).** Two ways were
considered: a separate "needs a plate number" setting on each asset type, or
reading it from the meter the type already has. The user chose the meter: an
asset whose type reads an odometer is a vehicle, and a vehicle needs a plate.
Nothing is added to the asset types page. Accepted drawback: a machine with an
hour meter that still carries a plate, such as a tractor, is not prompted for
one, though the field is still there to fill in.

Concerns raised once and set aside by the user: the logbook never shows a
property number.

## Topic 2 — Database columns for the asset table

**Problem.** Topic 1 decided the dialog fields, not the table.

**Proposed columns**, following `asset_type`: `asset_pk`, `asset_type_pk`
(points to `asset_type`), `asset_name`, `plate_number` (nullable; required for
an odometer type, checked by the server), `property_number` (required),
`fuel_type` (`gasoline` / `diesel`), `status` (`active` / `inactive`),
`created_at`, `updated_at`. The meter is not stored; it comes from the type.

**Decision (24 September 2026): which columns are unique.** Property number
and plate number are unique; the name is not. Several machines share a name
(three "Honda XR" motorcycles), and forcing a unique name would make GSU copy
the plate into it. Wherever an asset is picked from a list, such as the future
fuel withdrawal slip screen, each line shows the plate beside the name, or the
property number when there is no plate, so repeated names can still be told
apart. The user accepted that this makes each line wider.

## Topic 3 — The list on the assets page

**Decision (24 September 2026, revised 29 September 2026).** Columns: name,
type, plate, property no., fuel. The meter is not a column, since the type
implies it.

- Tabs Active / Inactive / All above the table, opening on Active and kept in
  the address (`?status=inactive`, `?status=all`). The Status column shows
  only on the All tab.
- A search box that matches name, plate number, and property number.
- Name and Type can be sorted by clicking the column header.
- Each row has an Edit button and a menu with Deactivate (or Activate) and
  Delete. Deactivating and activating apply at once, with an Undo toast.
- The table is a TanStack data table, the same as the users page, with a
  pager that appears only past 10 rows.
- The description line under the "Assets" heading was removed.

## Which assets the office fuels

1. **No published list exists.** DENR's procurement notices, disposal listings
   and the PENRO Dinagat site do not list the fleet; that lives in the property
   custodian's ledger. Fuel procurement is worded as covering "service vehicles
   and generator sets", sometimes with hired hauling in the same contract.
2. **The office's own kinds come from the withdrawal slip's printed lines,**
   split by fuel first:

   | Gasoline | Diesel |
   | --- | --- |
   | Motorcycle (+ plate no.) | Pick-up (+ plate no.) |
   | Grass cutter | Generator |
   | Others | Others |

   The asset types start from this list, because it is the words staff already
   use. A broader list, not checked against the office: service vehicles,
   motorcycles, hauling trucks, boats and outboard motors, heavy equipment,
   generator sets, chainsaws, grass cutters, water pumps and lawn mowers. Being
   an island, the office is likely to have more boats than most.

## Naming

1. **The record is called an "Asset",** the page "Assets", with one "Add asset"
   button where the type is the first field. Rejected: one button per type
   (unusable past about five types), "Property" (reads as land at DENR), and
   "Vehicles & Equipment" (breaks once air conditioners join).
2. **For assets the office does not own, the term is "non-office-owned".** The
   trip ticket's "RP vehicle" comes from the red government plates, so it only
   works for vehicles; for equipment, ownership shows in the property record
   instead. Still to ask GSU: the phrase they use, which would be preferred.

## Fuel type belongs to the asset

One engine cannot switch between gasoline and diesel: diesel does not ignite in
a gasoline engine, and gasoline destroys a diesel engine and its injection pump.
So the fuel is stored on each asset, and a withdrawal takes it from the asset;
nobody picks it, so nobody can pick it wrong. Two-stroke mix (chainsaws, grass
cutters) is still gasoline, and dual-fuel engines are rare enough in government
fleets that the system does not allow for them. If somebody says an asset "uses both", the unit was
probably replaced, or two assets share one name; ask which one.

The fuel is not stored on the asset type: a pick-up is diesel in this office's
fleet, but not by definition.

## Asset types

1. **A lookup table, not a list in the code** (`asset_type`), so GSU can add a
   kind the day it arrives. The name is `asset_type`, not `fuel_asset_type`,
   because GEMP's inventory also covers air conditioners and lighting.
2. **The meter is set on the type** (`meter_type`: odometer, hour meter or none),
   once per kind. Checks branch on the meter, not on the type: a pick-up and a
   dump truck both read an odometer, a genset and a backhoe both count hours.
3. **No "Others" type.** On paper, "Others" is an escape hatch for a kind the
   form does not print; with an editable list, GSU adds "Chainsaw" instead.
4. **Deleting and duplicate names** work as drawn in
   `tmp/asset-type-lifecycle.drawio`. A type that no asset uses is deleted; one
   in use cannot be, and the dialog offers to switch it off instead. Saving the
   name of a switched-off type offers to switch that type back on; the name of a
   type in use is refused.
5. **The hour meter is recorded, but no form asks for a reading yet.** No paper
   form has a line for engine hours, and neither the MFCR nor GEMP asks for them.
   Recording the meter on the type now means that adding an hour field later is
   only a form change. GSU keeps no generator logbook (22 October 2026, MPP-111),
   so the withdrawal form asks for no hour reading.

## Also undecided

1. **Whether an asset needs more states than active and inactive** (MPP-77).
   Government property has a formal unserviceable state, which starts the
   disposal process, and a disposed asset must stay in the table because old
   fuel records point at it. Suggested: active, inactive, unserviceable and
   disposed, with disposed assets left out of the withdrawal screen but kept in
   reports.
2. **Whether the asset list also serves electricity** (MPP-78). GEMP asks for an
   inventory of everything that uses energy, air conditioners and lighting
   included.
3. **Columns considered but not built:** make, model, serial number, the unit
   that holds the asset, the accountable officer, the acquisition date and cost,
   and for some types the MV file number, engine number, chassis number, chainsaw
   registration (RA 9175) and capacity. They would stay in the one table as
   nullable columns.

## Parked: assets the office does not own

The page holds office-owned assets only (24 September 2026). If GSU ever asks to
record others, these were the points raised, and the questions for GSU were:

1. Ownership is a separate thing from the asset type: owned, rented or borrowed.
   The fuel still counts as the office's consumption in the MFCR and as Scope 1
   in GHG, so leaving such assets out would understate both reports.
2. What decides whether something gets a row is whether it comes back, not who
   owns it: a borrowed backhoe used monthly deserves a row, a boat rented once
   does not.
3. Questions: is it the same rented boat every time; is its fuel given to the
   operator or paid back afterwards; what paper backs it; are other assets the
   office does not own being fuelled; is seized equipment ever fuelled; and does
   anyone say "RP" about equipment, or only about vehicles.
