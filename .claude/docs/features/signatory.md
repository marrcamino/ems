# Signatory feature — decisions and open questions

Working document. Updated as we discuss. Each topic has the problem, what we
decided (if anything), and whether it still needs an answer.

Status meanings:
- **Settled** — decided, no need to revisit unless something changes.
- **Open** — being discussed now, or waiting for an answer.
- **Later** — deliberately postponed, not forgotten.

---

## Where this stands — read this first when resuming

**The design changed substantially on 27 August 2026.** Until that day nobody had
looked at a physical fuel document. When the user typed out the real signing
blocks (see the Appendix), and then asked the GSU staff how each line actually
works, it turned out the design recorded here rested on an assumption that was
simply not true.

The assumption was that a signatory is a person with a typed name and a typed
position title, kept in a table of their own. On the real documents, nobody's
title is ever typed. It is either printed on the form as a caption, or fixed and
identical every time, or read from the person's own record.

So **the separate signatory table is gone**. What replaced it is described under
"The design as it now stands", immediately below. The numbered topics further
down are kept because their reasoning is still worth having, with corrections
marked wherever the evidence overturned them.

This cost an edit and nothing more. No signatory table had been built.

**Nothing is open.** Topics 1 to 10 are all settled, as revised below, and the
last remaining item was closed on 31 August 2026.

That item was the other five report areas: electricity, water, paper, ESWM and
GHG. Only the fuel documents had ever been examined, and the item said each of
the others needed the same treatment on paper. It was closed by asking the user
instead. That is worth stating plainly, because the fuel documents are still the
only ones anybody has held. What was asked was narrow and answerable from
experience: *is there anything printed inside a signature block other than a
person's name, a caption already on the form, and that person's own position
title?* Five candidates were put to the user, and each was ruled out.

- **A group title typed under the name**, such as "Chairperson, ESWM Committee".
  This would have been a fact about the person and would have needed storing. The
  user's answer is that such a title belongs to the group rather than to the
  person: the seat always exists and outlives whoever fills it, so the words are
  printed on the form. It is a caption. The only consequence is that a block like
  this may use the existing "one particular post" rule for who may be chosen,
  since it is the head of the committee who signs.

- **A block taking more than one name**, such as a whole team signing together.
  The user has not seen this. What does happen is several separate blocks
  carrying the *same* caption, some of them left blank. That costs nothing, since
  each is still its own column. It does mean captions are not unique on a form,
  so nothing should be keyed on them.

- **A name that is not an employee**, such as a supplier or a utility
  representative. The system never prints these. The form leaves a caption and an
  empty line, or just a horizontal rule, and a hand fills it in. This is the same
  as the supplier's block on the Withdrawal Slip, which stores nothing.

- **A professional licence number**, such as a PRC number under a forester or an
  engineer. The user's answer removes this from scope rather than merely making it
  unlikely: reports that carry such a number are not produced by this system. They
  do not need gathered data, so they are written separately in a word processor.

- **A date or other detail inside the block.** Real, and common — the user puts it
  at 40 to 50 percent of forms — but always handwritten by the signer at the
  moment of signing. A printed empty date line is part of the form's layout, not
  data. The system stores nothing and prints nothing for it.

**What would reopen this.** Holding one of the five forms and finding something
printed inside a signature block that is none of the three allowed things. If that
happens, the fix is local to that form's rules, unless the new thing is a fact
about the *person* rather than the form. The licence number remains the worked
example of that harder case: it would need two more columns on the employee
history row and one more line in the form that prints them. Old documents keep
pointing at their own history row, so reprints stay correct, and only documents
filed before the licence was recorded would reprint without it.

**One small thing to check against the data, not a design question:** the RIS
prints the approver's own position title, so whoever is set as the default
approver must have their position recorded in a form that reads correctly on the
page. If the standing OIC's recorded position is not what the RIS should show,
that is an employee record to correct rather than a design to change.

**What has been built since, on 31 August 2026.** The `employee_history` table
that Topic 1 depends on now exists, with a one-time backfill and the code that
keeps it in step with `employee`. That was the blocking piece, because a document
stores a reference to a version of a person and no version could be stored
before. The details are in
`.claude/docs/features/employee-and-user-separation.md`, Topic 9.

Two things this design describes were deliberately left undone, both with the
user's agreement. The **config table** holding the two fuel settings waits until
the fuel work starts, since nothing reads those settings until then and building
it now would only fix their shape early. The **correction log and its two-button
editor** wait until there is a screen that can tell a spelling fix apart from a
real name change; until then a spelling fix behaves like a name change, which is
recorded under Topic 1.

### Separating employees from users is done

Topic 10 decided that employee and user become different tables, and that work
has been built. The `employee` table holds every person in the office and the
`user` table holds login details only. The shape of those two tables belongs in
their own feature document rather than this one.

What matters here:

- Every person in the office has an employee record, whether or not they log in.
- Signing never involves a login at all. See Topic 4.

---

## Vocabulary used in this document

- **Signatory** — a person whose name is printed on a document's signature block.
  Not necessarily a system user. Under the current design a signatory is simply
  an employee chosen for a line; there is no separate signatory record.
- **Signature block** — the whole printed block on a document where somebody
  signs: its label such as "Requested by" or "Approved by", the name, and the
  title printed underneath. The user asked for one settled word for this after
  "signing line" had been used loosely, sometimes for the whole block and
  sometimes only for its label.
- **Document** — one printed form, such as a Withdrawal Slip. A *report* may be
  several documents printed together. The fuel report is three of them.
- **Employee history row** — one row holding one version of a person's name and
  position title, with a date range saying when that version was in use. A person
  who marries and changes surname has two history rows. A person who is promoted
  also has two.
