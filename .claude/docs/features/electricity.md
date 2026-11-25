# Electricity

What EMS records for electricity, and why. The plan was approved by the owner
on 25 November 2026 ("build it"), with "don't know yet" on the four questions
about the office (MPP-151 to MPP-154). The same day, the owner shared the
office's own workbook, and approved recording the electricity by building
("go"), as the workbook does; see "The office's workbook". Nobody has seen the
office's electricity bill. Everything below that is not from the owner, the
project brief, or the workbook comes from a web search of that day, listed
under "What the research found". The full plan, with the mockup, is in
`tmp/electricity-plan/`.

## What the office does

1. A role of its own enters each building's monthly electricity use; GSU has
   no access to it for now (owner, 25 November 2026). The data goes straight
   to the GHG Focal Person. Nobody approves it or receives it in between
   (project brief, "The process at a glance").
2. The GHG Focal Person builds the GHG emission report from fuel, electricity,
   and air travel (project brief).
3. The system serves one office, PENRO Dinagat Islands (project brief).

## What EMS does

1. **kWh only, by building.** Each entry is one building's whole number of
   kWh for the month, with an optional note for a remark such as "with
   constructions (exit ladder)". 0 is allowed, for a building that used
   nothing that month.
2. **One record for the whole PENRO,** with no office picker. The buildings
   are a list kept on the Electricity › Buildings page, starting with the
   workbook's four. A building is renamed or made inactive, never deleted. A
   new name shows on its past entries too, because it corrects the name.
3. **One entry for each building in a month.** A second one is refused, so the
   same bill cannot be entered twice; a building with two meters goes on the
   list twice, such as "PENRO DI Office – annex meter".
4. **Only months that are over.** The page opens on last month, and the
   current month cannot be entered or submitted. A month's electricity is
   complete only once the month is over, and GEMP asks for it after the month.
5. **An entry has no date.** It belongs to the month shown on the page, which
   the person recording picks; EMS does not split a bill that covers parts of two months. An
   entry in the wrong month is removed and added again.
6. **Submitted by month.** A month with no entry is submitted too, as "none
   recorded", never as 0: an office always uses some electricity, so an empty
   month means that the figure is missing.
7. **A submitted month can still be corrected,** because nobody receives it
   yet. It locks once the GHG Focal Person's step is built and receives it.
8. **Remove** deletes an entry, and is for a typing mistake or a duplicate
   only.
9. **Keys:** `electricity:view` opens the page, the Summary, and the
   Buildings page (the GHG Focal Person needs them), and `electricity:manage`
   adds, edits, removes, and submits, and keeps the building list. The pages
   follow the keys, not a role name, so giving the keys to GSU later needs no
   code change.
10. **A year summary,** like the workbook: one bar per month, split into a
    coloured part for each building, and a table with one line per building
    and one column per month, with the totals and each month's status. A
    building keeps its colour by the order it was added. The year's total and
    its average a month count the months with an entry only.
11. **No CO2 figure on these pages.** They record electricity only. The CO2 is
    the GHG report's (MPP-89), with the GHG Focal Person's own method, in
    "The office's workbook".

## Left out until the office confirms it

1. **The bill's figures:** the reading dates, the two meter readings, the
   multiplier, and the amount in pesos. It is not known whether the figures are copied from
   the DIELCO bill (MPP-151). The design is in
   `tmp/electricity-plan/05-not-built.md`, part 1.
2. **GEMP's monthly report,** with the building's area and occupants and a
   baseline. It is not known whether the office sends it (MPP-153).
3. **Which month a bill goes under** (MPP-154). The person recording chooses it by the month they
   opens.
4. **A target, a baseline, the CO2, electricity per person, and an inventory of
   air conditioners and lighting.** The reasons are in
   `tmp/electricity-plan/05-not-built.md`.

## The office's workbook

`tmp/2026 EMS DATA.xlsx`, sheet "Electricity", shared by the owner and read on
25 November 2026, kept by the GHG Focal Person.

1. **Four buildings, each with its own kWh every month:** PENRO DI Office,
   Nursery, Watch Tower, and Info Center. January to June 2026 are filled in;
   January is 4,811 / 36 / 31 / 149, 5,027 kWh in all. These figures are not in
   EMS (owner: not entered).
2. **kWh only, in whole numbers,** with a link to a Drive folder of "electric
   bills and reports". No readings and no amounts. EMS leaves the link out,
   because it runs offline.
3. **Remarks** sit beside the month they explain, such as "Increase no. of
   check in @ Hostel & more holidays last January" under February 2026, and
   "with constructions (exit ladder)" under March 2026. In EMS they go in the
   entry's note.
4. **The CO2:** each building's kWh × 0.8522 tCO2/MWh, which the sheet calls
   the "Grid Emission Factor" (close to the DOE's Mindanao figure, 0.8519, in
   "What the research found", 7). The scope table on the "Air travel" sheet,
   rows 58–65, counts it as Scope 2.
5. **The system loss:** 5.12%, worked out as MWh × 0.0512 ÷ (1 − 0.0512) ×
   0.8522 and counted with air travel as "Scope 3 – Business Air Travel &
   System Loss" ("Air travel" sheet, rows 38–45).
6. **Each building's tCO2 for each year** from 2016 (the office), 2018
   (nursery), and 2020 (tower and info center) to 2025: a possible baseline.
7. **Charts:** the total kWh by month, the kWh by month for each building, the
   tCO2 by month for each building and in all, and the tCO2 by year for each
   building, with a line of the yearly total. The two kWh charts are on the
   Summary as one chart; the tCO2 ones belong to the GHG report.
8. **Not yet known:** the CO2 table calls the tower "Look Out Tower", and the
   kWh table "Watch Tower". EMS starts with "Watch Tower"; whether they are the
   same building is asked in Linear.

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
   proposed. Even so, the office's workbook uses 0.8522 tCO2/MWh, close to the
   Mindanao grid's figure (see "The office's workbook").
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
