# Separating employees from users — decisions and open questions

Working document. Updated as we discuss. Each topic has the problem, what we
decided (if anything), and whether it still needs an answer.

Status meanings:
- **Settled** — decided, no need to revisit unless something changes.
- **Open** — being discussed now, or waiting for an answer.
- **Later** — deliberately postponed, not forgotten.

---

## Where this comes from

Topic 10 of the signatory document settled the **decision**: employees and
users become two separate tables (full separation). It did not work out the
**design**. This document does that.

Carried over from that decision, already agreed and not up for discussion here:

- **employee** — one row per person in the office, whether or not they log in.
- **user** — login details only, linked to an employee. Not every employee has
  a user row.
- The name fields move out of `user`.
- A signatory row links to an **employee**, never to a user directly.
- The signatory row keeps its own typed name and position title. Those are
  never read live from the employee record.

---

## What the `user` table held before the split

Kept for reference. This is what `src/lib/server/db/schema/user.ts` held before
any of the work below:

`user_pk`, `username`, `password_hash`, `first_name`, `middle_name`,
`last_name`, `suffix`, `position_title`, `role_fk`, `org_unit_fk`, `status`,
`must_change_password`, `failed_login_attempts`, `locked_until`,
`last_login_at`, `created_by_fk`, `created_at`, `updated_at`.

---

## Topic 1 — Which columns move to `employee`, and which stay on `user`?

**Status: Settled.**

### The problem

Every column of today's `user` table has to land in one of the two tables. Some
are obviously about the person, some are obviously about the login, and getting
one on the wrong side is expensive to correct later.

### Decision

**On `employee` (about the person):**

| Column | Why |
| --- | --- |
| `first_name`, `middle_name`, `last_name`, `suffix` | The person's name. A person has one name whether or not they log in. |
| `position_title` | The person holds the post, not the account. |
| `org_unit_fk` | The person belongs to a division or section, not the account. |

**On `user` (about the login):**

| Column | Why |
| --- | --- |
| `username`, `password_hash` | Only meaningful for someone who signs in. |
| `must_change_password`, `failed_login_attempts`, `locked_until`, `last_login_at` | All describe sign-in attempts. |
| `role_fk` | See below. |
| `account_status` | Renamed from `status`. See Topic 3. |

Both tables keep their own primary key and their own `created_at` /
`updated_at`.

### Why `role_fk` stays on the login — the user asked, and agreed

The word "role" covers two different things:

- **Role in the office** — for example "Chief, Environmental Management
  Division". That is `position_title`, and it lives on `employee`.
- **Role in the app** — a bundle of permissions saying which pages and buttons a
  person may use. That is `role_fk`.

Someone who never signs in has the first and not the second. If `role_fk` sat on
`employee` it would be empty for most of the office, and every piece of code
reading a role would first have to check whether the person even has a login —
a check that is easy to forget. Keeping it beside the username and password
means it only exists where it means something.

---

## Topic 2 — What else does `employee` hold, beyond what moved from `user`?

**Status: Settled.** What the table holds is decided here. What the value
lists are *called* is Topic 3.

### Decisions

- **No employee number.** The office does have a plantilla item number for a
  position, but it only applies to regular employees. Staff here also include
  Contract of Service (COS) and Job Order (JO) people, who have none, so the
  column would be empty for a large part of the office.
- **Add, all optional:** `birth_date`, `sex`, `civil_status`.
- **Add an employee status** meaning "still works here" or "has left",
  separate from whether a login is active or locked.
- **Add `tenure_status`** — how the person is hired: permanent, COS, JO, and
  the other Civil Service Commission (CSC) categories.

### Which of these are required — settled later, while building

`position_title` and `tenure_status` are **required**, not optional.

They were optional at first only because they had been optional on the old
`user` table and were carried across unchanged. The user asked why, and then
corrected the reasoning behind it: the office hires a person *into* a named
position, so somebody in the records with no position at all is not a real case.
Contract of Service and Job Order staff hold no plantilla item, but they still
have a position or a designation.

Still optional: `middle_name`, `suffix`, `org_unit_fk`, `birth_date`, `sex`,
`civil_status`.

One consequence: `scripts/create-admin.ts` cannot write its bootstrap employee
row without them, so it fills in the placeholders "System Administrator" and
"Permanent" alongside the placeholder name "Admin User", and warns at the end
to correct the record on the Employees page.

### The limit the user set

Follow CSC conventions where they exist, so the fields feel familiar to the
office, but do not over-build. This is an environmental management system, not
a personnel system. A light HR flavour is wanted; leave records, payroll, and
service records are not.

---

## Topic 3 — The word "status" now means three different things

**Status: Settled.**

### The problem

After Topic 2 the employee record carries three unrelated ideas that are all
called "status" in ordinary speech, plus the account already has a fourth. If
they share a name, whoever writes a query later will read the wrong one.

### Decision

Give each its own name. The user asked that the same word never be reused for
two different things across the two tables, so the account's plain `status`
column is renamed as well.

| Column | Table | Meaning | Values |
| --- | --- | --- | --- |
| `employment_status` | employee | Does this person still work here? | active, separated |
| `civil_status` | employee | Marriage status | single, married, widowed, separated, annulled |
| `tenure_status` | employee | How the person is hired (CSC) | see below |
| `account_status` | user | Can this account sign in? | active, inactive, locked — **renamed** from `status` |

Note that "separated" appears in two of these with different meanings, which is
unavoidable: it is the ordinary word both for leaving a job and for a marriage
arrangement. Keeping the column names distinct is what prevents confusion.

