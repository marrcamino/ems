# Air Travel

What EMS records for air travel, and why. The plan was approved by the owner on
25 November 2026 ("build it"), with "don't know yet" on the four questions about
the office (MPP-155 to MPP-158), and a required travel order number added at
the owner's request. On the same day the owner shared the office's own
workbook, `tmp/2026 EMS DATA.xlsx`, whose "Air travel" sheet answered MPP-155
and MPP-157 and led to the round trip tick and the destination. Everything
below that is not from the owner or the project brief comes from a web search
of that day, listed under "What the research found". The full plan, with the
mockup, is in `tmp/air-travel-plan/`.

## What the office does

1. The Finance office enters the employees' air travel, and the data goes
   straight to the GHG Focal Person. Nobody approves it or receives it in
   between (project brief, "The process at a glance").
2. **Every official flight has a travel order,** so every flight is recorded
   (owner, 25 November 2026).
3. **Finance's own sheet** ("Air travel" in `tmp/2026 EMS DATA.xlsx`) has one
   line per person and flight: the month, the name, the destination (such as
   "DENR Central Office"), From and To as city names, a "Vice versa" tick for
   a round trip, and ticks that the approved travel order and the boarding
   pass are attached, with a link to upload them. Its routes are all inside
   the Philippines.
4. The system serves one office, PENRO Dinagat Islands (project brief).

## What EMS does

1. **One entry is one person's flight, from one place to the next.** Each
   staff member has a travel order of their own, such as "PDI 2025-02-03012"
   (owner, 25 November 2026, with a sample travel order from DENR Caraga's
   Online Travel Order System), so two staff on the same flight are two
   entries, as on Finance's sheet. A trip from
   Surigao to Manila through Cebu is two flights. A **Round trip** tick, as
   Finance's "Vice versa", counts the flight back as a second flight, under
   the same month; a return by another route is its own entry.
2. **A flight has a date, a traveller, a travel order number, From and To,
   the distance, the round trip tick, a destination, and a note.** The travel
   order number is required; the destination and the note are optional.
3. **Distances come from the Routes page** (`/air-travel/routes`, sub-link
   **Routes**), so every flight on a route has the same, checked figure, and
   anyone can see it (owner, 25 November 2026: "I want an accurate data").
   - A route is two places and its distance in whole km, one way, with an
     optional **Source** (where the distance came from). Both directions are
     one route; the places are stored in alphabetical order.
   - Whoever holds `air_travel:manage` adds and corrects routes; anyone with
     `air_travel:view` sees them, with the number of flights on each.
   - A route is never deleted, only made inactive (with Undo), and the list
     shows Active, Inactive, or All. A route in use keeps its places; a
     different pair is a new route.
   - It started with the five routes of Finance's sheet that have a published
     straight-line distance: Cebu – Surigao 176, Manila – Surigao 716,
     Butuan – Cebu 223, Butuan – Manila 784, Cebu – Manila 565
     (greatcirclemapper.net).
   - The same day, a fixed list of 44 airports with worked-out distances, and
     then typed places and distances, were tried and replaced by this page.
4. **In the flight dialog, From and To are picked from the routes' places,**
   and the distance fills in from the route; it cannot be typed. A pair with
   no route shows "No route between Butuan and Iloilo yet. Add it on the
   Routes page.", and the server refuses it with the same reason. Each flight
   keeps a copy of its places and distance, so a later correction to a route
   does not change a month already submitted; to apply it, the flight is
   edited and saved again. **Kilometers flown** counts each way: a 176 km
   flight makes 352 km as a round trip.
5. **The traveller is picked from the active staff.** Each flight keeps the
   version of the person's name valid on the flight date, as Fuel's driver
   does, so it counts as a document in `countDocumentsUsingVersions`. A person
   who has left stays on the flights already entered.