- **Reference** — a document does not store the person's name as text. It stores
  a link pointing at one employee history row, and the name is read from there
  whenever the document is shown. See Topic 1 for why.
- **Caption** — a title that is **printed on the paper itself**, in the place
  where a person's own title would otherwise go. "Driver", "Section Incharge" and
  "GSU Representative" are captions: they are the same on every copy no matter who
  is named above them, and the system never stores them.

  The test is not what the words look like but where they come from. On the
  Withdrawal Slip, "GSU Representative" is under Gorgonio's name and would be
  under anybody else's name too, so it is a caption. On the RIS,
  "AO-I/Supply Officer" is under Maricel's name and changes if somebody else is
  named there, so it is not a caption; it is her own title. The word
  **designation** is deliberately not used for this, because in this project a
  designation means an extra role a person holds on a group, and one word with
  two meanings would make this document unreadable later.
- **Group** — a body inside the office that is not a division, section or unit:
  a Technical Working Group, an association, the BAC Secretariat. Staff are
  designated to these on top of their ordinary post.
- **Per procurationem (p.p.)** — signing on somebody else's behalf, with their
  authority. Common on these documents, and invisible to the system, because it
  happens with a pen after printing.

Two terms were coined and later dropped: **position signatory** and
**designation signatory**. They were meant to separate somebody signing under
their office post from somebody signing under a working group designation. That
split disappeared once working group titles were settled as captions, so both
names described nothing and were removed. The distinction that actually matters
is whether a printed title comes from the paper, which is a caption, or from the
person, which is their own short form.

Note: the reports themselves (fuel, electricity, water, paper, ESWM, GHG) are
**not built yet**. Employees, employee history, users, roles, permissions and org
units exist so far. The config table this design needs for the two fuel settings
does not exist yet either; it was deliberately left until the fuel work starts,
because nothing reads those settings until then.

---

## The design as it now stands

This section is the summary. The topics below give the reasoning behind it.

### Every signature block has two rules, written in the code

For each signature block on each document, the code says two things.

**Who may be chosen.** The real fuel documents show at least five different
answers, so this cannot be one rule for everything:

| rule | example |
| --- | --- |
| any employee | Withdrawal Slip, "Requested by" |
| only staff of a named unit | Withdrawal Slip, "Approved by" — GSU personnel only |
| only employees able to do something | Trip Ticket, "Driver" — anyone who can drive |
| one particular post | RIS and Trip Ticket, "Approved by" — the PENR Officer |
| nobody at all | Withdrawal Slip, the supplier's block |

**Where the printed title comes from.** Again there are several answers:

| rule | example |
| --- | --- |
| nothing is printed; the form already carries a caption | "Section Incharge", "GSU Representative", "Driver" |
| the person's own position title, as it was at the time | RIS "Requested by", "Approved by" and "Issued by" |

There is **no** third rule for a fixed string written into the program. An earlier
version of this document said the RIS "Approved by" always printed "OIC, PENR
Officer" no matter who was chosen. The user corrected that: the person is picked
from a list, defaulted to the usual approver, and the title printed is that
person's own. It looks like a fixed string only because the same person is nearly
always chosen. Choosing somebody else is possible, though GSU may then refuse to
approve the document.

Both rules live in the code, alongside the signature blocks themselves. This follows
from Topic 5: the blocks on these forms are fixed and must not be editable by an
admin, because editing them would break the layout of the printed page.

### What the report stores

One column per signature block, exactly as Topic 5 decided. The column holds a
reference to an **employee history row**, or nothing.

| RIS | requested_by | approved_by | issued_by | received_by |
| --- | --- | --- | --- | --- |
| Aug 2026 | 14 | 7 | 22 | *(blank)* |

A blank is legitimate. The supplier's block on a Withdrawal Slip is always blank,
and the "Received by" on an RIS may be left for someone to write in by hand.

### Caption lines need nothing stored but a person

Roughly half the signature blocks on the fuel documents carry a caption rather than
a position title. The user's realisation about these is worth stating plainly,
because it removes a large part of the problem:

- The system stores **no title** for them, since the words are on the form.
- Anybody may be chosen. An ICT Support Staff can be the driver on a Trip Ticket;
  anyone in the section can be its Section Incharge; any GSU staff member can be
  the GSU Representative.
- So there is nothing to keep a roster for, and nothing that goes out of date.
  The line simply needs a person.

The lines that print a real position title, on the RIS, are the ones that still
need everything below.

### Employee history, and who is accountable for changing it

**Two tables.**

`employee_history` holds one version of a person's name and position title:

| column | meaning |
| --- | --- |
| `employee_history_pk` | the id a document points at |
| `employee_fk` | which person |
| `first_name`, `middle_name`, `last_name`, `suffix` | the name in this version |
| `position_title` | the title in this version |
| `valid_from`, `valid_until` | when this version was in use |
| `created_by_fk`, `created_at` | who added this version, and when |

`employee_history_correction` is the log for spelling fixes:

| column | meaning |
| --- | --- |
| `employee_history_fk` | which version was corrected |
| `field`, `old_value`, `new_value` | what changed |
| `corrected_by_fk`, `corrected_at` | who did it, and when |

**Why there are two.** The two kinds of edit have to behave differently, which is
the whole of Topic 1. A marriage or a promotion **adds a version**, so old
documents keep pointing at the old one; that is recorded by `created_by_fk` on
the new row. A misspelling **edits a version in place**, so every document using
it is corrected at once; that would otherwise leave no trace, which is the case
the user wanted to be accountable, so it gets the log.

