# Signatory feature — decisions and open questions

Working document. Updated as we discuss. Each topic has the problem, what we
decided (if anything), and whether it still needs an answer.

Status meanings:
- **Settled** — decided, no need to revisit unless something changes.
- **Open** — being discussed now, or waiting for an answer.
- **Later** — deliberately postponed, not forgotten.

---

## Where this stands — read this first when resuming

Settled: Topics 1, 2, 3, 6, 7 (closed as no longer applicable), 8, and 10.

Still to discuss, in the order they block work:

1. **Topic 5 — the list of signing lines.** This is the next blocker. The table
   joining reports to signatories cannot be written until the actual list of
   signing lines used on these reports is known.
2. **Topic 4 — the consequence of signing both on paper and in the system.**
   Some signing lines can never be approved inside the system because the person
   has no account, so "not signed yet" and "will never be signed here" need to be
   told apart.
3. **Topic 9 — the conflict checker.** Five candidate conflicts are listed; none
   are agreed yet.

### Separating employees from users is its own discussion

Topic 10 settled the **decision** — full separation, employee and user become
different tables. It did not work out the **design**: what columns an employee
record holds, how a user row links to it, what happens to the name fields
currently on `user`, and in what order to migrate.

That design is out of scope for this document and belongs in its own feature
document, since it affects far more than signatories.

What carries over into that discussion, already decided here:

- Every person in the office gets an employee record, whether or not they log in.
- A signatory row links to an employee, never to a user directly.
- The signatory row still holds its own typed name and position title. Those are
  never read live from the employee record. See Topics 1 and 2 for why.

---

## Vocabulary used in this document

- **Signatory** — a person whose name is printed on a report's signing line.
  Not necessarily a system user.
- **Signing line / slot** — one printed line on a report, such as "Prepared by"
  or "Approved by".
- **Roster** — the list of who is currently expected to sign which line.
  Used to suggest names when a report is made.
- **History row** — one row holding one version of a signatory's name and
  position title, with a date range saying when that version was in use.
  A person who changes name has two history rows: the old name and the new one.

- **Reference** — a report does not store the signatory's name as text. It
  stores a link (a foreign key) pointing at one history row. The name is read
  from that row whenever the report is shown.

  This is the approach chosen. See Topic 1 for why.

Note: the reports themselves (fuel, electricity, water, paper, ESWM, GHG) are
**not built yet**. Only users, roles, permissions, and org units exist so far.
The table linking reports to signatories will be created along with them.

---

## Topic 1 — A signatory's name changes (for example, marriage)

**Status: Settled — use history rows and references.**

### Decision

Reports link to a signatory **history row**. They do not store the name as
text. A name change creates a new history row and ends the old one.

### Why — the user's reasoning, which decided it

There are two different reasons a name can change, and they need opposite
behaviour:

| What happened | What should happen to old records |
| --- | --- |
| The name was typed wrong ("Mria Cruz") | Fix it **everywhere** — it was never correct |
| The person married and changed surname | Leave them alone — they were correct at the time |

Storing the name as text on each report treats both the same way: it freezes
everything. A spelling mistake would then be permanent across every record that
used it. As the user pointed out, if 30 records were saved with a misspelled
name, nobody would remember which 30 they were, and correcting them one by one
would be exhausting.

With history rows, both cases work:

- **Spelling mistake** — edit the existing history row. Every record pointing at
  it is corrected at once.
- **Real name change** — end the old row, create a new one. Old records still
  point at the old row and keep showing the old name.

### The rule this creates

Editing a history row means "this was always wrong, correct it everywhere".
Creating a new row means "this changed from now on". Whoever does data entry
must be able to tell these apart, so the screen should not offer a plain "Edit"
button. It should offer two clearly worded choices:

- **"Fix a spelling mistake"** — edits the current row, with a warning naming
  how many existing records will also change.
- **"This person's name changed"** — ends the current row and starts a new one.

### How the two rows are linked as the same person — settled

A signatory row carries a link identifying which person it belongs to. Both of
Maria's rows point at the same person, so the system knows they are one human
being.

**Which table that link points at was decided later, in Topic 10: it is the
`employee` table, not `user`.** This discussion originally settled on `user`,
which left signatories without a login unlinked; Topic 10 replaced that and
closed the gap. The reasoning below is unchanged either way.