### `tenure_status` — the list

All seven accepted by the user. CSC categories, plus the two kinds of hiring
that fall outside CSC:

- `permanent`
- `temporary`
- `casual`
- `coterminous`
- `contractual`
- `cos` — Contract of Service
- `job_order` — Job Order

COS and JO are listed apart because those people are not government employees
under CSC rules; they are engaged under a separate joint circular.

### `substitute` is not included — settled

The user confirmed the office never fills a post temporarily while its regular
holder is on long leave, so `substitute` is left out. The list stays at seven.

### Coterminous is not the same as substitute

The user asked whether these are one thing under a different name. They are not:

- **Coterminous** — the appointment lasts only as long as something else lasts:
  the term of the official who appointed the person, or the project and its
  funding. It ends when that ends.
- **Substitute** — someone temporarily holds a post while the regular holder is
  away on long leave, such as maternity or study leave. It ends when that person
  returns.

One is tied to a term or a project, the other to a person being absent.

### `employment_status` stays at two values — settled

The question was whether the record should tell apart the reasons somebody
left: retirement, resignation, end of contract, dismissal.

**It should not.** The user decided to keep the two values as they are, `active`
and `separated`. Their reasoning: recording why a person left starts to overlap
with a personnel system. Their agency has no HR system today, and may get one
later, but either way that information belongs there and not here.

This is the same limit set in Topic 2 — follow the familiar conventions, but
this is an environmental management system, not a personnel one.

---

## What the separation touches — high level

This was the plan, written before the work started, so the size of the change
was visible. **All nine are done.** The "Progress" section near the end of this
document records what actually happened. This list is kept because it is still
the clearest map of which parts of the app the separation reaches.

1. **Database.** New `employee` table. `user` loses the name, position title,
   and org unit columns. All tables were truncated before this work began, so
   there is no data to move.
2. **Login and session.** Signing in looks up the account, but the name now
   lives in the other table, so the lookup needs a join. The signed-in-person
   data handed to every page changes shape (`SessionUser` in
   `src/lib/types/index.ts`, and `src/lib/server/auth/session.ts`).
3. **Sidebar.** `nav-user.svelte` shows the signed-in person's name and reads it
   from the new place.
4. **Role.** Depends on the Topic 1 answer for `role_fk`. The roles screen also
   counts how many people hold each role.
5. **The users admin screen.** The largest piece. One screen and one dialog
   currently create a person and a login together
   (`src/routes/admin/users/`). Topic 5 splits this into two pages.
6. **Org structure screen.** Lists who is assigned to each division or section.
   That link moves from user to employee.
7. **Permissions.** `admin:manage_users` covers this area today. Topic 6 adds
   `admin:view_employees` and `admin:manage_employees` beside it.
8. **Search, sort and filter on the users list.** It sorts by last name, which
   moves to another table.
9. **Setup scripts.** `scripts/create-admin.ts` and
   `scripts/reset-admin-password.ts` write to `user` directly. The first must
   now create an employee as well.

---

## Topic 4 — How `user` links to `employee`

**Status: Settled.**

### The problem

One of the two tables has to carry a column holding the number of a row in the
other table. Which one carries it, and may that column ever be left empty?

These are two separate decisions. Choosing where the link lives does not by
itself prevent an account with no employee — that takes the second decision.

### Decision — the link lives on `user`, and it is required

`user` carries `employee_fk`, pointing at `employee`. The column is **required**:
the database refuses any account row that does not name an employee.

```
employee                       user
--------                       ----
1  Juan Dela Cruz              1  jdelacruz   employee_fk = 1
2  Maria Santos                2  areyes      employee_fk = 3
3  Ana Reyes
```

### Why the link sits on `user`

The same reasoning as `role_fk` in Topic 1. A login always belongs to a person,
so on `user` the column is never empty. Many people have no login, so putting
the column on `employee` instead would leave it empty for most of the office —
Maria's row above, and everyone like her.

There is also a practical point: deleting or disabling a login then touches only
the `user` table, and never modifies the employee record as a side effect.

### Why it is required

The sidebar shows the signed-in person's name, and that name now lives on the
employee row. If a login could exist with no employee, every screen showing a
name would need an extra branch for "this account has no person attached" — a
branch that is easy to forget, and that breaks the page when forgotten.

Making it required in the database, rather than a rule written in application
code, is what makes it reliable: no code path can skip it.

The user confirmed that **every account in this office belongs to a real
human**. There are no accounts for automated jobs or background tasks, which is
the one case that would have argued for allowing an empty link.

### Consequences

- The bootstrap script `scripts/create-admin.ts` must create an employee row
  first, then the login. Two inserts instead of one, inside the same script.
- On the admin screen, a person who is not yet in the employee list is added
  there first, then given a login. One extra step, and it keeps the list of
  office staff from quietly falling out of date.

### One employee, one login — settled

An employee may hold at most one login. The `employee_fk` column on `user` is
unique, so the database refuses a second account for the same person.

The reason is that the system records who did what. If one person held two
accounts, "who changed this record?" would have an unclear answer, and anyone
reading the history would have to remember that two usernames are the same
human. When someone needs different permissions, their role is changed rather
than a second account being created.

---

## The schema as written

Written from the decisions above. Files:
`src/lib/server/db/schema/employee.ts`, `src/lib/server/db/schema/user.ts`,
and `index.ts` which now exports `employee`.

**Applied to the database.** The session running this work was not allowed to
change the database, so the user ran `drizzle-kit push` by hand. It completed
with no problem.

Shown here in its **final** shape, after the second push that made
`position_title` and `tenure_status` required. See "Applied to the database"
near the end for both runs.