Worked example. Rannie is entered as "Olivar" by mistake. Somebody fixes it to
"Olaivar": the version is edited, every trip ticket immediately reads correctly,
and the log records who fixed it. Two years later he marries: a new version is
created, the old one is closed, and last year's trip tickets still show the old
surname.

**What was built, on 31 August 2026.** `employee_history` exists with exactly the
columns listed above, `created_by_fk` among them, so every version records who
made it. `employee_history_correction` was **not** built, and neither was the
two-button screen described in Topic 1. The user chose this when the choice was
put to them: the log has nothing to record until a screen exists that can tell a
spelling fix apart from a real name change, and the employee editor today has a
single Save button.

The consequence should not be forgotten, because it is the opposite of what
Topic 1 asks for: **a spelling fix currently behaves like a name change.**
Correcting "Olivar" to "Olaivar" closes the misspelled version and opens a
corrected one, so a document filed before the fix keeps pointing at the
misspelling instead of being repaired. Nothing is lost, since the wrong version
is still there and can be corrected in place later, but finishing this means
building all three parts together: the two buttons, the correction log, and a
warning naming how many documents a fix would change.

**The position title is stored twice: in full, and as the short form actually
printed.** The documents do not print a full position title. Maricel I. Ytac is
an "Administrative Officer I (Supply Officer)" but the RIS prints
"AO-I/Supply Officer". Gorgonio A. Pangan prints "AA-I/Property Officer", and
Alexder B. Gonzaga prints "LMO-I/Chief-GSU". The boxes on the paper are small.

So the employee history row carries a second text field beside `position_title`,
holding the short form. It cannot be worked out automatically, because no rule
worth trusting turns "Administrative Officer I (Supply Officer)" into
"AO-I/Supply Officer". Somebody types it once.

**One person has exactly one short form.** Settled by the user. Asked whether the
same person ever prints different short forms on different documents, they
answered that it does happen but only because whoever typed it did not know the
correct short form. That is a mistake rather than a real difference, so the system
should hold a single short form per person and use it everywhere.

This is also why it belongs on the employee rather than on a per-document record.
Had short forms genuinely varied by document, they would have needed somewhere
else to live.

**Name and position title share a version.** Agreed by the user. A promotion
creates a new version that repeats the unchanged name. It is one table instead of
two, and no document has ever needed one without the other.

**Not only HR may edit it.** This was the user's condition for accepting employee
history at all. They first rejected it as an HR responsibility that EMS should
not duplicate, and accepted it only on the basis that chosen users can correct a
name themselves, with every change attributable to a person. See Topic 10 for the
scope boundary this sits inside.

**The current columns on `employee` stay where they are.** An earlier version of
this section said `first_name`, `middle_name`, `last_name`, `suffix` and
`position_title` would move out of `employee` into dated rows. The user rejected
that, and their reason is the right one: reading a person's name is the common
case, and forcing every screen to reach through to a history row would be a great
deal of code for no gain.

So the shape is:

- `employee` keeps its current name, position title and short form. A simple
  fetch of somebody's basic information stays simple.
- `employee_history` holds every version, including the current one, with the
  current row left open-ended.
- **Documents always point at a history row**, never at `employee` directly. That
  is what keeps an old Withdrawal Slip showing the surname it was printed with.
- The two are written **in one transaction**, so the copy on `employee` cannot
  drift out of step with the current history row. This is the one discipline the
  arrangement requires.

This was built on 31 August 2026, on the `feature/employee-user` branch, because
it is a change to the employee record rather than to signatories. The table, the
one-time backfill and the write path are described in
`.claude/docs/features/employee-and-user-separation.md` under Topic 9. Only the
parts that decide what a document prints are kept here.

### What no longer exists

There is no signatory table, no typed signatory name, no typed signatory position
title, and no signatory date range. Nothing that was built has to be undone,
because none of it was built.

### How a signature block knows who may be chosen — settled

Some signature blocks let you pick anybody. The Withdrawal Slip's "Requested by"
takes any employee, and the Trip Ticket's driver can be anyone who is able to
drive, including staff whose job has nothing to do with driving. These need
nothing stored.

Others do not let you pick just anybody, and those are the open cases.

**1. Lines that require a member of a particular unit. SETTLED.**

The Withdrawal Slip's "Approved by" must be GSU staff. Half of this was already
solved, because `employee` carries an `org_unit_fk`, so the database can answer
"who works in GSU" without any new table.

The remaining question was how the *code* names the General Services Unit,
without hardcoding a row id that means nothing on another installation.

**Decision: a config table.** A standard configuration table, one row per
setting, with a key that is a fixed string in the code and a plain text value
that the office fills in. The user chose the name "config table".

| key | value |
| --- | --- |
| `fuel.gsu_org_unit` | 4 |

The code asks for `fuel.gsu_org_unit`, gets an org unit id, and offers the
employees whose `org_unit_fk` matches. An admin sets the value from a settings
screen and can change it later if the office reorganises.

**Protecting the reference.** The value is plain text, so the database cannot
enforce it as a foreign key. Instead, deleting **or deactivating** an org unit
checks the config table first, and warns if that unit is named by a setting.

The user's reasoning for preferring this over a real foreign key is sound: a
foreign key with `restrict` would only have protected deletion. Deactivation is
an ordinary column change that no foreign key can catch, so the check would have
been needed anyway. One mechanism covering both is simpler than two covering one
each.

**The cost, accepted knowingly.** Because the protection lives in the program
rather than in the database, it holds only while every path that deletes or
deactivates an org unit goes through the check. The way to keep that true is a
single function doing deletion and deactivation with the check inside it, rather
than the check copied into each screen.

**Rejected along the way, kept for the record:**

