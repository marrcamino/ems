# Electricity

What EMS records for electricity, and why. The plan was approved by the owner
on 25 November 2026 ("build it"), with "don't know yet" on the four questions
about the office (MPP-151 to MPP-154). Nobody has seen the office's
electricity bill or form. Everything below that is not from the owner or the
project brief comes from a web search of that day, listed under "What the
research found". The full plan, with the mockup, is in `tmp/electricity-plan/`.

## What the office does

1. GSU enters the office's monthly electricity use, and the data goes straight
   to the GHG Focal Person. Nobody approves it or receives it in between
   (project brief, "The process at a glance").
2. The GHG Focal Person builds the GHG emission report from fuel, electricity,
   and air travel (project brief).
3. The system serves one office, PENRO Dinagat Islands (project brief).

## What EMS does

1. **kWh only.** Each entry is a whole number of kWh, with an optional note
   (where the figure came from, or which meter). 0 is allowed, for a meter
   that used nothing that month.
2. **One record for the whole PENRO,** with no office picker.
3. **Only months that are over.** The page opens on last month, and the
   current month cannot be entered or submitted. A month's electricity is
   complete only once the month is over, and GEMP asks for it after the month.
4. **An entry has no date.** It belongs to the month shown on the page, which
   GSU picks; EMS does not split a bill that covers parts of two months. An
   entry in the wrong month is removed and added again.
5. **Submitted by month.** A month with no entry is submitted too, as "none
   recorded", never as 0: an office always uses some electricity, so an empty
   month means that the figure is missing.
6. **A submitted month can still be corrected,** because nobody receives it
   yet. It locks once the GHG Focal Person's step is built and receives it.
7. **Remove** deletes an entry, and is for a typing mistake or a duplicate
   only.
8. **Keys:** `electricity:view` opens the page and the Summary (the GHG Focal
   Person needs it), and `electricity:manage` adds, edits, removes, and
   submits.
9. **A year summary** shows the kWh per month as bars, and a table with the
   year's total and its average a month, counted over the months with an entry
   only.
10. **No CO2 figure.** The pages record electricity only. The GHG Focal Person
    picks the emission factor in the GHG feature (MPP-89), because Dinagat runs
    on its own diesel plants and no official factor covers it.

## Left out until the office confirms it

1. **The bill's figures:** the reading dates, the two meter readings, the
   multiplier, and the amount in pesos. It is not known whether GSU copies from
   the DIELCO bill (MPP-151). The design is in
   `tmp/electricity-plan/05-not-built.md`, part 1.
2. **A list of the office's meters.** It is not known how many the office has
   (MPP-152); for now, each meter is a separate entry named in its note.
3. **GEMP's monthly report,** with the building's area and occupants and a
   baseline. It is not known whether the office sends it (MPP-153).
4. **Which month a bill goes under** (MPP-154). GSU chooses it by the month it
   opens.
5. **A target, a baseline, the CO2, electricity per person, and an inventory of
   air conditioners and lighting.** The reasons are in
   `tmp/electricity-plan/05-not-built.md`.

## MPP-78: air conditioners and lighting in Fuel › Assets

The research points to no (comment on MPP-78, 25 November 2026). GEMP counts
air conditioners, lamps, and office equipment by type and quantity, for each
office, with no number for each unit, while the asset list records one
numbered unit at a time. If the inventory is ever needed, it gets its own page.

## What the research found (25 November 2026)

"(quote)" marks a fact taken from a search engine's quote of the page. The
DENR archive (`apidb.denr.gov.ph`) cannot be opened from outside DENR, and most
`doe.gov.ph` PDFs are gone. The full list, with what each fact was used for, is
in `tmp/electricity-plan/01-research.md`.

1. GEMP's current monthly report (2020) records, for each building, the
   month's kWh "from the bill", with the building's area, air-conditioned area,
   and occupants and a 2015 baseline. It has no peso column, and it is due 15
   days after the month.
   <https://www.pe2.org/sites/default/files/ee-policies/iaeecc/IAEECC-Resolution-01-s2020.pdf>
   <https://www.pe2.org/sites/default/files/ee-policies/iaeecc/IAEECC-Resolution-05-s2022-GEMP-Guidelines.pdf>
2. A field office sends it only if it has its own electricity account, through
   an EEC focal person (same source as 1).
3. GEMP's online system works per meter or account, with the kWh, the pesos,
   and a scan of the bill each month, and counts air conditioners and lamps by
   type and quantity (GEMP Online System User Manual 1.0, Annex B of AO 15,
   2024; Wayback Machine copy).
   <https://legacy.doe.gov.ph/sites/default/files/pdf/issuances/AO15%20Annexes.pdf>
4. DENR MEMO-2005-307 asked DENR offices for the GEMP monthly electricity
   report in 2005 (quote).
   <https://apidb.denr.gov.ph/infores/uploads/MEMO-2005-307.pdf>
5. Dinagat is served by DIELCO and is off the grid: the "Dinagat Grid" is made
   up of NPC diesel plants and the barge PB 116, and a link to Mindanao is only
   proposed.
   <https://www.napocor.gov.ph/wp-content/uploads/Operations/NPC_Missionary_Electrification_Plan_2025-2029.pdf>
   <https://www.ngcp.ph/Attachment-Uploads/TDP%202025-2050%20REPORT-2025-09-25-09-29-14.pdf>
6. A billing month runs from one meter reading to the next, 28 to 31 days
   (ERC Magna Carta for Residential Electricity Consumers, Art. 2).
   <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/10/39112>
7. The DOE's grid emission factors for 2022–2024 are 0.8519 tCO2/MWh for the
   Mindanao grid's operating margin and 0.7310 for Luzon-Visayas. They count
   only plants on the grid, and no factor for an off-grid diesel system was
   found. <https://doe.gov.ph/national-grid-emission-factor>
8. No DENR or CCC order asks a DENR office for a GHG inventory of its own
   operations, and no template for it was found. EO 174 (2014) covers the
   national inventory only.
   <https://lawphil.net/executive/execord/eo2014/eo_174_2014.html>
9. COA pays electricity on the "Statement of Account/Bill" (COA Circular
   2023-004, item 6.1).
   <https://rgao.upm.edu.ph/media/2024/02/COA-CIRCULAR-NO.-2023-004-June-14-2023_UPDATED-Documentary-Requirements-for-Common-Govt-Transactions.pdf>