```sql
CREATE TABLE `employee` (
	`employee_pk` bigint unsigned AUTO_INCREMENT NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`suffix` varchar(20),
	`position_title` varchar(100) NOT NULL,
	`org_unit_fk` bigint unsigned,
	`birth_date` date,
	`sex` enum('male','female'),
	`civil_status` enum('single','married','widowed','separated','annulled'),
	`tenure_status` enum('permanent','temporary','casual','coterminous','contractual','cos','job_order') NOT NULL,
	`employment_status` enum('active','separated') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `employee_employee_pk` PRIMARY KEY(`employee_pk`)
);

CREATE TABLE `user` (
	`user_pk` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_fk` bigint unsigned NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role_fk` bigint unsigned NOT NULL,
	`account_status` enum('active','inactive','locked') NOT NULL DEFAULT 'active',
	`must_change_password` boolean NOT NULL DEFAULT true,
	`failed_login_attempts` smallint NOT NULL DEFAULT 0,
	`locked_until` datetime,
	`last_login_at` datetime,
	`created_by_fk` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_user_pk` PRIMARY KEY(`user_pk`),
	CONSTRAINT `user_employee_fk_unique` UNIQUE(`employee_fk`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`)
);
```

`user_employee_fk_unique` is what enforces one login per employee.

When this schema was first applied, the application code still referred to
columns that had moved, and nothing worked. That repair is the "What the
separation touches" list above, and it is finished — see "Progress" at the end.

---

## Topic 5 — One admin screen or two?

**Status: Settled — two screens.**

### The problem

Before the split, `src/routes/admin/users/` had one page and one dialog that
created the person and the login together in a single step. After the split
those are two records, so the screen had to become either one page doing both
or two pages.

### Decision

**Two pages.** An employee page listing everyone in the office, and the users
page for logins.

### Why

- **The form was already long.** That dialog asked for ten things: first
  name, last name, middle name, suffix, position title, username, role,
  section, password, active. The employee record now adds birth date, sex,
  civil status and tenure status on top. One dialog for all of it, password
  included, would be tiring to fill in.
- **The two lists are different sizes.** The employee list holds everyone in
  the office, including people who never sign in. The user list holds only
  those with an account. On a single page, every row would carry empty account
  columns for the people who have none.
- **They are different jobs.** Keeping the staff list current is clerical work.
  Creating a login and choosing its role decides who may do what in the system.
  Two pages allow those to be given to different people.

### The drawback — accepted for now, to be improved later

With two pages, hiring someone who needs a login means visiting two places. The
user agrees this is a real cost: it is an extra click just to give someone an
account. They have chosen to accept the two-page split as it stands rather than
design around it now, and to return to it later as a user-experience question in
its own right.

The likely improvement, not yet designed or agreed: a **"Give this person a
login"** action on each row of the employee page, opening the login form with
the person already filled in. Two records, still one journey. This is written
here only so the idea is not lost — it is not a decision.

---

## Topic 6 — Does the Employees page get its own permission?

**Status: Settled — yes, its own keys.**

### Decision

A new `employees` submodule under `admin` in `PERMISSION_DEFS`
(`src/lib/server/permissions.ts`), giving two keys:

- `admin:view_employees` — open the Employees page
- `admin:manage_employees` — add, edit, and remove employee records

### Why

`admin:manage_users` lets someone create a login and assign a role, which
decides who may do what across the whole system. Maintaining the staff list is
not that: correcting a spelling, recording a birth date, marking that someone
has left. Keeping the two apart means a clerk can keep the staff list current
without also being able to create accounts.

It also follows from Topic 5. Two pages doing two different jobs should be
grantable separately, or splitting them gains nothing.

### The Users page still works without these keys

The Users page shows a list of employees so a login can be attached to a person.
That does not require `admin:view_employees` — the key controls opening the
Employees *page*, not reading employee names elsewhere. A user manager can still
create logins normally.

### Running the sync, and the gap it exposed — settled

Adding keys to `PERMISSION_DEFS` changes no table, so the new keys reach the
database only when `npm run sync-permissions` is run. That was held off while
`scripts/create-admin.ts` did not work against the new schema. Once the
bootstrap path was repaired the user ran it, and both keys reached the
`permission` table.

That raised a question: **does the super-admin role actually hold them?** That
role is frozen — the role editor shows its permissions as plain text with
nothing to tick — so a key it does not already hold cannot be granted through
the interface at all.

The locked RBAC decisions (`.claude/skills/rbac-design/SKILL.md`, "Permission
sync") say the script must backfill that role with any `admin:*` key it is
missing, for exactly this reason. The script did not do it. It had three steps:
upsert the keys, report orphans, and re-normalize every role to its implied
keys. Re-normalizing does not help, because nothing implies
`admin:manage_employees` — implication only runs upward, from manage to view to
`admin:view`.

On this database nothing was broken. The user checked, and their super-admin
role holds both keys, because `create-admin.ts` happened to run after the keys
were added to `PERMISSION_DEFS`. But the gap would have bitten the next time an
admin page was added, and the only remedy would have been editing
`role_permission` by hand in MySQL.

### The missing step was added — settled

The user agreed to fix it now rather than wait for a page to break.
`scripts/sync-permissions.ts` now does four things instead of three, matching
the locked decisions. The new third step:

- finds the super-admin role by the permission it holds, `admin:manage_roles`,
  never by name;
- compares what it holds against every `admin:*` key defined in code;
- inserts whatever is missing, inside one transaction;
- names what it added, so the run is not silent;
- and if no role holds that key at all — a fresh database where
  `create-admin.ts` has not run — says so and skips, rather than failing.

Staff keys are deliberately left out of the comparison. A user holding
`admin:view` is sent to the admin area, where a staff key could never be used.

The lookup that turns a key into its row number was moved above this step,
since the re-normalizing step below needs the same thing and it is now read
once for both.

**Run and verified by the user.** The output was:

```
30 permission(s) synced, 0 new.
"Super Admin" already holds every admin permission.
All roles already hold their implied permissions.
```

Which is the expected result on this database: the two employee keys were
already in the table from the earlier run, and the super-admin role already
held them. Nothing was changed, which is what a correct backfill does when
there is nothing to backfill.

Worth noting for next time: the first attempt at this run showed no such line
at all, because the fix was committed on `main` while the checkout was on
`feature/employee-user`. Merging `main` into the feature branch was what made
the new step reachable.

---

## Topic 7 — What the Employees page shows

### Status

**Settled.** The page was built on a "go ahead" rather than after a discussion,
so nothing on it had ever been agreed. That is why the topic was reopened in a
later session. By then the user had used the page for real work and reported
that the columns, the search and the filters all work as they need them to.
Those are agreed as built.

**One part had to be reopened and is now closed too.** The user remembered the
duplicate-name rule and said plainly that adding the same person twice must not
be allowed — warning and letting the save through was wrong. That became Topic
7a below, which is settled, built and tested.

### The problem

The Employees page did not exist. Before writing it, we had to know which
facts appear as columns in the list, and which are only visible when you open
one person to edit them. The employee record now holds personal things —
birthday, sex, civil status — that were never on the old Users page.

### The five columns

| Column | What it shows |
|---|---|
| Name | The full name, with the position title underneath it. |
| Section | The division or section the person belongs to. |
| Tenure | Permanent, temporary, casual, coterminous, contractual, COS, Job Order. |
| Employment | Employed, or no longer employed. |
| Has login | The username, or "No account yet". |

### Birthday, sex and civil status are not columns

They appear only when a person is opened for editing, grouped under a
"Personal details" heading. Two reasons: nobody scans a staff list looking
for a birthday, and these are personal details that do not need to sit on
screen where anyone walking past the desk can read them. They are still one
click away.

### Why "Has login" is there

It is the one column that reaches across to the Users page, and it answers the
question the separation creates — *who in this office still has no account?*
Without it an admin would have to open both pages and compare them by hand.
An empty one links to the Users page.

### Also decided while building, and kept

- **COS and Job Order are shortened in the table** and spelled out in full in
  a tooltip, because "Contract of Service" does not fit in a column.
- **Deleting somebody who has a login is refused**, with a sentence saying to
  delete the account first or mark them as no longer employed instead.
- **Marking somebody as no longer employed does not switch off their account.**
  True when this page was built, and **Topic 8 has since overtaken it.** The
  account row is still left alone, but that person can no longer sign in and is
  signed out at once. The messages that said otherwise were rewritten. Read
  Topic 8 rather than this line.
- **A repeated name is a warning, not a refusal.** This was the reasoning at
  the time: two people can genuinely share a name in a small office, so the
  save was allowed to go through. **The user has since rejected this.** Adding
  the same person twice must be refused, not merely flagged. See Topic 7a.

---

## Topic 7a — Stopping the same person being added twice

### Status

**Settled, built and tested.** What identifies a person, how the birth date is
handled, what happens on each kind of match, how somebody returning to the
office is handled, and the wording of every message are all decided below and
approved by the user.

The type check and the production build pass, the three scenarios were run
against the live database with the test rows cleaned up afterwards, and the
user has since used the pages in a browser and found no problem.

### The problem

The Employees page warns when a new person has the same name as somebody
already in the system, and then lets the save go through anyway. The user has used
the page for real and rejected that: adding the same person twice must be
**refused**, not flagged.

Getting there needs an answer to a harder question — what actually identifies a
person? A name is not enough:

- Two people in one office can genuinely share a name.
- A woman commonly takes a new surname when she marries, so the same person can
  appear under two different surnames years apart.
- Somebody who left the office can come back, and their old record is still in
  the system, marked as no longer employed.

### The approach the user had tried before, and why we are not repeating it

On another system the user built a checker that compared the surname, then the
first name, then the suffix (Jr., Sr.), with a separate branch for women that
allowed for a changed surname — a branch that only ran when the sex field said
female.

The user themselves spotted the weakness: **sex can be entered wrongly.** One
mistyped field and the whole check behaves differently for that person, silently.
That branch is dropped.

### Decision — the birth date is the anchor, not the name

A birth date never changes. Marriage does not change it. It is the same for a
man or a woman, the same for Permanent and for Job Order, and the same for
somebody who left and came back. Two people in one office sharing a full name
*and* a birth date is close to impossible.

Anchoring on it removes the need to read the sex field at all.

| What matches an existing record | Outcome |
| --- | --- |
| First name + last name + birth date, and that person is **still employed** | **The save is stopped.** This is the same person, already active. |
| First name + last name + birth date, and that person is **no longer employed** | **The save is stopped, and bringing them back is offered instead.** See the returning-person decision below. |
| Birth date matches, surname differs | **Possible match, shown to the admin, save allowed.** This is the married-name case. |
| Full name matches, but one of the two records has no birth date | **Possible match, shown to the admin, save allowed.** |

The first two rows are both exact matches and both stop a second record being
created. They differ in what the admin is offered afterwards, which is why they
are listed apart.

The check looks at **every** employee record, including people marked as no
longer employed. Somebody returning to the office must be found, not added a
second time.

### Decision — the birth date is required of people, but the column stays optional

The birth date was optional in Topic 2. For it to anchor the check it has to be
present, so:

- **The Employees form requires it**, and the server checks it too, not only the
  browser. Every person a human adds therefore has one.
- **The database column stays nullable.**

The reason for that split is `scripts/create-admin.ts`, which creates the very
first administrator on an empty database. It writes a placeholder person —
"Admin User", position "System Administrator", tenure "Permanent" — because it
cannot know the real details. Two alternatives were considered and rejected:

- **Write a fake date such as 1900-01-01.** Worse than leaving it empty. Empty
  means "we do not know"; a fake date means "we know, and it is 1900" — a false
  value sitting in the one field the duplicate check trusts.
- **Have the script ask for a real birth date.** Inconsistent: that row is
  already entirely placeholders, so asking for one true fact in the middle of
  them is odd, and it comes before anyone can even sign in.

Leaving it empty also keeps the third rule in the table above alive rather than
making it dead code. If the column could never be empty, "one of the two records
has no birth date" would never happen.

The gap is small and closes by itself. The setup script already tells whoever
runs it to correct that placeholder record on the Employees page, and doing so
goes through the form, which requires a birth date. So the empty value exists
only between first setup and that first correction.

### Speed is not a concern

The user raised it. This office is at most a few hundred records, and the check
is a single indexed lookup. It will feel instant. No special design is needed
for it.

### Decision — an exact match blocks, a possible match only warns

The two outcomes are treated differently on purpose.

**An exact match refuses the save.** First name, last name and birth date all
agreeing means it is the same person, and a second row for them is wrong.

**A possible match lets the save go through, but not silently.** The admin is
shown who the possible match is, before the record is saved, so they can compare
the two and decide. The user's reasoning is that a possible match is genuinely
ambiguous — the office can hold two different people whose records look alike —
so the system should inform rather than stand in the way.

### Decision — editing a person is checked the same way

Renaming somebody, or correcting their birth date, can collide with a record
already in the system just as adding can. So an edit runs the same check and gets the
same two outcomes: exact match refuses, possible match warns and continues.

The record being edited is of course left out of its own comparison, or every
edit would match itself.

### Decision — what the warning has to say

The user's requirement is that the message states the problem **and** what can
be done about it, in plain words. It must not simply announce that something
looks similar and leave the admin to work out the rest.

The point the message has to get across is that **either record may be the wrong
one**. Perhaps the person already in the system was saved by mistake. Perhaps the one
being entered now is the mistake. The admin is the only one who can tell, so the
message asks them to check both records rather than implying the new one is at
fault.

The user's own phrasing for the heart of it: *"Please check both information."*
The wording that came out of this is written out in full further down, under
"the wording of the messages", and was approved unchanged.

### Decision — somebody returning to the office

Their existing record has its employment status set back to **active**. That is
the whole of it.

No history of when they left and came back is kept. The user was explicit that
this is a personnel-system feature and does not belong here — the same limit set
in Topic 2 and Topic 3. This is an environmental management system.

### Decision — an exact match on somebody who has left offers to bring them back

The refusal and the returning-person rule had to meet somewhere, because an
admin whose colleague rejoins the office does not think "I will reactivate her".
They think "she is joining us again" and open the add form. The exact-match rule
then stops them, and without a way forward that is the moment somebody changes a
spelling to force the save through — creating the very duplicate the check
exists to prevent.

So when the exact match is a person marked **no longer employed**, the form
shows an alert offering **"Bring this person back"**.

**The alert stays inside the form.** Nothing navigates away, nothing redirects.
The admin has a filled-in form on screen and must not lose it.

**It carries one action and a way out.** The action brings the person back. The
dismiss is there because the admin may realise they mistyped the birth date, or
that this is a different person after all — an alert with no way out leaves them
accepting something they may not want.

If the matched person is **still active**, there is nothing to offer. It is a
plain refusal saying the person is already in the system.

### Decision — bringing somebody back also saves what was typed

The button does not only flip the employment status to active. It also applies
the details the admin has just typed.

The reason is that people rarely return to the same job. Somebody who left as
Contract of Service may come back as Permanent, in a different section. The
admin has already typed the current details into the form, so throwing them away
would leave the record showing a job the person no longer holds, and would rely
on the admin remembering to go and correct it afterwards — the same half-finished
pattern that Topic 8 had to fix.

The fields that can change this way are **position title, section, tenure
status, and civil status**. Civil status matters more than it first appears: a
woman may have married while away, which is the same circumstance behind the
changed-surname rule above.

Name and birth date are not in that list. An exact match means they already
agree, by definition.

**The alert says what will actually change**, field by field, as old and new —
for example that the tenure goes from Contract of Service to Permanent. Only
fields that genuinely differ are listed; if nothing else differs, the alert says
so plainly rather than showing an empty list. The point is that the admin can
see what they are agreeing to before they agree to it.

### Decision — the wording of the messages

Approved by the user with no changes. The names below are examples; the real
values come from the records being compared.

A note on one word that was rejected. An earlier draft said a person was
"already on file". The user objected that "file" sounds like a paper folder or
a computer file, so the sentence reads as though it is about a document rather
than about a person. Everything now says **"already in the system"**, and that
correction applies to any wording added later.

**1. Refusal — the person is already there and still employed.**

> **This person is already in the system**
>
> Juan Dela Cruz, born 12 March 1990, is already recorded and is still
> employed. The same person cannot be added twice.
>
> *Already recorded as:*
> Engineer II · Environmental Monitoring Section · Permanent
>
> If you think this is a different person, please check both records. The birth
> date on one of them may have been typed wrongly.
>
> `Close`

The matched person's details appear inside the message so the two can be
compared without leaving the form.

**2a. Warning — same birth date, different surname.**

> **Someone with the same birth date is already in the system**
>
> The person you are adding has the same birth date as someone already
> recorded, but a different surname.
>
> *Already recorded as:*
> Maria Santos · born 5 June 1988 · Administrative Officer II · Finance Section
>
> This may be the same person, if her surname changed after she married. It may
> also be two different people. Please check both records before you continue.
>
> `Go back and check`   `Yes, this is a different person`

**2b. Warning — same name, and one record has no birth date.**

> **Someone with the same name is already in the system**
>
> Juan Dela Cruz is already recorded, but that record has no birth date, so the
> same person cannot be told apart from a different one.
>
> *Already recorded as:*
> Engineer II · Environmental Monitoring Section · Permanent
>
> Please check both records before you continue.
>
> `Go back and check`   `Yes, this is a different person`

The two possible-match situations get their own message rather than sharing one
that tries to cover both, because the reason for the doubt is different each
time and the admin needs to know which one they are looking at.

The second button states the decision the admin is making — *"Yes, this is a
different person"* — rather than saying "Save anyway". Pressing past a warning
and confirming a belief are different acts, and the label should be the second
one.

**3. Bring this person back.**

> **This person worked here before**
>
> Maria Santos, born 5 June 1988, is already in the system and is marked as no
> longer employed. You do not need to add her again. You can bring her record
> back instead.
>
> *These details will be updated:*
> Position: Administrative Aide IV → Administrative Officer II
> Tenure: Contract of Service → Permanent
> Section: Not assigned → Finance Section
>
> `Cancel`   `Bring this person back`

When nothing else differs, the list of changes is replaced by one sentence:

> Nothing else will change. The details you entered are the same as the ones
> already recorded.

**On the edit form the wording shifts**, because nothing is being added. For
example, "The same person cannot be added twice" becomes "These changes would
make this person the same as someone already recorded." The meaning and the
buttons stay the same.

### What was built

All of the above, in one commit on `feature/employee-user`:

- **`src/routes/admin/employees/duplicate-check.ts`** — the matching rules,
  written once and run in two places: live in the dialog as the admin types,
  and again in the server actions, which cannot be bypassed.
- **`duplicate-alert.svelte`** — the three messages, shown inside the form.
- **`+page.server.ts`** — the birth date is now required, an exact match is
  refused in `create` and `update`, and a new `reinstate` action brings a
  returning person back.
- **`context.svelte.ts`** — the live check replaces the old name-only warning.
- **`scripts/create-admin.ts`** — a note recording why its placeholder row
  keeps an empty birthday rather than a made-up date.

The type check and the production build both pass. The matching rules were
also run against a set of made-up people covering every rule, including two
who share a birthday and a record with no birth date at all.

### Four things decided while building — worth a look

These follow from the decisions above but were not discussed, so they are
listed apart rather than folded in as though they had been agreed.

**A possible match is now about the whole name, not only the surname.** The
rule was written as "birth date matches, surname differs". As built it is
"birth dates match, the name is not exactly the same", which also catches a
first name written differently — "Ma." instead of "Maria", which is common.
The surname case still works exactly as described.

**Bringing somebody back is offered only while adding.** On the edit form an
exact match is a *different* row, so bringing it back would write the edited
person's details over that other person. There the match is simply refused,
and the admin is told to open that record instead.

**The check is skipped on an edit that leaves the name and birthday alone.**
Two people can genuinely share a birthday. Without this, correcting a typo in
one of their positions would raise the same possible-match question on every
save — a question already settled when the record was created. The same skip
was put in the server action, where it also prevents an admin being trapped:
if two matching records somehow already existed, neither could be edited.

**The possible-match message has one button, not two.** The approved wording
had "Go back and check" beside "Yes, this is a different person". Inside the
form the first has nothing to do — the admin corrects the fields directly —
so it was left out. The Save button stays switched off until "Yes, this is a
different person" is pressed, which is what makes the answer explicit.

### Checked against the real database

The three scenarios were run against the live database rather than against
made-up data, using the same matching rules the page uses. Test rows were
created, checked, and deleted again, leaving the table with the two rows it
started with.

| Scenario | Result |
| --- | --- |
| Adding the same person a second time | Exact match, and the person is still employed — refused, nothing offered |
| Marking that person as no longer employed, then adding them again | Exact match, and the person has left — bringing them back is offered |
| Editing somebody without touching their name or birthday | The check is skipped, as intended |
| Adding somebody who shares a birthday with two existing people | Possible match, save allowed once answered |
| Same name, different birthday | No match — treated as two different people |

**One assumption was worth checking on its own.** The whole comparison rests on
the stored birthday being text in the same shape the browser's date field
submits. A plain read of the column through the MySQL driver returns a date
object at 16:00 UTC — which, read carelessly, is the day before. Drizzle's
`mode: "string"` on that column is what avoids it, and a query through the
app's own schema was run to confirm: it returns `"2002-05-27"`, a string, and
re-entering the person exactly as stored is correctly refused.

### Used in a browser — nothing left open

The user clicked through the pages and reported no problem. That covers the
part the database run could not reach: the alerts appearing and disappearing as
the fields are typed, the "Bring this person back" button submitting, and the
Save button switching on only once the possible-match question is answered.

Topic 7a is finished.

One thing to expect rather than be surprised by: the placeholder "Admin User"
row still has no birthday, so the first time it is edited the form will ask for
one. That is the intended behaviour, not a fault.

The four points decided while building, listed above, were seen on screen and
left as they are.

---

## Topic 8 — Somebody leaves the office, but their account still works

**Status: Settled and built.**

### The problem

Marking a person as "No longer employed" on the Employees page does nothing to
their login. They can still sign in. The account keeps working until somebody
remembers to go to the Users page and switch it off as a second, separate
step on a second page.

At that point the code only showed a warning, which depended on the admin
reading it and then remembering to act on it.

### Decision — the sign-in itself refuses them

Three options were put to the user:

- **A** — leave it: warn only, and the admin does the second step by hand.
- **B** — marking somebody as no longer employed also switches their account
  off at the same moment.
- **C** — the sign-in refuses anyone marked as no longer employed, whatever
  their account status says.

**The user chose C**, in their words: why would we let a person log in if that
person is no longer working here.

C was also the recommendation. The reason is that it cannot be forgotten. B
still leaves a gap, because an admin could switch the account back on later
without ever touching the employment record, and the account would then work
again for somebody who has left.

### The known cost, accepted

The Users page would show such an account as "Active" while it actually refused
to work. That is contradictory on screen, so C is only honest if the Users page
also shows that the person has left. That was treated as part of the work rather
than a follow-up, and it was built — see "What was built" below.

### What building this involves

The plan, listed so none of it was missed. Item 5 mattered most: three places
in the code told the admin the opposite of what was about to become true.

1. **`src/lib/server/auth/session.ts`** — `validateSessionToken` already inner
   joins `employee`. Treat the session as invalid when
   `employee.employment_status` is not `active`. This is what makes an open
   session stop working immediately rather than at its eight-hour expiry.
2. **`src/routes/(auth)/login/+page.server.ts`** — refuse the sign-in with a
   plain sentence. It must not hint at whether the password was right.
3. **The Employees page `separate` and `update` actions** — delete that
   person's `session` rows when they are marked as no longer employed, so they
   are signed out at once.
4. **The Users page** — show "Person has left" on those rows. `UserRow`
   already carries `employee.employmentStatus`, so no query change is needed.
   The account editor should also not offer to set such an account to active.
5. **Three existing messages become wrong and must be rewritten:**
   - the alert in `add-edit-employee-dialog.svelte` headed "Their account will
     still work";
   - the warning toast in `employee-actions-cell.svelte` saying the account
     "can still sign in";
   - the comment in the `separate` action explaining that the login is
     deliberately left alone.

### What was built

All five items, plus two small decisions taken while building. `npm run check`
reports 0 errors and `npm run build` succeeds. It was tested in a browser
afterwards — see "Tried against the running system" below.

1. **`session.ts`** — a session whose employee is not `active` is deleted and
   treated as no session. Deleting rather than only refusing means the row does
   not sit there until its eight-hour expiry.
2. **The sign-in** — the lookup now joins `employee` and refuses before it
   looks at the account status, with: "This account belongs to somebody who no
   longer works here, so it can no longer be used. Contact your administrator."
   It says nothing about the password.
3. **The Employees page** — a shared `endSessionsForEmployee` helper deletes
   that person's `session` rows. Called from `separate`, and also from `update`
   when the edit is what marks them as having left. The editor was the second
   way in, and would otherwise have left the person signed in.
4. **The Users page**
   - The status column shows a "Person has left" badge, and greys out the
     account's own status behind it, so the row never reads plain "Active" for
     an account that does not work. The tooltip explains where it comes from.
     The "New password" reminder is hidden on those rows.
   - The account editor shows an information box saying the person no longer
     works here and how to undo it, and the Active switch is disabled — shown
     rather than hidden, so the stored setting is still visible.
   - The `update` action refuses switching such an account back on, so the
     rule does not depend on the editor.
5. **The three messages** — all rewritten to say the opposite of what they said,
   plus the comment in the employees context describing `leavingWithLogin`.

### Tried against the running system — it works

The user tested the whole path in a browser, and it behaved as designed:

1. Added a person on the Employees page.
2. Created a new role from one of the templates.
3. Gave that person a login on the Users page.
4. Signed in as them in a private window. It worked, and asked them to set
   their own password — the temporary-password flow is intact.
5. Back in the ordinary tab as super admin, marked them as no longer employed.
6. Refreshed the private tab. It returned to the login page.

Step 6 is the part that matters: the open session stopped working at the next
request, rather than lasting until its eight-hour expiry.

7. On that login page, typed the same person's correct username and password
   again. The sign-in was refused, and the message appeared under the password
   field.

Steps 6 and 7 are two different pieces of code — one ends the session that
already existed, the other refuses a new one — and both now work.

### Decided while building, worth revisiting

- **The Active switch is disabled rather than forced off.** An account that was
  active when the person left keeps showing "Active" in the editor, greyed out.
  The alternative — quietly setting it to inactive on the next save — would
  change stored data without being asked. Showing the true stored value and
  refusing to change it seemed more honest, but the opposite is defensible.
- **The status filter still counts such an account under its stored status.**
  Filtering the Users page by "Active" still lists somebody who has left. Adding
  a separate filter option for them was not part of Topic 8, so it was left
  alone.
- **An unrelated typo was fixed in the same file.** The failed-password branch
  of the sign-in said "Invalid username or passwordss.", which also made the two
  supposedly identical messages differ — the exact thing that branch is worded
  to avoid.

---

## Progress — what has been changed in code

### Done

- **Schema** — `employee.ts` added, `user.ts` rewritten, `index.ts` exports it.
  Applied to the database by the user with `drizzle-kit push`.
- **Permission keys** — `employees` submodule added to `PERMISSION_DEFS`
  (`src/lib/server/permissions.ts`), giving `admin:view_employees` and
  `admin:manage_employees`.
- **The sign-in path** — repaired, and free of type errors:
  - `src/lib/server/auth/session.ts` joins `employee` when validating a session.
    The join is inner, since `user.employee_fk` cannot be null.
  - `src/lib/types/index.ts` — `SessionUser` now carries a nested `employee`
    object holding the name, position title and org unit. Kept nested rather
    than flattened so it stays visible which table each field came from.
  - `src/hooks.server.ts` builds that shape into `locals.user`, passing only the
    fields the app displays. Birth date, sex and civil status stay on the server.
  - `nav-user.svelte` reads the name, initials and position from
    `user.employee`.
  - `login/+page.server.ts` checks `accountStatus` instead of `status`.
- **Bootstrap scripts**
  - `scripts/create-admin.ts` inserts the employee row first, then the login
    pointing at it. Both inserts run in one transaction, so a taken username
    does not leave an orphan employee behind when the prompt retries.
  - `scripts/lib/super-admin.ts` reads `u.account_status` instead of `u.status`.
- **The Organizational Structure page** — the part that lists who is assigned to
  a division or section now reads `employee`, since `org_unit_fk` moved there.
  - The endpoint moved from `[org_unit_pk]/users` to `[org_unit_pk]/employees`.
  - It filters on `employee.employment_status`, not the old `user.status`, so
    someone who has left the office stops being listed.
  - The two components were renamed to match, and the dialog now reads
    "Assigned Employees".
  - Deleting an org unit now checks for a linked **employee**. The old check
    looked at `user`, which after the split would have let a populated division
    be deleted.
  - Side effect worth noting: the list now includes people with no login, which
    is what the page was always trying to show.

- **The Employees page** — new, at `/admin/employees`, with the five columns
  from Topic 7, an editor, and a delete guard. Added to the admin sidebar.
- **The Users page** — now about logins only.
  - Adding an account picks somebody already on the Employees page instead of
    typing a name. People who already have an account stay in the list but
    cannot be picked, so they do not read as missing.
  - The person is locked when editing. A login belongs to the person it was
    made for; moving it elsewhere is a new account, not an edit.
  - The name, position and section are read from the joined employee row and
    kept nested, matching how `SessionUser` is shaped.
  - Every use of the old `status` column became `account_status`.
- **Shared between the two tables** — the filter dropdown moved to
  `src/lib/components/faceted-filter.svelte` and its counting helpers to
  `src/lib/utils/facets.ts`, rather than being written twice.
- **Position and tenure made required** — see Topic 2. The columns became
  `NOT NULL`, both fields became required in the editor, and the table dropped
  the blank branches it carried for them.
- **Sign-in refuses anybody who has left** — Topic 8, in full: the session
  check, the sign-in check, signing them out at the moment they are marked, the
  "Person has left" badge and the disabled Active switch on the Users page, and
  the three messages that said the opposite.

`npm run check` reports **0 errors**, down from 54. `npm run build` succeeds.

### Applied to the database

Two `drizzle-kit push` runs, both done by the user:

1. The separation itself — the new `employee` table, and `user` rewritten to
   hold only login columns.
2. `position_title` and `tenure_status` made `NOT NULL`.

### Verified by the user

- `npm run create-admin` runs cleanly against the separated schema, and signing
  in and changing the password both work. This was checked after the first
  push, before the two admin pages existed.
- **The Employees page, the Users page, and Topic 8 all work in a browser.** In
  one sitting the user added a person, created a role from a template, gave
  that person a login, signed in as them in a private window, set a password,
  marked them as no longer employed from the admin tab, was returned to the
  login page on the next refresh, and was then refused when signing in again
  with the correct password.
- `npm run sync-permissions` runs with the new backfill step and reports that
  the super-admin role already holds every admin permission.
- **`scripts/create-admin.ts` works against the finished schema.** The user
  truncated every table and ran it again from empty. It completed with no
  error, which proves the placeholder position title and tenure it writes
  satisfy the two columns that became required.
- **The Organizational Structure page works.** Adding a unit, renaming a
  section, and deleting a unit were all tried after the context import was
  repaired.
- **The duplicate-person check works.** Its rules were run against the live
  database, and the user then used the Employees page in a browser and found
  no problem. See Topic 7a.

### Merged and pushed

The work reached `main` in two merge bubbles: `feature/employee-user` for the
separation itself, and `feature/org-unit` for the Organizational Structure
fix, which belongs to that area rather than to this feature.

### Not tested yet

Nothing is left. Every item that was on this list has been tried against a
running system, and the results are in "Verified by the user" above.

### The next piece of work

**Nothing.** Topic 7a was the last outstanding work, and it is designed,
agreed, built, checked against the live database, and used in a browser. No
migration was needed — `birth_date` stays nullable, and the requirement lives
in the form and the server action.

One idea has still never been discussed: the **"Give this person a login"**
shortcut described at the end of Topic 5. It is not a decision, and no work on
it is planned.

Everything in this document is settled, built, and tested.

---

## Topics not opened yet

Listed so they are not forgotten. Not discussed, no decisions.

- **The "Give this person a login" shortcut** on each row of the Employees
  page, described at the end of Topic 5. An idea only.

**Migration order** used to be listed here and no longer applies. There was
never any data to preserve — every table was empty when this began — and the
code was changed in a workable order as the work went along.