- *A short fixed code column on `org_unit`.* Rejected by the user for two
  reasons worth keeping: the org unit table starts empty and is filled in by an
  admin, so a column the admin must populate but may not later edit is
  confusing; and a field that looks editable while refusing to be edited
  confuses whoever maintains the office data.
- *Typed columns on the config table*, so that a setting pointing at an org unit
  could carry a real foreign key alongside its text value. Rejected by the user,
  who did not want a table holding columns that only one row would ever use.
- *Deriving the value automatically* from the org unit of whoever first opens the
  GSU page holding the `gsu:view` permission. Proposed by the user, and set aside
  after discussion: a permission belongs to a role rather than to a unit, so
  granting `gsu:view` to somebody outside GSU would silently record the wrong
  unit, and the mistake would surface much later as a wrong list of approvers
  with no visible cause.

**Corrected reading.** An earlier sketch had the roster carrying an org unit so
that the GSU copy and the CDS copy of a Withdrawal Slip could expect different
GSU people. The user says this is wrong. There is only one General Services Unit,
and any of its staff may approve any section's slip. Gorgonio M. Pangan and
Maricel I. Ytac appearing on different copies was simply who happened to sign.
So that column is dropped.

**2. Lines with a usual default name. SETTLED, and they reuse case 1's answer.**

Both remaining cases turned out to need no new mechanism. The config table
already introduced for the GSU org unit holds these too.

**RIS and Trip Ticket, "Approved by".** Treated as an ordinary signatory who
prints a position title. What makes it a default is one more config row holding
the employee id.

| key | value |
| --- | --- |
| `fuel.penr_officer` | 12 |

The user set a firmer rule here than for the org unit: **a document saves only if
the person named on it is actually still working at the agency.** Any
`employment_status` other than `active` counts as not working, and so does an id
that no longer resolves to an employee at all. In either case the RIS cannot be
submitted or saved.

This is wider than it first looked. The original wording was "if that employee id
does not exist in `employee`", but deleting an employee is already refused by the
database while anything still links to them, so the real case is somebody being
marked separated. Their row stays, their id still resolves, and only the status
tells you they have gone.

**No warning is raised when somebody is marked separated.** The user considered
this and preferred to leave it. The config row simply keeps its old value, and
the next time it is read and found to point at somebody who is no longer active,
the value is cleared. The approver then comes up empty, the RIS will not save,
and the requester walks to GSU and asks who the approver is now. GSU tells them,
they pick that person, and the form saves.

That is how the office already works, and it puts the question in front of the
people who know the answer.

### Every signature block gets a default, and defaults are checked before use

The user decided this for the whole feature, not only for the RIS:

- **Every signature block that can have a default will have one.** This is the
  user's own condition. It removes the awkward case of a line with nobody
  suggested.
- **A default is checked before the form uses it.** If the person set as the
  default is no longer working, the form does not fill them in, and they do not
  appear in the list at all.
- **Somebody no longer working never appears in the selection list**, so they
  cannot be picked by hand either.
- **A document will not save with a person who is no longer working**, whether
  that person arrived as a default or was chosen by hand.

So when Maricel is marked separated, the next person to prepare a Withdrawal Slip
simply finds her gone from the list and picks whoever signs now. Nothing warns
anybody, and nothing needs to.

### The list is built from the document's filed date, not from today

This is the mechanism behind the rules above, and it is the user's design.

Every document carries a **filed date**, meaning the date on the paper. That is a
different thing from the date the record was entered into the system, and the
user was explicit that the two are not the same. Both exist; only the filed date
drives signatories.

When the form works out who may be chosen, it does not ask who is working today.
It asks **who was valid on this document's filed date**, comparing against
`valid_from` and `valid_until` on the employee's history rows.

Everything else falls out of this without needing its own rule:

- A slip filed last month, reopened today, still offers the people who were valid
  last month. Somebody who retired in between is still there, so reprinting it
  with their name and having a colleague sign per procurationem stays possible.
- A slip filed today does not offer them at all.
- Editing needs no special case. An old document naturally looks at its own old
  date.

**What this requires when somebody leaves.** Marking a person as no longer
working has to **close their current history row** by setting `valid_until` to
that date. If the row is left open-ended, they keep appearing for documents filed
after they left. So separation is not only a status change; it ends the dated
row as well.

This is how the earlier rule about `employment_status` actually gets enforced.
The status records that the person has gone; the closed date range is what makes
them disappear from the right documents and stay on the right ones.

### Working group titles are captions

**Settled by the user, and it needs no mechanism at all.**

A person may hold a title on a Technical Working Group, an association or the BAC
Secretariat, alongside their ordinary position. The question was where such a
title would come from when printed.

The answer is that it is printed on the paper, like "Driver" or "GSU
Representative". It is a caption, so the system stores nothing for it. The form
supplies the title and the system supplies only the name.

Two observations from the user that support this:

- Group titles appear on **particular documents**, such as memoranda for that
  group's own work, rather than on the fill-in forms this project handles.
- They have never seen a group title reused across documents the way an ordinary
  position title is. It belongs to the document it is printed on.

**Why this was not designed earlier, deliberately.** No document with a group
title had been seen. Everything designed from conversation alone during this
discussion turned out wrong once real paper appeared, and nothing was blocked by
waiting, since none of the nine signature blocks on the fuel documents involves a
group. The question that would have settled it was whether the group title is
printed on the form or filled in per person. The user answered: printed.

### Choosing the wrong person is not the system's problem

The user was clear about this, and it keeps the design small. If somebody
prepares a slip naming a GSU staff member who is not the right one, the system
does not object. GSU simply refuses to sign it, and the document is printed again
with the correct name.

The system's job is to stop what is *impossible*, such as naming somebody who no
longer works at the agency. Deciding who *ought* to sign is the office's job, and
it already has a working way of handling it.