Important limit on what the link means: it identifies *who the person is*, and
nothing more. The name and position title are still typed on the signatory row
and are never read from the linked record. This keeps the Topic 2 rule intact.

What the link buys:

- Listing every report one person signed, across a name change.
- Asking which signatory rows belong to a given person, and which of them were
  active on a given date.
- Supporting one person holding more than one signatory row at the same time
  (see below).

An earlier proposal to add a separate "person" table above the history rows is
**not needed** — under Topic 10 the `employee` table already serves that
purpose.

### One person may hold several signatory rows at once

Confirmed by the user. The same person can be an active signatory under more
than one position title at the same time, and picks the right one per report.

| name | position title | from | until |
| --- | --- | --- | --- |
| Juan Dela Cruz | Chief, Environmental Management Division | Jan 2026 | — |
| Juan Dela Cruz | OIC-PENR Officer | Mar 2027 | Apr 2027 |

So the date range belongs to the signatory row, not to the person, and
overlapping ranges for one person are valid rather than an error.

### Rejected alternative (kept for the record)

Storing the name and title as plain text on each report, so the report keeps
its original wording no matter what changes later. Rejected for the typo reason
above.

---

## Topic 2 — Position title

**Status: Settled.**

The position title is **typed text on each signatory record**, not read from
the user account. When adding a signatory, the system suggests the current
position title from their user account, but the person can change it.

Reason: titles change over time (promotion, acting assignment), and old reports
must keep the title as it was printed.

---

## Topic 3 — Can a signatory be someone who does not use the system?

**Status: Settled — yes.**

Some signatories, such as the PENR Officer, sign reports but never log in.

Effect on design: the signatory list is its own table, with an *optional* link
to a user account. It is not a flag on the user table.

Side benefit: a staff member leaving (user set to inactive) does not disturb the
signatory history.

**Gap found, and since closed.** Because these signatories have no user
account, they had nothing to link to under the original Topic 1 decision, so a
name change for one of them could not be tracked as the same person. Topic 10
closed this by recording every employee, not only system users. Signatories now
link to an employee, so this case no longer exists.

---

## Topic 4 — Is signing done on paper, in the system, or both?

**Status: Answered, but one consequence still needs a decision.**

**User's answer:** both. The system records an approval, and the printed report
is also signed by hand.

**The unresolved consequence.** Some signing lines can never be approved inside
the system, because the person does not have an account — the PENR Officer, for
example, only signs the paper. So a "signed on" date will be filled in for some
lines and permanently empty for others.

Without marking which is which, the system cannot tell the difference between
"not signed yet" and "will never be signed in the system". That matters when
deciding whether a report is complete.

**Proposal, not yet agreed:** mark each signing line as either approved in the
system, or printed only.

**→ To discuss after Topic 1.**

---

## Topic 5 — Are the signing lines the same on every report?

**Status: Open — needs re-asking.**

The user answered "yes same, but sometimes different because of OIC". Reading
that back, the OIC situation changes *who fills a line and what title is
printed*, not *which lines exist*. So the lines themselves may well be the same
everywhere.

Still needed: the actual list of signing lines used on these reports
(for example: Prepared by, Noted by, Approved by), and whether every report type
uses that same list.

**→ To discuss later. Needed before the report-signature table can be written.**

---

## Topic 6 — OIC (Officer-in-Charge)

**Status: Open — no clear process at the agency yet.**

**What the user described.** This agency has no formal way of assigning an OIC.
When the usual signatory is unavailable, the next in rank usually signs, and it
happens informally. (The user's previous office did have a formal process with
a document filed to HR, but that is not the case here.)

**What this means.** Building an OIC feature with start and end dates may be
premature, since there is no real process for it to mirror. A simpler approach
may be enough: when making a report, the person choosing signatories can pick a
different person and type the appropriate title. Because the title is typed and
then copied onto the report, an OIC signing needs no special handling at all.

**Resolved by Topic 1.** No OIC feature is needed. An OIC is simply another
signatory row for the same person, with the acting title typed in and a date
range covering the acting period. Since one person may hold several signatory
rows at once, the regular post and the acting post can both be active, and the
person preparing the report picks the correct one.

This matches the agency's informal practice without forcing a process the
office does not actually have.

