# Water

What EMS records for water, and why. The plan was approved by the owner on
25 November 2026 ("build it"), with "don't know yet" on the two questions
about the office (the water bill and the meters). Nobody has seen the
office's water bill or form. Everything below that is not from the owner or
the project brief comes from a web search of that day, listed under "What the
research found". The full plan, with the mockup, is in `tmp/water-plan/`.

## What the office does

1. GSU enters the office's monthly water use, and the data goes straight to
   the EMS Focal Person. Nobody approves it or receives it in between
   (project brief, "The process at a glance").
2. The system serves one office, PENRO Dinagat Islands (project brief).

## What EMS does

1. **Cubic meters only.** Each entry is a whole number of cubic meters, with
   an optional note (where the figure came from, or which meter). 0 is
   allowed, for a month when no water came.
2. **One record for the whole PENRO,** with no office picker.
3. **Only months that are over.** The page opens on last month, and the
   current month cannot be entered or submitted, because water districts read
   the meter in the first days of the next month.
4. **An entry has no date.** It belongs to the month shown on the page. An
   entry in the wrong month is removed and added again.
5. **Submitted by month.** A month with no entry is submitted too, as "none
   recorded", never as 0: an office always uses some water, so an empty month
   means that the figure is missing.
6. **A submitted month can still be corrected,** because nobody receives it
   yet. It locks once the EMS Focal Person's step is built and receives it.
7. **Remove** deletes an entry, and is for a typing mistake or a duplicate
   only.
8. **Keys:** `water:view` opens the page and the Summary (the EMS Focal Person
   needs it), and `water:manage` adds, edits, removes, and submits.
9. **A year summary** shows the cubic meters per month as bars, and a table
   with the year's total and its average a month, counted over the months with
   an entry only.

## Left out until the office confirms it

1. **The water bill's figures:** the reading dates, the previous and present
   meter readings, and the amount in pesos. It is not known whether GSU copies
   from a bill. The design is in `tmp/water-plan/05-not-built.md`, part 1.
2. **A list of the office's meters.** It is not known how many the office has;
   for now, each meter is a separate entry named in its note.
3. **A target and a baseline, water per employee, and a comparison with the
   month before.** No source says what this office uses.

## What the research found (25 November 2026)

"(quote)" marks a fact taken from a search engine's quote of the page. The
DENR archive (`apidb.denr.gov.ph`) cannot be opened from outside DENR.

1. San Jose is served by the San Jose Dinagat Island Water District (SJDIWD),
   about 3,000 households (quote). Its rates and billing days are not
   published. On 3 September 2026 it suspended its whole supply after a fire
   near its watershed.
   <https://tribune.net.ph/2026/09/03/fire-forces-dinagat-water-shutdown-as-heat-index-hits-45-c>
2. A water district bill gives the use as present minus previous reading, in
   cubic meters, with the reading dates and the amount.
   <https://www.bayawanwd.gov.ph/qm-about-water-1>
3. Meters are read in the first days of the month (Puerto Princesa WD: the
   1st to the 5th). <https://ppcwater.gov.ph/about-us/utility-rules/ur-billing/>
4. OP Memorandum Circular No. 22 (2023): national agencies cut their water use
   by 10% of their January–March 2023 volume; WRMO monitors it.
   <https://lawphil.net/executive/mc/mc2023/mc_22_2023.html>
5. WRMO Bulletin No. 1 (2023): at most 50 liters a day per employee, and a
   separate meter for each agency.
   <https://journalnews.com.ph/wrmo-issues-water-conservation-guidelines-for-govt-offices/>
6. AO 103 (2004) asks for 10% less cost of water and other utilities, in
   pesos. <https://lawphil.net/executive/ao/ao2004/ao_103_2004.html>
7. DENR Memos 2004-20 and 2004-610: each DENR office reports its water use
   monthly, against its December 2003 bill (quote). DENR MC 2005-015: 10% less
   electricity, water, fuel, and supplies (quote).
   <https://apidb.denr.gov.ph/infores/uploads/MEMO-2004-610.pdf>
8. The DENR Central Office's ISO 14001 system lists "water usage" as an
   environmental aspect. No DENR or EMB office publishes a water objective.
   <https://www.philstar.com/business/2018/01/23/1780376/business>
9. The simplest published monthly record is the month and its cubic meters
   (Mapúa; PUP adds a yearly average). <https://www.pup.edu.ph/sdgs/sdg6>