**RIS, "Issued by".** The same as the Withdrawal Slip's "Approved by": always a
GSU staff member, so the list comes from the `fuel.gsu_org_unit` setting. On top
of that it may carry a default name, again a config row, matching what GSU
described as the usual name being printed even when that person is away.

**Not a fixed string.** An earlier note here treated the RIS "Approved by" as
printing "OIC, PENR Officer" regardless of who signed. The user corrected this.
The approver is chosen from a list like any other signatory, the config row only
decides who is offered by default, and the printed title is that person's own.

The practical control is social rather than technical: if somebody prepares an
RIS naming an approver other than the usual one, GSU may simply refuse to approve
it. The system does not need to prevent it.

---

## Topic 1 — A person's name changes (for example, marriage)

**Status: Settled. The mechanism is unchanged; it moved from the signatory record
to the employee record.**

### Decision

Documents link to an **employee history row**. They do not store the name as
text. A name change creates a new history row and ends the old one.

### Why — the user's reasoning, which decided it

There are two different reasons a name can change, and they need opposite
behaviour:

| What happened | What should happen to old records |
| --- | --- |
| The name was typed wrong ("Mria Cruz") | Fix it **everywhere**, it was never correct |
| The person married and changed surname | Leave them alone, they were correct at the time |

Storing the name as text on each document treats both the same way: it freezes
everything, so a spelling mistake becomes permanent across every record that used
it. As the user pointed out, if 30 records were saved with a misspelled name,
nobody would remember which 30 they were, and correcting them one by one would be
exhausting.

The Appendix contains a small live example of exactly this. The user typed the
same names twice from the physical documents and they came out differently:
"Olaivar" and "Olivar", "Pangan" with middle initial M. and with A., "Gonzaga"
and "Gongaza". Names do get typed wrong.

With history rows, both cases work:

- **Spelling mistake.** Edit the existing history row. Every record pointing at
  it is corrected at once.
- **Real name change.** End the old row, create a new one. Old records still point
  at the old row and keep showing the old name.

The same applies to a promotion, since the RIS prints the person's real position
title. An RIS from last year must still show the title the person held last year.

### The rule this creates

Editing a history row means "this was always wrong, correct it everywhere".
Creating a new row means "this changed from now on". Whoever does data entry must
be able to tell these apart, so the screen should not offer a plain "Edit" button.
It should offer two clearly worded choices:

- **"Fix a spelling mistake"** — edits the current row, with a warning naming how
  many existing records will also change.
- **"This person's name changed"** — ends the current row and starts a new one.

**Not built.** The employee editor still has one Save button, and every change to
a printed field makes a new version, a spelling fix included. See "What was
built" under "Employee history, and who is accountable for changing it" above.

### Corrections to what this topic used to say

**The history rows are on the employee, not on a signatory record.** This topic
was originally written when a separate signatory table was planned. The mechanism
survives untouched; only its owner changed.

**One person holding several rows at once is no longer part of this.** The
original reason was that somebody might sign under two different titles at the
same time. On the real documents the title is not a property of the person at all,
so this does not arise. The genuine case that remains is a designation on a
working group, and no such document has been seen yet.

### Rejected alternatives (kept for the record)

**Storing the name and title as plain text on each document**, so it keeps its
original wording no matter what changes later. Rejected for the typo reason above.

**A separate signatory table per report type**, such as `signatory_fuel` and
`signatory_water`. Raised by the user, who wanted the list offered when preparing
a fuel document to contain only the people who sign fuel documents. Rejected by
the user once the cost was clear: anybody signing more than one kind of document
would exist as a row in each table, so a spelling fix would have to be repeated in
every one of them.

The user's instinct was right even though the structure was not. The current
design gives them what they wanted: each signature block says who may be chosen, so
the list offered is already narrow.

---

## Topic 2 — Position title

**Status: Settled, and rewritten. The title is decided by the signature block, not
typed by a person.**

### What this topic used to say, and why it was wrong

It used to say the position title is typed text on each signatory record, with
the employee's current title merely suggested. That was a guess made before
anybody had seen a document, and the documents contradict it.

### What the documents actually show

Nobody types a title. Each signature block decides where its title comes from, and
there are three different answers:

1. **Nothing is printed.** The form already carries a caption. The Withdrawal
   Slip prints "Section Incharge" and "GSU Representative"; the Trip Ticket prints
   "Driver". These are part of the form, and the same words appear no matter who
   signs. Only the name is filled in.
2. **A fixed string.** The RIS "Approved by" always prints "OIC, PENR Officer",
   whoever signs it.
3. **The person's real position title**, as it stood at the time. The RIS
   "Requested by" and "Issued by" work this way.

Only the third case needs anything stored, and it is read from the employee
history row rather than typed.

### What survives from the original reasoning

The reason the original decision was made is still valid: titles change with
promotion, and old documents must keep the title as it was printed. That is now
handled by the employee history rows described in Topic 1, which is a better place
for it, because a promotion happens to a person.

---

## Topic 3 — Can a signatory be someone who does not use the system?

**Status: Settled — yes, and it matters less than it used to.**

Some signatories sign documents but never log in. The PENR Officer is the example
that started this discussion.

Under the current design this barely needs saying. Anyone chosen for a signing
line is an employee, and Topic 10 established that every person in the office has
an employee record whether or not they can sign in. Topic 4 established that
signing never happens in the system at all. So a login is irrelevant to signing
from beginning to end.

**One person is genuinely outside the system.** The supplier on the Withdrawal
Slip is a gasoline station owner or one of their staff. They are not an employee,
they are not in the system, and their block is always printed blank for them to
sign by hand. This is handled by the signature block's rule being "nobody may be
chosen", not by inventing a record for them.