6. **A flight goes under the month of its date.** The page opens on the
   current month, a flight can be entered up to today, and a month can be
   submitted once it is over. A date in another month moves the flight there.
7. **An empty month is submitted as "no flights",** and the Summary shows it as
   0. An open month with no flight shows "—".
8. **A submitted month can still be corrected,** because nobody receives it
   yet. It locks once the GHG Focal Person's step is built.
9. **Remove** deletes a flight, and is for a typing mistake
   or a duplicate only.
10. **Keys:** `air_travel:view` opens the page, the Summary, and Routes (the GHG Focal
    Person needs it), and `air_travel:manage` adds, edits, removes, and
    submits.
11. **A year summary** shows the kilometers flown per month as bars, and a
    table with the flights and kilometers flown of each month,
    with a Total line and no average.
12. **No class, no fare, and no CO2.** The CO2 factor and its allowance for
    detours are the GHG Focal Person's choice, in the GHG feature (MPP-89).

## Left out until the office confirms it

1. **Flights abroad.** None so far (MPP-155, answered by the workbook).
2. **A mark for a flight paid by someone else,** if the GHG report leaves such
   flights out (MPP-156). Every flight is recorded either way.
3. **The class of seat** (MPP-158).
4. **The ticks that the travel order and the boarding pass are attached, and
   the upload link.** EMS keeps no files yet; the travel order number traces
   each flight to its papers.
5. **Travellers who are not staff, the fare, the boat to Surigao, a printed
   report, and the Itinerary of Travel number.** The reasons are in
   `tmp/air-travel-plan/05-not-built.md`.

## What the research found (25 November 2026)

"(quote)" marks a fact taken from a search engine's quote of the page. The
DENR archive (`apidb.denr.gov.ph`) cannot be opened from outside DENR. The full
list, with what each fact was used for, is in
`tmp/air-travel-plan/01-research.md`.

1. The GHG Protocol's distance-based method needs the kilometers of each
   traveller; a connecting flight is counted leg by leg (ICAO).
   <https://ghgprotocol.org/sites/default/files/2022-12/Chapter6.pdf>
   <https://www.icao.int/sites/default/files/environmental-protection/ENVtools/SuportingMaterials/ICEC_Methodology_Passagers_v13_Final.pdf>
2. Factor sets add an allowance to the straight-line distance: 8% in the UK,
   50 to 100 km at ICAO.
   <https://assets.publishing.service.gov.uk/media/6a2940543b15d05a7ce3202e/2026-GHG-conversion-factors-methodology-report.pdf>
3. EO 77 (2019) names no class of seat inside the Philippines; DENR MC 2024-04
   allows only economy flights (quote).
   <https://legaldex.com/laws/prescribing-rules-and-regulations-and-rates-of-expenses-and-allowances>
4. COA Circular 2023-004: the trip's papers (travel order, Itinerary of Travel,
   tickets, boarding passes) go to COA through the Accounting unit.
   <https://rgao.upm.edu.ph/media/2024/02/COA-CIRCULAR-NO.-2023-004-June-14-2023_UPDATED-Documentary-Requirements-for-Common-Govt-Transactions.pdf>
5. Dinagat has no airport. Surigao flies only to Cebu since 30 March 2025;
   Butuan flies to Manila and Cebu.
   <https://en.wikipedia.org/wiki/Surigao_Airport>
   <https://avgeek.ph/?p=9535>
6. The straight-line distances between the airports staff use: Surigao–Manila
   716 km, Surigao–Cebu 176, Butuan–Manila 784, Butuan–Cebu 223, Cebu–Manila
   565.
   <https://www.greatcirclemapper.net/en/great-circle-mapper.html?route=SUG-CEB>
7. Romblon State University records each traveller's origin, destination, and
   one way or round trip; universities abroad count a flight for whoever pays
   for it.
   <https://www.rsu.edu.ph/admin/uploads/policy_docs/doc_1770786583_698c0f17937eb.pdf>
