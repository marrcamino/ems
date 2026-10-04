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
2026. Its columns are: Date, Control No. / Withdrawal Slip No., Gasoline
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