A staff member leaving does not disturb old documents, because those documents
point at history rows that stay as they were.

---

## Topic 4 — Is signing done on paper, in the system, or both?

**Status: Settled — on paper only.**

### Decision

All documents are signed physically. The user confirmed this with their
supervisor, and the physical documents in the Appendix confirm it again.

The system does **not** collect an approval from each signer. There is no screen
where a signatory logs in and approves, and no "signed on" date stored per signing
line. The office has no such process, and inventing one in software would not
match how the work is really done.

What the system does is prepare and print the documents with the correct names on
the signature blocks. The paper is then carried around and signed by hand.

### What this removes

An earlier answer recorded here said signing happened **both** on paper and in the
system. That was wrong and has been corrected. It had created a problem that no
longer exists: signers without an account could never approve inside the system,
so the system would have had no way to tell "not signed yet" apart from "will
never be signed here".

### A signature block may be printed blank

Confirmed on paper. The Withdrawal Slip's supplier block is always blank. The
CDS copy of the RIS has an empty "Received by", which the user was told may be
left for somebody to write in by hand.

So a report is not incomplete merely because a signature block has nobody attached.
Whether a particular line is allowed to be blank is one of the rules written in
the code for that line.

### Left for the reports feature, not this document

Marking a finished report as done, who may do it and what it records, is about
the report's own lifecycle rather than about signatories. It belongs with the
reports work when that starts.

---

## Topic 5 — Are the signature blocks the same on every report?

**Status: Settled — fixed in the code, one column each. Now applied per document
rather than per report.**

### Decision

The set of signature blocks is part of the printed form. It is written into the code
and the database structure, not stored as a list an admin can edit.

Each document gets **one column per signature block**, holding a reference to an
employee history row, or nothing.

### Why the user decided it this way

Letting an admin add signature blocks from a screen would mean letting them add
signature blocks to the document. The blocks on these forms sit in fixed positions
on the page and do not move. An editable list would allow the layout of the
printed page to be broken, which is not something the office wants to be possible.

### The correction: a report is not one form

This topic was written assuming one report meant one form. The fuel report is
**three documents printed together**: a Withdrawal Slip, a Driver Trip Ticket, and
a Requisition and Issue Slip. They have different signature blocks, different rules,
and different numbers of blocks.

The decision itself is unaffected. It simply applies to each document rather than
to the report as a whole.

### The signature blocks that are now known

From the physical fuel documents, listed in full in the Appendix:

- **Withdrawal Slip:** Requested by, Approved by, and the supplier's block.
- **Driver Trip Ticket:** Approved by, and "I hereby certify in accordance of the
  statement of travel".
- **RIS:** Requested by, Approved by, Issued by, Received by.

The earlier guess of "Prepared by, Noted by, Approved by" was close for some lines
and wrong for others, which is why the physical documents were worth waiting for.
The other five reports have not been examined yet.

### Known consequence

Adding, removing or renaming a signature block is a change to the program and the
database, done by a developer, not something an admin can do. The user accepted
this deliberately, because it is the same thing that protects the document layout.

### What this rules out

- A table of signing-line types that an admin can add to or rename.
- A separate report-signature table with a "which line is this" label column. With
  one column per line, the line *is* the column name, so no label is stored.

---

## Topic 6 — OIC (Officer-in-Charge)

**Status: Settled — nothing to build, but the word covers two different things.**

### The two senses of OIC at this office

The user's account, confirmed with their unit chief and visible on the physical
documents, is that there is **no actual PENR Officer**. Nathaniel E. Rancho has
been OIC for years. In day to day terms he is the officer, and every fuel document
prints "OIC, PENR Officer".

When he himself is away, somebody of the next rank covers for him, also called
OIC. When he returns he resumes acting as the PENR Officer.

So:

| sense | how long | does it reach the printed page? |
| --- | --- | --- |
| The standing OIC, who holds the post | years | Yes. "OIC, PENR Officer" is printed on every copy. |
| Temporary cover while the standing OIC is away | days | No. It is handwritten, if written at all. |

### What this means for the system: nothing to build

The standing sense needs nothing special because "OIC, PENR Officer" is simply the
fixed string that the RIS "Approved by" line prints, whoever is in post. It is a
title, not a feature.

The temporary sense needs nothing either, because it never reaches the system. The
document prints the standing officer's name, and somebody else signs it per
procurationem with a pen. The Appendix records four real instances of this on the
CDS copies, two of them with a handwritten name and the title "OIC, Chief TSD /
In-charge, Office of the PENR Officer", and two with only a signature.

**Correction to what this topic used to say.** An earlier version said an OIC was
another signatory row for the same person with the acting title typed in. That was
wrong twice over: no signatory rows exist, and the acting title is handwritten
rather than typed.

This matches the agency's informal practice without forcing a process the office
does not actually have.

---

## Topic 7 — When is the text copied onto the report?

**Status: No longer applies. Closed.**

This question only existed if documents stored the name as text. Topic 1 decided
they store a reference instead, so nothing is ever copied and there is no moment
to decide.

---

## Topic 8 — Reports for periods before the system goes live

**Status: Settled — not needed.**

Only reports from go-live onward. There is no need to load historical signing
arrangements with past dates.

---

## Topic 9 — Checking for conflicting records

**Status: Settled — closed. No conflict checking is being built.**

The user asked for the system to complain when signatory data conflicts with
itself, and five candidates were worked through. All five are now resolved, and
none of them results in a check.