**Status: Settled — no separate feature.**

---

## Topic 7 — When is the text copied onto the report?

**Status: No longer applies. Closed.**

This question only existed if reports stored the name as text. Topic 1 decided
they store a reference instead, so nothing is ever copied and there is no
moment to decide. Closed with no action needed.

---

## Topic 8 — Reports for periods before the system goes live

**Status: Settled — not needed.**

Only reports from go-live onward. No need to load historical signatory
assignments with past dates.

---

## Topic 9 — Checking for conflicting signatories

**Status: Open — raised by the user, conflicts not yet defined.**

The user wants the system to warn about conflicting signatory records, but has
not yet decided what counts as a conflict. Listed below are candidates to go
through later. None are agreed yet.

1. **Duplicate row** — the same person has two active rows with the same
   position title and overlapping dates. Almost certainly a mistake.

2. **Ambiguous suggestion** — two different people are active for the same
   signing line at the same time, so the system cannot tell which to suggest.
   May be legitimate, but the person making the report should be asked to
   choose rather than have one picked silently.

3. **Signatory whose user account is gone** — the row is still active, but the
   linked user has left or been set to inactive. Worth a warning, though not
   necessarily an error, since the person may still sign on paper.

4. **Same person on two lines of one report** — for example the same person as
   both "Prepared by" and "Approved by". **Probably allowed here.** The project
   brief states that approvers may approve their own submissions, and that this
   matches actual agency practice. So this may be a non-issue.

5. **Gap in coverage** — no active signatory at all for a required signing line
   on the date of the report. Arguably the most useful check of the five,
   because it blocks a report from being completed.

**→ To discuss once the current topic is closed.**

---

## Topic 10 — Record every employee, not only system users

**Status: Open — proposed by the user, needs a decision on how far to go.**

**The user's proposal.** Keep a record of every employee in the office, whether
or not they use the system, so that no signatory record ever refers to a person
who does not exist in the system.

**The gap this closes.** Topic 3 established that some signatories never log in,
such as the PENR Officer. Under the Topic 1 decision, those signatory rows had
no person to link to, so a name change for one of them could not be tracked.
Recording all employees removes that gap entirely: every signatory row points at
a real employee, with no exceptions.

**Other value beyond signatories.** An employee list is likely to be useful on
its own — knowing who belongs to which section or division, and who is present
in the office, independently of who has a login.

### What it changes

Today the `user` table holds the person's name and position title directly. A
login and a person are the same record. This proposal separates them:

- **employee** — one row per person in the office. The person's identity.
- **user** — login details only, linked to an employee. Not every employee has
  one.
- **signatory** — links to an employee, and still carries its own typed position
  title, date range, and name as decided in Topics 1 and 2.

The name stays on the signatory history row rather than being read live from the
employee. That is what preserves old reports through a name change, and it is
unchanged from the Topic 1 decision. The employee record supplies the suggested
name when a signatory is created, in the same way the user account already
supplies the suggested position title under Topic 2.

### The cost to be aware of

This moves the name fields out of the existing `user` table, which is already
built and already used — the sidebar showing the signed-in person's name reads
them today. It is a real migration, though a small one at this scale, since
there are fewer than twenty users and no production data to preserve yet.

### Options

1. **Full separation.** Add `employee`, move the name fields out of `user`, and
   have `user` link to `employee`. Cleanest result; requires the migration
   described above.
2. **Employees only for non-users.** Leave `user` untouched and add `employee`
   only for people without logins. Cheapest now, but the office's people then
   live in two different tables, and every screen listing staff has to read
   both. Not recommended.
3. **Let `user` be the employee table.** Allow rows with no username or
   password, so a non-login employee is just a `user` who cannot sign in.
   Smallest change, but it makes the login code responsible for always
   excluding those rows, which is an easy thing to get wrong later.

**Decision: option 1, full separation.**

The user has chosen to rewrite the application around this structure rather than
patch it in. Work is paused for a few days before that rewrite begins.

Consequences to carry into the rewrite:

- A new `employee` table becomes the record of every person in the office.
- The name fields move out of `user`; `user` keeps only login-related columns
  and links to an employee.
- Anything reading the person's name from `user` must be updated. The sidebar
  showing the signed-in person's name is the known case today.
- Signatory rows link to an employee, never to a user directly.
