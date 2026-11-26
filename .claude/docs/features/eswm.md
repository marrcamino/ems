# ESWM (Ecological Solid Waste Management)

What EMS records for ESWM, and why. The first plan, of cleanup drives, was
approved by the owner on 25 November 2026 ("ok, build it") without a form or
data from the office, and came from a web search of that day, listed under
"What the research found". On 26 November 2026 the owner shared the office's
own workbook, and approved recording ESWM by month and by type, as the
workbook does ("yes, record the two blocks by month", then "go"); see "The
office's workbook". The plan is in `tmp/eswm-plan/` (`06-workbook.md` for
this change).

## What the office does

1. The ESWM Focal Person enters the waste each month, and the data goes
   straight to the EMS Focal Person. Nobody approves it or receives it in
   between (project brief, "The process at a glance").
2. Each month the office weighs the waste from its coastal cleanups and the
   waste from its own bins, sorted by type (the workbook; this answered
   MPP-148).
3. It is not known whether the ESWM Focal Person also types the office's own
   waste, or someone else does (MPP-160).

## What EMS does

1. **Kilos by type, each month, in two blocks.** **Coastal cleanup** has
   Recyclable, Residual, Non-biodegradable, and Biodegradable. **Office
   waste** has Non-biodegradable, Biodegradable, Residual, and Special, each
   shown with the workbook's examples, so the person sorting knows where each
   thing goes. The lists are in code (`eswm/eswm-waste.ts`), not a table.
2. **An empty type means "not weighed", and 0 means "none".** The page and
   the Summary show "—" for an empty type, and a block's total counts the
   types that were weighed.
3. **One record for the whole PENRO.** There is no office picker and no
   office column, because one person enters it for the office.
4. **One person records both blocks** with `eswm:manage`, until MPP-160 is
   answered (owner, 26 November 2026: the flowchart names the ESWM Focal
   Person, and the workbook keeps both blocks on one sheet).
5. **Submitted by month.** A month can be submitted only once it is over, for
   the same reason as on Paper (`paper-consumption.md`), but its figures can
   be typed during the month. A month with nothing weighed is submitted too,
   as none recorded, so that the EMS Focal Person can tell "none" from "not
   entered yet".
6. **A submitted month can still be corrected,** because nobody receives it
   yet. It locks once the EMS Focal Person's step is built and receives it.
7. **No print and no signers yet,** because nobody has seen an ESWM form.
8. **Keys:** `eswm:view` opens the page and the Summary (the EMS Focal Person
   needs them), and `eswm:manage` records the kilos and submits.
9. **A year summary,** like the workbook: two bars per month, Coastal cleanup
   and Office waste side by side, and a table with each block's total over
   its four types, one column per month, with the year's totals and each
   month's status. It gives the figures over time that ISO 14001 asks for
   (clause 9.1).

## Left out until the office confirms it

1. **The details of each cleanup:** date, place, sacks, participants, partner
   groups, and where the garbage went. EMS recorded cleanup drives from 25 to
   26 November 2026 (never with real data), but the workbook keeps only the
   month's kilos by type. The "monthly reports" in the office's Drive folder
   may hold the details.
2. **The International Coastal Cleanup data,** which DENR Special Order
   2024-573 sends to the Coastal and Marine Division on the Ocean Conservancy
   forms. It is another report, with item counts.

## The office's workbook

`tmp/2026 EMS DATA.xlsx`, sheet "ESWM", shared by the owner and read on
26 November 2026.

1. **"MONTHLY WASTE COLLECTION (KG.)",** one column per month, with a TOTAL
   line over both blocks and a link to a Drive folder headed "PLEASE UPLOAD
   FILE HERE (MONTHLY REPORTS)".
2. **COASTAL:** Recyclable, Residual, Non-biodegradable, and Biodegradable.
   January to March 2026 are filled in; January is 26 / 65 / 46 / 50, 187 kg.
   April onwards is empty.
3. **OFFICE:** Non-biodegradable ("Dile Malata": wrappers, plastics, cans,
   metals), Degradable ("Malata": paper, boxes, food leftovers), Residual
   (toilet waste, dirty cellophane, broken ceramics, glass), and Special
   (busted bulbs, paint, thinner, insecticides, surgical masks and gloves).
   January to May 2026 are filled in; January is 9 / 6 / 8 / 11, 34 kg.
   Special is empty in April and May. EMS calls Degradable "Biodegradable",
   the same word as the coastal block.
4. **Kilos with at most one decimal** (20.7, 69.5). No dates, places, sacks,
   or participants.
5. **Charts.** The "graph" sheet's "Monthly Waste Collection Trend (kgs.)"
   puts 24 months on one axis, coastal January to December, then office
   January to December. A picture on the ESWM sheet shows every type in every
   month. The Summary shows the two blocks side by side for each month
   instead, with the types in its table.
6. **In EMS:** January to May 2026 were entered from the sheet through the
   page on 26 November 2026 (owner, "go ahead"), as Open months. The empty
   cells stay empty, including Special in April and May. The Summary gives
   682.20 kg for the year, the same as the sheet.

## What the research found (25 November 2026)

Several DENR and EMB pages refused automated access; "(quote)" marks a fact
taken from a search engine's quote of the page.

1. RA 9003 Sec. 22 marks bins "compostable", "non-recyclable", "recyclable",
   and "special waste"; the law does not define "biodegradable" or
   "residual". Sec. 3(pp) lists special waste: paint, thinner, batteries,
   spray cans, electronics, oil, and tyres.
   <https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html>
2. The IRR (Rule XXI Sec. 3(e)) asks government offices to run a waste
   programme at their workplaces, and only waste facilities to keep weights
   (Rule XI Sec. 1(d)). EO 774 (2008) says the same for Cabinet offices.
   <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/5/20994>
3. DENR cleanup reports give the date, place, participants, sacks, and kilos.
   DENR Caraga, 16–19 September 2026: 12 sites including San Jose, Dinagat
   Islands; 1,458 volunteers; 761 sacks; 6,027.92 kg.
   <https://mindanaodailynews.com/denr-caraga-removes-over-6-tons-of-waste-from-10-km-coastline/>
4. Some reports give only sacks (PENRO Aklan, 291 sacks, quote) or only kilos
   (PENRO Siquijor, 201 kg).
   <https://www.sunstar.com.ph/zamboanga/denr-conducts-coastal-clean-up-scubasurero-in-2-zamboanga-peninsula-areas>
5. EMB Caraga's 2025 coastal cleanup split its 376.3 kg by waste type (quote).
   <https://caraga.emb.gov.ph/emb-caraga-leads-coastal-cleanup-2025/>
6. EMB Region I sorted and weighed its own office waste once, in July 2022:
   24.64 kg (quote, r1.emb.gov.ph).
7. DENR Special Order 2024-573: every DENR office sends its International
   Coastal Cleanup data to the Coastal and Marine Division within 15 days
   (quote). <https://apidb.denr.gov.ph/infores/uploads/SO-2024-573.pdf>
8. In other PENROs (Batanes, 2019), the "ESWM Focal Person" monitors the
   LGUs' waste facilities (quote). In this office the flowchart gives the
   title to the person who enters the ESWM data, and the flowchart wins.