| # | The proposed conflict | Outcome |
| --- | --- | --- |
| 1 | The same person holding two signatory records with the same position title on overlapping dates | Gone. It described rows in the signatory table, which no longer exists. |
| 2 | Two different people both valid for the same block at the same time, so the system cannot tell which to suggest | Gone. Same reason. |
| 3 | Choosing somebody who has left the office | Became a rule rather than a warning. The document will not save, and the person never appears in the list. |
| 4 | The same person appearing on two blocks of the same document | **Allowed.** See below. |
| 5 | No signatory available for a block that needs one | Gone. Topic 4 settled that a blank block is legitimate. |

### Number 4, the only one that needed deciding

The case is real. On a Withdrawal Slip, "Requested by" takes any employee and
"Approved by" must be GSU staff, so a GSU staff member requesting fuel for a GSU
vehicle qualifies for both blocks.

**Decision: allow it, with no warning.**

The user's reason is an account of it happening. At their previous job in a
provincial government HR office, a leave application had to be approved by an
admin officer from the admin office, which sits above HR. The admin officer was
away, and the admin staff said it was acceptable for the office head to approve
it. The office head was the person applying for leave, so the same name appeared
as both applicant and approver.

The project brief already says approvers may approve their own submissions. This
account is the stronger argument, because it is something the user watched happen
rather than a rule written down.

**Where this rule belongs.** The user made the point that this is a matter for the
form rather than for the employee data. Nothing about a person makes them
ineligible; it is the document that decides whether one name may fill two of its
blocks, and for these documents it may.

---

## Topic 10 — Record every employee, not only system users

**Status: Settled — option 1, full separation. Built.**

**The user's proposal.** Keep a record of every employee in the office, whether or
not they use the system, so that no signature block ever refers to a person who does
not exist in the system.

**The gap this closed.** Topic 3 established that some signatories never log in.
Recording all employees removed the gap entirely.

**Other value beyond signatories.** An employee list is useful on its own: knowing
who belongs to which section or division, and who is present in the office,
independently of who has a login.

### Options that were considered

1. **Full separation.** Add `employee`, move the name fields out of `user`, and
   have `user` link to `employee`.
2. **Employees only for non-users.** Leave `user` untouched. Cheapest at the time,
   but the office's people would then live in two different tables. Not chosen.
3. **Let `user` be the employee table**, allowing rows with no username or
   password. Smallest change, but it would make the login code responsible for
   always excluding those rows, which is easy to get wrong later. Not chosen.

**Decision: option 1, full separation. This is built.**

- `employee` holds every person in the office: name, position title, org unit,
  birth date, sex, civil status, tenure status, employment status, whether or not
  they can sign in.
- `user` holds login details only, and links to exactly one employee.
- The name fields are gone from `user`; anything showing the signed-in person's
  name reads them through the linked employee.

### The cost, now paid

This moved the name fields out of the existing `user` table, which was already
built and already used. It was a real migration, though a small one at this scale,
since there were fewer than twenty users and no production data to preserve.

### The history table, built on 31 August 2026

Topic 1 needed an `employee_history` table holding every version of a person's
name, position title and short form, so that documents can point at the version
that was current when they were filed. It exists. The columns already on
`employee` stayed where they are and act as the current copy, written in the same
transaction as the current history row.

The details belong with the employee feature and are in
`.claude/docs/features/employee-and-user-separation.md`, Topic 9.

---

## Appendix — real signing blocks from the fuel documents

Typed out by the user from the physical documents in front of them, 26 August
2026. This is evidence, not a decision. Several topics above are being re-checked
against it.

A "fuel report" is not one form. It is **three documents printed together**: a
Withdrawal Slip (WS), a Trip Ticket, and a Requisition and Issue Slip (RIS).

### General Services Unit (GSU) copy

**Withdrawal Slip**

| signature block | name | printed title |
| --- | --- | --- |
| Requested by | Rannie O. Olaivar | Section Incharge |
| Approved by | Gorgonio M. Pangan | GSU Representative |

**Trip Ticket**

| signature block | name | printed title |
| --- | --- | --- |
| Approved by | Nathaniel E. Rancho | OIC, PENR Officer |
| I hereby certify in accordance of the statement of travel | Rannie O. Olaivar | Driver |

**RIS**

| signature block | name | printed title |
| --- | --- | --- |
| Requested by | Alexder B. Gonzaga | LMO-I/Chief-GSU |
| Approved by | Nathaniel E. Rancho | OIC, PENR Officer |
| Issued by | Gorgonio M. Pangan | AA-I/Property Officer |
| Received by | Rannie O. Olaivar | GSU Support Staff |

### Conservation and Development Section (CDS) copy

**Withdrawal Slip**

| signature block | name | printed title |
| --- | --- | --- |
| Requested by | Eden Grace L. Rodas | Section Incharge |
| Approved by | Maricel I. Ytac | GSU Representative |

**Trip Ticket**

| signature block | name | printed title |
| --- | --- | --- |
| Approved by | Nathaniel E. Rancho | OIC, PENR Officer |
| I hereby certify in accordance of the statement of travel | Joselito Dinagat | Driver |

**RIS**

| signature block | name | printed title |
| --- | --- | --- |
| Requested by | Eden Grace L. Rodas | FT-I |
| Approved by | Nathaniel E. Rancho | OIC, PENR Officer |
| Issued by | Maricel I. Ytac | AO-I/Supply Officer |
| Received by | *(blank)* | *(blank)* |

### The actual positions of the GSU staff named above

| person | real position in the office |
| --- | --- |
| Alexder B. Gonzaga | Chief, GSU |
| Maricel I. Ytac | Admin Officer I (Supply Officer) |
| Gorgonio A. Pangan | Admin Assistant I (Property Officer) |
| Rannie O. Olaivar | GSU Support Staff (Contract of Service, not permanent) |

Note on spelling: the user typed some of these names twice and they came out
slightly differently each time, for example "Olaivar" and "Olivar", "Pangan" with
middle initial M. and with A., and "Gonzaga" and "Gongaza". The correct spellings
still need checking against the documents. This is a small live example of why
Topic 1 insists that fixing a misspelled name must correct every record at once.

### How these documents are actually signed

On the CDS copies, several lines carry the printed name of one person but were
signed by somebody else. The user observed all four of these on the physical
paper:

| document and line | what was actually done |
| --- | --- |
| Withdrawal Slip, Approved by (GSU Representative) | Someone else signed on their behalf. No handwritten name, just a signature. |
| RIS, Approved by | Someone else signed, and handwrote their own name with the title "OIC, Chief TSD / In-charge, Office of the PENR Officer". |
| RIS, Issued by | Someone else signed on their behalf. No handwritten name, just a signature. |
| Trip Ticket, Approved by | Someone else signed, and handwrote their own name with the title "OIC, Chief TSD / In-charge, Office of the PENR Officer". |

TSD is the Technical Services Division.

This is the practice described in Topic 6, now confirmed on real paper. None of
it is visible to the system: the printed name never changes, and everything the
substitute adds is handwritten.

### What the GSU staff explained about each signature block

The user asked GSU directly and reported back. This is the authoritative account
of how each line behaves, and it corrects an earlier reading recorded here.

**The correction.** "Section Incharge", "GSU Representative" and "Driver" are not
position titles chosen per person. They are **captions printed on the form
itself**. Only the name is filled in underneath. An earlier note in this appendix
treated them as varying titles, which was wrong.

**Withdrawal Slip.** Three blocks, not two.

| line | who may be chosen | what title prints |
| --- | --- | --- |
| Requested by | any employee | nothing; the caption "Section Incharge" is on the form |
| Approved by | GSU personnel only | nothing; the caption "GSU Representative" is on the form |
| Supplier | nobody. The gasoline station owner or their fuel personnel signs by hand | always blank; this person is not in the system |

**Driver Trip Ticket.**

| line | who may be chosen | what title prints |
| --- | --- | --- |
| Approved by | the PENR Officer, or whoever is OIC at the time | the officer's title |
| I hereby certify... | any employee who can drive | always "Driver", a caption on the form |

**RIS.** Four blocks.

| line | who may be chosen | what title prints |
| --- | --- | --- |
| Requested by | any employee, defaulting to whoever is entering the report | that person's real position title |
| Approved by | the PENR Officer | that person's own position title (see correction below) |
| Issued by | GSU personnel only, with a usual default name | that person's real position title |
| Received by | anyone, or nobody | may be left blank and written in by hand |

**Correction to the RIS "Approved by" row.** This was first written down as a
fixed string, "OIC, PENR Officer", printed whoever signed. The user later
corrected it: the approver is picked from a list, defaulted to the usual person,
and the title printed is that person's own position title. It reads as fixed only
because the same person is nearly always chosen.

### Signing on behalf, as practised

Mostly the person printed on the document is the one who signs, but not always.
Somebody else may sign **per procurationem** (p.p.), meaning on their behalf and
with their authority. In practice this appears as initials, or as a handwritten
full name together with a title such as "OIC, Chief TSD / In-charge, Office of
the PENR Officer". It can be written in any free space near the printed block.

None of this is entered into the system.

### The OIC situation at this office, explained

There is **no actual PENR Officer**. Nathaniel E. Rancho has been the OIC for
years, so in day to day terms he is the officer, and every document prints "OIC,
PENR Officer".

When he himself is away, somebody of the next rank acts as OIC in his place. When
he returns, he resumes acting as the PENR Officer. So the word OIC covers two
different things here: the standing arrangement that has lasted years, and the
temporary cover for a few days. Only the standing one ever reaches paper as a
printed title.

### What this evidence changed

Everything below has now been acted on. It is kept so a later reader can see
which parts of the design came from real documents rather than from guessing.

1. **A fuel report is three documents, each with its own signature blocks.** Topic 5
   had assumed one form per report. Its decision survived; it is now applied per
   document.
2. **A signature block can be left blank.** The CDS RIS has an empty "Received by",
   and the Withdrawal Slip's supplier block is always blank. Recorded under
   Topic 4.
3. **Each line restricts who may be chosen**, and the restrictions differ: any
   employee, GSU personnel only, drivers only, the PENR Officer only, or nobody.
   This became one of the two rules each signature block now carries.
4. **The printed title is decided by the line, not by the person.** Sometimes it
   is a caption on the form, sometimes the person's real position, and sometimes
   a fixed string such as "OIC, PENR Officer". This is what removed the separate
   signatory table altogether. See "The design as it now stands" near the top,
   and the rewritten Topic 2.
5. **The two senses of OIC** are now separated in Topic 6: the standing OIC whose
   title is printed, and the temporary cover that only ever appears in handwriting.

### The other reports, and why they were not examined

Only the fuel documents have been seen. Electricity, water, paper, ESWM and GHG
have not, and the plan was once to give each of them the same treatment: list its
signature blocks, and for each line record who may be chosen and where the printed
title comes from.

That was closed on 31 August 2026 without the paper, by asking the user what could
appear on those forms that this design cannot store, and ruling out each candidate.
The reasoning is recorded under "Where this stands" at the top of this document. If
one of those forms is ever held and shows something unexpected, that section also
says what would have to change.

No document has yet been seen where somebody signs under a working group or BAC
Secretariat designation. That is no longer an open question: the user settled it
by saying such titles are printed on the paper, which makes them captions and
means the system stores nothing for them.
