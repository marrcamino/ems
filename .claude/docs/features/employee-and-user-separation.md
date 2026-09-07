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
- Anybody signing a document is an **employee**, never a user directly.

**Two of the points carried over here have since been overturned**, on 27 August
2026, once somebody looked at a real fuel document. They used to say that a
signatory row links to an employee and keeps its own typed name and position
title, never read from the employee record.

There is no signatory row at all now, and no typed title: a document points at a
version of the employee, and the name and title are read from that version. The
correction changes nothing about the separation this document designs, and
Topic 9 below is where those versions live. The signatory document explains why
the original assumption was wrong.

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
row without them. It used to fill in the placeholders "System Administrator" and
"Permanent" alongside the placeholder name "Admin User"; Topic 11 replaced that
with asking whoever runs the script for the real details.

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

### The super admin is an employee too — settled

The user came back to this on 2 September 2026 with a doubt: an admin account
is usually held by one person, and the common office habit is to hand that same
account down to whoever takes over the post. If the account outlives the person,
does linking it to an employee record still make sense?

The decision is that it does, and the habit is the part that changes.

- **Every super admin in this office is an office employee.** The user confirmed
  this directly. It is the administrative or IT person, who belongs in the
  Employees list whether or not they ever sign in, so the link records something
  that is true rather than inventing a person.
- **Handing the password down is what breaks the records.** The system stores
  who added, changed and corrected each employee record, and will store who
  approved each fuel withdrawal. If two or three people have used the same
  login over the years, "who corrected this?" has no answer at all. The link
  cannot fix that on its own, but a shared account guarantees the failure.
- **The handover is a new account, not a new password.** When the person holding
  the super admin post leaves, a second super admin user is created for the
  person taking over, and the old one is deactivated. The rules in the RBAC
  design already allow this: more than one user may hold the super-admin role,
  the system refuses to let the number of active holders reach zero, and it
  warns when an action would take that number from two to one. The two accounts
  can overlap for as long as the handover takes.

The alternative — letting `employee_fk` be empty so a login can exist with no
person behind it — was reconsidered here and rejected again for the reason
already given above: the name lives on the employee row, so a login with no
employee is a login with no name, and every screen showing a user would need a
branch for it.

What this did expose is that `scripts/create-admin.ts` wrote a person who did
not exist. That was a real fault, and it is Topic 11, which has since fixed it.

---

## The schema as written

Written from the decisions above. Files:
`src/lib/server/db/schema/employee.ts`, `src/lib/server/db/schema/user.ts`,
and `index.ts` which now exports `employee`.

**Applied to the database.** The session running this work was not allowed to
change the database, so the user ran `drizzle-kit push` by hand. It completed
with no problem.

Shown here as it stands after the third change, which added
`position_short_form` and the `employee_history` table. See "Applied to the
database" near the end, which also explains why that change was made with plain
SQL rather than a push.

```sql
CREATE TABLE `employee` (
	`employee_pk` bigint unsigned AUTO_INCREMENT NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`suffix` varchar(20),
	`position_title` varchar(100) NOT NULL,
	`position_short_form` varchar(50),
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

`employee_history` was added later and is described in Topic 9, together with
the reason its foreign key cascades where every other one restricts:

```sql
CREATE TABLE `employee_history` (
	`employee_history_pk` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_fk` bigint unsigned NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`suffix` varchar(20),
	`position_title` varchar(100) NOT NULL,
	`position_short_form` varchar(50),
	`valid_from` date NOT NULL,
	`valid_until` date,
	`created_by_fk` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `employee_history_employee_history_pk` PRIMARY KEY(`employee_history_pk`)
);
```

`employee_fk` references `employee` with `ON DELETE cascade`; `created_by_fk`
references `user`.

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

The reason for that split *was* `scripts/create-admin.ts`, which creates the
very first administrator on an empty database. It wrote a placeholder person —
"Admin User", position "System Administrator", tenure "Permanent" — because it
did not ask who was running it. Writing a fake date such as 1900-01-01 for that
row was considered and rejected: empty means "we do not know", while a fake date
means "we know, and it is 1900", a false value sitting in the one field the
duplicate check trusts.

**That reason no longer holds.** Topic 11 removed the placeholder row — the
script asks for the person's real details instead, the birth date among them.
The column still stays nullable, for the reason given below.

The column stays nullable for now regardless, because it keeps the third rule in
the table above alive rather than making it dead code. If the column could never
be empty, "one of the two records has no birth date" would never happen.

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
  keeps an empty birthday rather than a made-up date. Topic 11 has since
  removed that row altogether: the script asks for a real birthday, so the
  note and the row it explained are both gone.

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

One thing to expect rather than be surprised by, written while Topic 7a was
being built: the placeholder "Admin User" row still has no birthday, so the
first time it is edited the form will ask for one. That is the intended
behaviour, not a fault. **This no longer applies.** Topic 11 has removed the
placeholder row — the bootstrap script asks for a birthday like every other
record, so on a database set up from now on there is no such row to edit.

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

## Topic 9 — Keeping every version of a person's name and position

### Status

**Settled and built, 31 August 2026.** Designed in the signatory discussion,
built here, tested in a browser by the user the same day.

### The problem

A printed document has to keep showing the name and the position title that
were on it the day it was filed. If a Trip Ticket pointed at the employee
record itself, then a woman who married and changed her surname would silently
change every document she had ever signed, and a promotion would rewrite last
year's paperwork.

So documents point at a **version** of a person rather than at the person, and
something has to hold those versions.

### Decision — a second table, with `employee` keeping the current copy

`employee_history` holds one row per version of a person's name and position
title, with the dates that version was in use. `employee` keeps its own name
and position columns as the current copy, so an ordinary lookup of somebody
stays one simple read instead of a search through history.

The two can disagree, and if they ever did, a document would print something
different from what the Employees page shows and nobody could tell which was
right. The whole arrangement therefore rests on one discipline: **both tables
are always written in the same transaction, by one function.**

The columns:

| column | why |
| --- | --- |
| `employee_history_pk` | the value a document will store |
| `employee_fk` | which person this is a version of |
| `first_name`, `middle_name`, `last_name`, `suffix` | the name in this version |
| `position_title` | the full title in this version |
| `position_short_form` | what is actually printed, for example `AO-I/Supply Officer` |
| `valid_from`, `valid_until` | the first and last day this version was correct |
| `created_by_fk` | who made this version |
| `created_at` | bookkeeping only, never used to choose a version |

### Why this one foreign key cascades, when everything else restricts

`employee_fk` deletes with `onDelete: cascade`, which is the opposite of the
`restrict` used everywhere else in this schema.

With `restrict`, every employee would have become undeletable the moment they
got their first version, which is immediately after the backfill. The delete
button on the Employees page would have started failing for everybody,
including somebody added by mistake five minutes earlier.

The protection still arrives, just from the other side. When documents exist, a
document will hold a history row with `restrict`. Deleting an employee will
then try to cascade into a row a document is holding, the database will refuse
the whole delete, and the person stays — which is correct, because somebody
named on a filed document must not disappear.

### Why the short form is allowed to be empty

The boxes on the paper forms are small, so the documents never print a full
position title. Somebody has to type the short form by hand, because no rule
worth trusting turns "Administrative Officer I (Supply Officer)" into
"AO-I/Supply Officer".

Nobody already in the system has one, so a column that refused to be empty
would have made the backfill impossible without inventing values, and would
have blocked an admin from correcting a birthday until they had invented an
abbreviation for that person. The rule that it must be filled in belongs to the
document that prints it.

**Write this down for the report work:** a document that prints a short form
must refuse to print when the short form is missing, rather than printing a
blank line.

### Decision — who made a version is recorded; the correction log is not built

The user chose to add `created_by_fk` and to leave the rest for later.

The signatory document also describes a second table,
`employee_history_correction`, logging spelling fixes, and a screen that can tell
a spelling fix apart from a real name change.

Neither was built, because the log has nothing to record until such a screen
exists. The consequence is real and should not be forgotten: **a spelling fix
currently behaves like a name change.** Correcting "Olivar" to "Olaivar" closes
the misspelled version and opens a corrected one, so a document filed before
the fix keeps pointing at the misspelling. Nothing is lost — the wrong version
is still there — but repairing it properly is the whole of **Topic 10**, which
is designed and not yet built.

### Decision — every existing employee starts from a fixed early date

`scripts/backfill-employee-history.ts` gave everybody already on file their
first version. It is safe to run twice, because it skips anybody who already
has one.

The date those versions start from was a real decision, and the reasoning
matters more than the value. A document does not ask who is employed today. It
asks **who was valid on the date written on the paper**, and paper is always
typed into the system after it was signed. If a backfilled version had started
on the day the script happened to run, then a slip filed the week before would
have found nobody and could not have been completed. That is the normal case,
not an unusual one.

So every backfilled version starts on **2000-01-01**. This is not a claim that
anybody was employed in 2000. It only means no document old enough to matter
falls outside the version. Topic 8 of the signatory document already settled
that reports for periods before the system goes live are not needed, so nothing
is lost, and the honest-looking alternative — each person's own `created_at` —
would have broken ordinary back-dated entry from the first day.

### Decision — changes from now on take effect today, with no date field

The same question comes back for changes made from now on, and the user chose
the simpler answer: a change takes effect on the day it is saved. No screen
gained a date field, and nobody doing data entry has to understand any of this.

The alternative, a typed "takes effect from" date, records what actually
happened, including a promotion entered a month late. It was turned down
because two new fields would have to be explained, and a mistyped date creates
a person who cannot be picked on the documents they really signed, with nothing
on screen to show why. If back-dated entry turns out to be needed, the fix is
one field and a backfill.

### How the dates work, which is the fiddly part

`valid_until` is **inclusive**: it is the last day the version was still
correct, not the first day it was wrong. Everything else follows from that.

- **A printed field changes.** The old version's `valid_until` becomes
  *yesterday* and the new version starts *today*. Closing the old one today
  instead would leave both versions valid today, and a document filed today
  would match the same person twice.
- **Somebody is marked as no longer employed.** Their open version closes
  *today*, because today was still a working day. No new version is opened, and
  that is what stops them appearing as a choice on documents filed after they
  left.
- **Nothing printed changed.** No new version. Editing a birthday or a civil
  status must not make one.

Two same-day exceptions keep the table clean. Both exist because a version that
only ever covered today cannot be what any document points at.

- **A version that began today is corrected in place** rather than replaced.
  Closing it yesterday would leave a row whose end came before its beginning.
- **A version closed earlier today is reopened** when the person is brought
  back the same day, rather than a second one being started from today.

The second of those was **a bug found in testing, not foresight**. The first
browser test separated and reinstated a test person on the same day, and the
check query showed two versions both covering 31 August 2026. The rule was
added and the retest showed one.

### What was built

- `src/lib/server/db/schema/employee-history.ts` — the table above.
- `position_short_form` added to `employee`, nullable, beside `position_title`.
- `scripts/backfill-employee-history.ts`, run as
  `npm run backfill-employee-history`.
- `src/lib/server/employee-history.ts` — the only place either table is
  written, holding `createEmployee`, `updateEmployee`, `separateEmployee` and
  `reinstateEmployee`. Each runs entirely inside one `db.transaction`. If a
  second place ever needs to change somebody's name, it calls these.
- The `create`, `update`, `separate` and `reinstate` actions on
  `src/routes/admin/employees/+page.server.ts` now go through those functions
  and pass the signed-in user as the version's author. `delete` is unchanged:
  the cascade removes the versions, and the protection arrives later from the
  document side.
- The add and edit dialog gained one optional field, labelled "Short form
  printed on forms", with the real example under it.

### Applying it to the database, and a warning about `drizzle-kit push`

**`drizzle-kit push` cannot be used on this project as it stands.** Asked to
add the new table, it also offered to repair drift left from earlier work, and
its way of adding a `NOT NULL` rule to a MySQL column is to `TRUNCATE` the
table first. Run with `--force` it attempted exactly that on `employee`. The
data survived only because `user` holds a foreign key onto `employee` and MySQL
refused the truncate. Nothing was written, and the counts were checked
afterwards.

The change was applied instead as plain SQL: `CREATE TABLE employee_history`
with its two foreign keys, `ALTER TABLE employee ADD position_short_form`, and
the two `MODIFY` statements that finally made `position_title` and
`tenure_status` `NOT NULL` in the database as the schema file had claimed for
some time. None of those reads or deletes a row.

### Verified by the user, in a browser

All of it, on 31 August 2026, on a throwaway test person so that neither real
record could be locked out — both existing employees hold a login, and marking
somebody as no longer employed signs them out and refuses their next sign-in.

- Adding a person creates their first version.
- Renaming somebody across days closes the old version the day before and opens
  a new one. Confirmed on a real record, whose version had run from 2000-01-01
  and was closed on 2026-08-30 when a short form was typed in.
- Editing only a civil status creates no version.
- Marking somebody as no longer employed closes their open version.
- Bringing them back opens one, or reopens the same-day one.
- Deleting a person removes their versions with them.
- `created_by_fk` records the signed-in admin on every version made this way.

Four queries were run against the live database after each round: every version
listed, open versions per person, whether `employee` and its open version
disagree anywhere, and whether any two versions of one person cover the same
day. The last two returned nothing, which is what they must do.

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

- **Employee history** — Topic 9, in full: the `employee_history` table, the
  `position_short_form` column on `employee`, the one-time backfill script, the
  write path in `src/lib/server/employee-history.ts`, the four actions rewired
  to it, and the short form field on the add and edit dialog.

`npm run check` reports **0 errors**, down from 54. `npm run build` succeeds.

### Applied to the database

Two `drizzle-kit push` runs, both done by the user:

1. The separation itself — the new `employee` table, and `user` rewritten to
   hold only login columns.
2. `position_title` and `tenure_status` made `NOT NULL` in the schema files.

A third change, on 31 August 2026, was applied as **plain SQL rather than a
push**: `employee_history` created with its two foreign keys,
`position_short_form` added to `employee`, and the two `NOT NULL` rules above
finally applied to the live columns, which run 2 had changed only in the schema
files.

**`drizzle-kit push` should not be run on this project again without reading
Topic 9 first.** It adds a `NOT NULL` rule to a MySQL column by emptying the
table, and with `--force` it attempted that on `employee`. Only a foreign key
from `user` stopped it.

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
  error, which proves the placeholder position title and tenure it wrote at
  that time satisfy the two columns that became required. Topic 11 has since
  replaced those placeholders with questions, so this run needs repeating.
- **The Organizational Structure page works.** Adding a unit, renaming a
  section, and deleting a unit were all tried after the context import was
  repaired.
- **The duplicate-person check works.** Its rules were run against the live
  database, and the user then used the Employees page in a browser and found
  no problem. See Topic 7a.
- **Employee history works.** On 31 August 2026 the user added, renamed,
  edited, separated, reinstated and deleted a test person in a browser, and the
  four check queries were run against the live database after each round. One
  bug was found this way and fixed. The detail is in Topic 9 under "Verified by
  the user, in a browser".

### Merged and pushed

The work reached `main` in two merge bubbles: `feature/employee-user` for the
separation itself, and `feature/org-unit` for the Organizational Structure
fix, which belongs to that area rather than to this feature.

**Topic 9 is not merged yet.** Its three commits sit on `feature/employee-user`,
which was brought up to date with `main` before the work started. Merging it
into `main` with `--no-ff`, and pushing, are the user's to do.

### Not tested yet

Nothing is left. Every item that was on this list has been tried against a
running system, and the results are in "Verified by the user" above, Topic 9
included.

### The next piece of work

Two things are known and neither is urgent.

**Nobody has a short form yet.** Every version in the table has
`position_short_form` empty, because it has to be typed by hand. Nothing breaks
while it is empty, and the first document that prints one will be the thing
that forces the typing. That document does not exist.

**A spelling fix still behaves like a name change**, which is the opposite of
what the signatory design asks for. **Topic 10 designs the repair** and is
finished apart from three small open questions listed at the end of it. Building
it means three places on screen, the `employee_history_correction` log, and a
warning naming how many documents a fix would change.

One idea has still never been discussed: the **"Give this person a login"**
shortcut described at the end of Topic 5. It is not a decision, and no work on
it is planned.
---

## Topic 10 — Repairing a mistake instead of starting a new version

### Status

**Designed and built, 1-2 September 2026.** The shape was reworked during the
design, after the user proposed a better one; what this topic said before is
described under "The shape this replaced" so the reasoning is not lost. What was
built is listed at the end, under "What was built".

The user tested the first two doors in a browser and reported them working. The
history panel is built but not yet tested.

A word about vocabulary. Topic 9 calls a row in `employee_history` a **version**,
and that word stays in the code and in this document. On screen the same thing is
called an **entry**, because "entry" is what a clerk recognises. They are the same
row.

### The problem

A name changes for two opposite reasons, and they need opposite behaviour.

A typing mistake was never correct, so the document already using it should be
repaired. A marriage is not a mistake, so documents filed before it must keep the
old surname. Today `updateEmployee` treats both the same: it always closes the
old version and opens a new one, which is right for the marriage and wrong for
the mistake. The consequence is written down at the end of Topic 9 and has not
changed.

The same split applies to the **position title**, not only the name. A mistyped
title should be repaired; a promotion should not. Both live in the same version
row, so one action governs both.

### Decision — the fork is two separate actions, not a question at save time

**Proposed by the user, and it replaced my design.** The screen does not ask
anything at save time. Instead the two cases are two different things a person
can choose to do, before they start typing.

| the person wants to | they use | what happens to the versions |
| --- | --- | --- |
| fix something typed wrong | the existing **Edit employee** dialog | the open version is written over |
| record something that really changed | a new **Add name or position change** action | the open version is closed, a new one starts |
| fix something typed wrong on an older, closed version | the new **Name and position history** screen | that one version is written over |

Why this is better than the question-at-save-time design it replaced. My version
put both jobs in one dialog, so the dialog had to work out which of the two was
happening, count documents, and interrupt with a question the person met by
surprise halfway through saving. The user's objection was about that complexity,
and their fix removes it: the button somebody pressed already says which case it
is, so nothing has to be inferred and nothing has to be asked. The edit dialog
goes back to doing one job.

### Decision — what these are called on screen

**"Name and position history"**, chosen by the user from four plain candidates.
Rejected: *"Name history"*, which promises less than the screen shows, since the
position title is in there too; *"Change history"*, which does not say change of
what and would make people expect birthdays to be listed; and *"Employee
history"*, which sounds like it means when somebody was hired and when they left,
which is not what is stored.

Two formal names were also rejected, and the reason matters for future naming.
**"Service Record"** is the real Civil Service Commission document and was the
most accurate name available, but a real Service Record also carries salary,
appointment status and appointment dates, none of which this system stores. The
user did not want it, and did not want the civil service process reproduced
either — it was useful only as an idea. **"Record of name and position"** was
rejected as still too complicated. The rule they gave is that the words must be
understandable to anybody without explanation.

### Decision — a correction changes only the version being looked at

The edit dialog writes over **the open version only** — the one row whose
`valid_until` is empty. It never touches a closed version. A closed version is
corrected from the history screen, one at a time, deliberately.

**This overturns an earlier decision in this same topic**, which said a repair
should reach every version holding the same wrong value. That is no longer the
design.

The concern with the user's rule was put to them and they kept their answer, so
it is settled. Recorded here because it is a real cost and somebody should not
rediscover it as a bug: a document reads whichever version covers **its own
date**, not the open one. So if "Olivar" sits on a closed version as well, a slip
dated inside that closed version's range still prints "Olivar" until somebody
opens the history screen and corrects that version too.

The user's reasoning is that editing history is a deliberate act and belongs on
the screen where history lives, rather than happening invisibly from a dialog
about somebody's personal details. Nothing is hidden: the history screen shows
every version, so a person who mistyped a surname can see the other versions
still carrying it.

### Decision — the copy on `employee` and the open version follow each other

They hold the same six printed fields, and they are two copies of one thing.

- Editing the person in the **Edit employee** dialog updates the open version.
- Editing the **open version** on the history screen updates the person.

Both directions run in one transaction, which is the discipline Topic 9 already
rests on. Nothing new is required for this; it is what
`src/lib/server/employee-history.ts` already does, described from the other side.

### Decision — the history screen is part of this feature, not a later idea

It used to be listed at the end of this document under "Topics not opened yet",
as something nothing needed yet. Under the new shape it is required, because it
is the only way to reach a closed version at all. That bullet has been removed.

### Decision — the warning stays, and it now has two jobs

It appears in the **Edit employee** dialog when a printed field has been changed,
and it does not block the save. The user was explicit about this: if an admin
reads the warning and proceeds anyway, that is their mistake, and the point is
that they were told.

The two jobs:

1. **Name the number.** *"3 documents already use this name. All 3 will show the
   corrected name straight away."* When nothing uses it: *"No document uses this
   name yet, so nothing else changes."* The line is kept at zero rather than
   hidden, because silence would read as "nothing to think about here" when the
   choice still matters.
2. **Point at the other action.** If the name genuinely changed, this dialog is
   the wrong place, so the warning names the **Add name or position change**
   action.

**The count is zero today, and the code must be honest about that.** No document
table exists, so nothing points at a version yet. The count comes from one small
function whose job is to be replaced: it returns 0 now, and gets its real query
when the first document naming a signatory is built. Whoever builds that document
must come back to this function; nothing else needs to change.

**Why a warning is needed even at zero.** Paper is always typed into the system
after it was signed, so a slip filed next week can carry last week's date. If a
misspelling is handled by starting a new version, the misspelled version stays in
the table covering every earlier date, and that back-dated slip finds the
misspelled name.

### Decision — the log lives in the database only, for now

`employee_history_correction` is written whenever a version is written over, from
either place, and is shown on no screen. The user chose this over a panel in the
employee editor and over a page listing every repair.

Its columns are as the signatory document describes: which version, which field,
the old value, the new value, who did it, and when. Under the new shape a repair
touches one version, so a repair writes one row per changed field.

The reasoning for building it now and showing it later is that the log fills up
from the day it is built either way, so a screen built later still shows every
repair back to the first one.

To see who repaired what, run this in MySQL Workbench:

```sql
SELECT c.corrected_at, u.username, c.field, c.old_value, c.new_value
FROM employee_history_correction c
JOIN user u ON u.user_pk = c.corrected_by_fk
ORDER BY c.corrected_at DESC;
```

### The shape this replaced

Kept so the reasoning is not lost, and so nobody proposes it again without
knowing it was considered.

The screen was to keep its single **Save** button. When the save noticed that a
printed field had changed, a question appeared before anything was written, with
two answers the user chose from three candidates: **"Fix a mistake in what was
typed"** and **"Record a change that happened"**. The wording deliberately
avoided the words "spelling" and "name", because the signatory document's
original pair — "Fix a spelling mistake" and "This person's name changed" — reads
wrong when what was edited is the position title.

That wording is now unused, because there is no question to answer. If the two
actions ever need a sentence explaining them, these two are the ones that were
tested against a non-technical reader.

**Topic 1 of the signatory document still describes the two-button screen** and
has not been brought in line with this. It should be, before that document is
trusted again.

### Decision — no separate permission, for now

`admin:manage_employees` governs all three doors. Anybody allowed to edit an
employee may also repair a name and use the history screen.

An earlier version of this topic added a second key, `admin:correct_employees`,
so that repairing filed paperwork could be granted separately from ordinary
employee editing. It was dropped, and the reasoning is worth keeping because the
question will come back.

Adding the key would have taken something away that roles already have. Anybody
who can edit an employee today can edit a name, and after the change they could
not until somebody ticked a new box on their role. That is a real cost paid on
day one, against a risk that is small in this office: two people hold logins, and
every repair is already attributed in `employee_history_correction`.

It is also the easy direction to reverse. Adding the key later means one entry in
`PERMISSION_DEFS`, one guard on the edit action and one on the history screen,
and ticking a box on the roles that should keep the ability. Removing a key that
roles already depend on is the harder direction, so starting without it is the
cheaper mistake to make.

**Decided by Claude, not by the user**, who was asked and said the question was
too technical to answer. It is recorded here so it can be overruled: if repairs
should be restricted, say so and the key goes in. The description it would carry
in the role editor, in plain words, is *"Repair a name or position that was typed
wrong, including on documents that already use it."*

### Decision — the history is its own panel, slid in from the side

Chosen by the user, who also named the component: shadcn-svelte's **sheet**, a
panel that slides in from the edge of the screen rather than a dialog in the
middle of it.

It opens from its own item in the row menu, **"Name and position history"**,
beside Edit rather than inside it. The reasoning the user agreed with is that
the employee editor is already long, and that keeping the two apart matches what
the rest of this topic builds: the editor fixes what the person is called now,
the panel fixes what they were called before.

A sheet suits it better than a dialog because the content is a list of unknown
length. It is also read far more often than it is written, so it is worth
opening without the weight of a modal.

What it shows, one card per entry, newest first: the dates the entry was in use,
the name, the position title, the short form or a line saying none was typed in,
and which login added it. The current entry carries a badge reading "In use now".
Each card has a **"Correct this"** button that turns that card into fields, one
entry at a time.

The entries are fetched when the panel opens rather than loaded with the page.
Almost nobody opens it, and loading every person's whole history in order to
draw a table of names would read far more than the page needs.

### Still to decide

**What the new action is called.** It was built as **"Add name or position
change"**, which is my wording rather than the user's *"Add name and position
history"*. Theirs matches the panel's title; mine names what the action
produces, and the user has not objected to it since it appeared on screen.
Renaming it is one line in `employee-actions-cell.svelte`.

One gap found while drawing the flowchart is still open: **what the admin is
shown if the save itself fails.** Nothing lands, which is correct, but no
message has been designed and the generic "Something went wrong." is what
appears today.

### What was built

- `src/lib/server/db/schema/employee-history-correction.ts` — the log table,
  applied to the database as plain SQL by the user, since `drizzle-kit push`
  remains unsafe here for the reasons in Topic 9.
- `src/lib/server/employee-history.ts` — reworked. `updateEmployee` now writes
  over the open version and logs each changed field instead of closing the
  version and opening a new one. `addEmployeeVersion` and
  `correctEmployeeVersion` are new, and are doors 2 and 3.
  `countDocumentsUsingOpenVersions` and `countDocumentsUsingVersions` are the
  two stubs that return zero and are written to be replaced together when the
  first document exists.
- `src/routes/admin/employees/+page.server.ts` — two new actions, `addChange`
  and `correctEntry`, and the load now carries the per-person document counts
  the warning names.
- `src/routes/admin/employees/[employee_pk]/history/+server.ts` — the panel's
  own read, listing every version of one person with who added it.
- `add-change-dialog.svelte` and `name-position-history-sheet.svelte` — doors 2
  and 3 on screen. The row menu gained an item for each.
- The employee editor gained the warning, which appears only when one of the six
  printed fields has been changed and never blocks the save.

---

## Topic 11 — The bootstrap script invents a person who does not exist

**Status: Settled and built.** The script now asks. Nothing below is still
waiting for an answer.

### The problem

`scripts/create-admin.ts` creates the very first super admin on an empty
database. Because `user.employee_fk` is required, it has to write an employee
row first — and it does not ask who that person is. It writes:

```
first name       Admin
last name        User
position title   System Administrator
tenure status    Permanent
birth date       (empty)
```

None of that is true. The script then prints a warning asking whoever ran it to
go and correct the record on the Employees page.

This was accepted earlier as a small, self-closing gap. Topic 4's discussion of
the super admin is what made it look wrong instead: the whole argument for
requiring the link is that a login should name a real person, and the very
first login names a made-up one. A fake row also sits in the Employees list
looking like staff until somebody fixes it, and there is nothing forcing them
to fix it.

### Decision — the script asks, it does not invent

The script already asks for a username and generates a password, so it is
already an interview. It will ask for the person's real details in the same
run, and write them. No placeholder row, and no warning to correct one.

### Decision — the fields it asks for

Confirmed by the user. The script already interviews whoever runs it for a
username, so these questions join the same run, before the username:

- First name and last name — required by the table.
- Middle name and suffix — optional, but they appear on every government form
  in this office, and skipping one is a single keystroke.
- Position title — required by the table.
- Tenure status — required by the table, offered as a list of the seven values.
  **Shown to the reader as "Type of appointment", not "Tenure".** Decided on
  7 September 2026 while reviewing the script's wording. The user's reason is
  that "type of appointment" is the phrase their office actually uses and
  everybody understands, while "tenure" is understood mainly by HR staff, which
  makes it a term of art like any other. The column and the code keep the name
  `tenure_status`; only what is displayed changed. The same rename was applied
  to the four places the Employees page showed the old word: the field label in
  `add-edit-employee-dialog.svelte`, the table column header in `columns.ts`,
  the changed-field row label in `context.svelte.ts`, and the filter button in
  `employees-toolbar.svelte`. If "Type of appointment" proves too wide as a
  table column header, "Appointment type" is the agreed fallback.
- Birth date — not required by the table, but the Employees page requires it of
  every person it saves, and it is what the duplicate check is anchored on.
  Asking for it here means the very first record is no weaker than every later
  one.

Three fields are deliberately **not** asked for:

- **The division or section.** On an empty database none exist yet, so there is
  nothing to choose from. It stays empty and is set later on the Employees page.
  The script's closing note says so, replacing the old warning that asked the
  reader to correct a placeholder record.
- **The short-form position title.** It exists only to be printed on forms, and
  no form exists yet.
- **Sex and civil status.** Optional, and the Employees page does not show them
  as columns.

`birth_date` stays a nullable column. Topic 7a made it nullable to allow the
placeholder row, and that reason is gone, but the duplicate check still has a
rule for records with no birth date, and making the column required would be a
migration with nothing to gain.

### Decision — how the messages are laid out in the terminal

`@clack/prompts` draws a box sized to the longest line and puts a gutter down
the left, so a line wider than the window is broken by the terminal at an
arbitrary point and the box splits open. Messages therefore have to be kept to
about 60 characters, which leaves room for the gutter on a standard 80-column
window.

This was not only a problem for the new questions. Nine string lines across the
four scripts were already over 88 characters, and `scripts/create-admin.ts` had
one of 166. Two approaches were put to the user, and the user chose the first:

**A `wrap()` helper does the breaking.** It lives in `scripts/lib/cli.ts`
alongside the width it uses, `MESSAGE_WIDTH`, which is 60. A message is written
as one plain sentence and passed through `wrap()`, which inserts the line
breaks when the script runs. The alternative was to break every string by hand
in the source, which would have made the file look like the screen but would
have meant re-flowing the lines below a sentence every time it was edited.

Three details of the helper, decided while writing it:

- A line break already typed into a message is kept, which is how a message is
  split into paragraphs. Everything else is filled greedily, word by word.
- Colour codes are not counted. `picocolors` wraps text in invisible codes, and
  counting them would break lines far too early.
- A single word longer than the width is left alone on its own line rather than
  cut in half.

**Wrapping is not the same as drawing a box, and the two were confused while
this was being discussed.** `wrap()` only inserts line breaks; it draws nothing.
The box is `p.note()`, a separate function. The user's rule on boxes is that
ordinary explanatory text is never put in one, but a value the reader has to
copy down is. So the username and generated password printed at the end of
`scripts/create-admin.ts` keep their `p.note()` box, because a password has to
stand out from everything else scrolling past, and every other message in the
script prints plainly.

Every message the scripts print also falls under the plain-language rule
settled in Topic 13: no English idioms, in errors and notices as much as
anywhere else. That rewriting has not been done and belongs to Topic 13; this
topic only rewrapped the lines that were too wide.

### Decision — the script opens the first history entry with its own SQL

Found after Topic 11 was first written, and decided by the user on 6 September
2026.

Every person is meant to have at least one entry in `employee_history`. A
printed document names an entry rather than a person, so a person with no entry
is a person no document can name. `createEmployee` in
`src/lib/server/employee-history.ts` opens that first entry inside the same
transaction that adds the person, and its comment says the rule holds for every
row without exception. `scripts/create-admin.ts` wrote its employee row with
its own SQL and opened no entry, so the very first person in the system broke
the rule.

The script cannot simply call `createEmployee`. That was tested rather than
assumed: `createEmployee` needs the database connection from
`src/lib/server/db/index.ts`, which reads its settings from
`$env/static/private`, and that module only exists while SvelteKit is building.
Loading it under tsx fails with `Cannot find package '$env'`.

So the choice was between the script writing the history row in its own SQL, or
`src/lib/server/db/index.ts` being rewritten to get its settings in a way that
works both inside SvelteKit and outside it. The user chose the first. Rewiring
how every page in the system reaches the database, for the benefit of a script
that runs once, is the larger change by far, and
`scripts/backfill-employee-history.ts` already writes `employee_history` rows in
its own SQL for the same reason.

The cost accepted with it is that the rule about what a first entry contains now
lives in two places. The script carries a comment pointing at `createEmployee`
so that a future change to that rule is not made in only one of them.

The entry is credited to the account the same run creates, which is truthful:
whoever ran the script is the person that account belongs to.

### What has been built so far

Nothing is committed. The work sits in the working tree while the last open
point is settled.

Done:

- **`scripts/lib/cli.ts`** — `MESSAGE_WIDTH` and `wrap()`, exported alongside
  the existing `bailIfCancelled`.
- **`scripts/create-admin.ts`** — the seven questions above, asked before the
  username, with the answers written into the employee row. The old warning
  about correcting a placeholder is gone; in its place is a closing note saying
  that the division or section is the one thing still missing, and where to set
  it. The list of ways somebody is hired is imported from
  `src/routes/admin/employees/labels.ts` rather than typed again, so the choice
  offered on the server cannot drift from the choice offered in the app.
  It also opens the person's first `employee_history` entry, in the same
  transaction, as decided above.

- **The three other scripts** — `scripts/backfill-employee-history.ts`,
  `scripts/reset-admin-password.ts` and `scripts/sync-permissions.ts`. Their
  over-wide message lines now pass through `wrap()`. Wrapping only; the wording
  is untouched, because rewording belongs to Topic 13.
- **`src/routes/admin/employees/+page.server.ts`** — the comment explaining why
  `birth_date` stays nullable no longer points at the placeholder row, which no
  longer exists. It now gives the reason that still holds, which is the
  duplicate check's rule for the records already on file with no birthday.

---

## Topic 12 — Being locked out by the Employees page

**Status: Open.** The four faults are agreed and need fixing. How each is
fixed is decided below where it was obvious, and flagged where it was not.

### Where this came from

The user asked whether `scripts/reset-admin-password.ts` covers the case of the
last super admin losing access. Working through it turned up a state the system
can reach and cannot get out of. Nothing here is theoretical — each step was
read in the code.

### The one mistake behind all three

Two different questions are asked about the same person, and the code mixes them
up.

- **Sign-in asks:** is this account active, *and* does this person still work
  here? Topic 8 added the second half.
- **Everything else asks:** is this account active?

Sign-in is the stricter of the two. So there is a state — **account active,
employee marked as no longer employed** — where sign-in refuses the person while
every other part of the system still believes their account is fine. All three
faults below are that one state, seen from three places.

### Fault 1 — the Employees page can lock out the last super admin

Marking somebody as no longer employed ends their sessions straight away and
stops their next sign-in. Nothing checks who that person is. Two doors do it and
neither is guarded:

- the row menu action, `separate` in
  `src/routes/admin/employees/+page.server.ts`
- the employee editor, when the person is switched to not employed

The worst version is the super admin doing it to their own row. They are signed
out immediately and cannot get back in.

What makes this plainly a fault rather than a design choice is that the Users
page already blocks the same move. It refuses to let anyone switch off their own
account, and it refuses to remove the last active super admin whether that
happens by deactivation, by a role change, or by deletion. The Employees page
arrives at the same result with none of those checks.

**Decision — the Employees page gets the same guards as the Users page.** Two
of them:

- Refuse to mark somebody as no longer employed if they are the signed-in user
  and that would end their own access. Same reasoning as the Users page: it
  takes away the only screen that could undo it.
- Refuse if it would leave no active super admin who can actually sign in, and
  warn when it would take that number from two to one.

Both apply to the menu action and the editor, because both reach the same place.

### Fault 2 — the password reset reports success when it has fixed nothing

If the super admin's employee record is marked as no longer employed,
`scripts/reset-admin-password.ts` still lists them, still writes a new password,
still prints the credentials and still says "Done". The password really is
changed. It simply cannot be used, because sign-in refuses the person before it
ever looks at a password.

So the recovery tool says it worked, the login screen says the account belongs to
somebody who no longer works here, and nothing joins those two statements
together.

### Fault 3 — the bootstrap script will not rescue that state either

`scripts/create-admin.ts` refuses to run when an active super admin exists, and
it decides that on the account alone. A super admin who cannot sign in still
counts, so the script says somebody already has the admin account and exits.

Put the three together and the office is stuck: sign-in refuses, the reset script
achieves nothing, the bootstrap script refuses, and the Employees page that could
undo it in one click needs a sign-in to reach. The only way out is editing the
database by hand in MySQL Workbench.

### Decision — the count is fixed in one place

`getActiveSuperAdmins` in `scripts/lib/super-admin.ts` joins `user` to `role` to
`permission` and never joins `employee`, so it counts people who cannot sign in.
Adding the employee join makes it count the same thing sign-in counts, and fixes
faults 2 and 3 together:

- The reset script stops offering a person whose password cannot help them, and
  says why instead.
- The bootstrap script stops seeing a holder who cannot sign in, so it will
  create a replacement account — which is the way out of the state if the guard
  in fault 1 is ever bypassed.

Fault 1 still needs its own fix, because that is what creates the state to begin
with. The two are independent and can be done in either order.

### Fault 4 — the Users page guards count people who cannot sign in

Checked after the three above, and it is the same gap again.
`countActiveSuperAdminUsers` in `src/routes/admin/users/+page.server.ts` counts
users on the super-admin role whose account is active. It does not join
`employee` either.

So the guards meant to keep at least one super admin able to sign in are reading
a number that does not mean that. Suppose there are two super admin users and
one of them has been marked as no longer employed. The count still says two, so
the guard allows the other one to be deleted or moved off the role. What is left
is one super admin who cannot sign in, and nobody who can.

**Decision — the same fix.** Add the employee join here as well, so the count
means "super admins who can actually sign in" everywhere it is used. The app and
the two scripts should all be asking the question sign-in asks.

### Decision — the recovery script stays a password tool

The user was asked whether `scripts/reset-admin-password.ts` should be able to
undo the separation itself, as a last resort when nobody can sign in. They said
no: that file is only meant for resetting an admin password.

That answer turns out to cost nothing, because the guards above close the door
completely. Once the Employees page refuses to separate you or the last super
admin who can sign in, and once all three counts join `employee`, every route
into the stuck state is blocked — separating yourself, separating the last
holder, separating the second-to-last and then the last, deactivating or
deleting the last account, deleting the employee row (the database refuses it
while a login points at it), and weakening the frozen role. What remains is
reachable only by editing the database by hand, and whoever can do that can undo
it the same way.

So no new script is needed. The only change to the reset script is the one
already decided: stop offering people who cannot sign in, and say why.

### Still to decide

- **What the reset script says** when the only super admin it can find is one
  whose employee record is marked as no longer employed. It should not silently
  leave them out of the list, because "no active super-admin found" would be
  misleading. It needs to name the real problem and point at the Employees page.
  The wording depends on Topic 13, which is what makes the repair on that page
  an honest one rather than a false record.

---

## Topic 13 — Undoing a separation that never should have happened

**Status: Settled, not yet built.** The design is finished — the operation, the
menu item, the dialog and its wording are all decided below. Nothing is written
in code yet.

### Where this came from

Topic 12 asked what the password-reset script should tell somebody who cannot
sign in. The first wording suggested asking another admin to mark the person as
employed again. The user rejected it and asked where the accountability was in
that: if the person really has left the agency, marking them employed again to
solve a sign-in problem writes something false into the record.

They were right, and the reason is worse than a flag being flipped. Then they
made the opposite point: if it genuinely was an accident, creating a whole new
account is wrong too, because `scripts/create-admin.ts` always inserts a new
employee row, so the same person would appear twice in the Employees list.

Both objections are correct, and together they show that a piece is missing.

### The problem

Marking somebody as no longer employed closes their open version, dated that
day. Bringing them back opens a **new** version starting today. So the pair is
not an undo: unless it is fixed the same day, the history permanently shows a
break in service that never happened, and any document that asks who was valid
on a date inside that gap sees a person who was not there.

The same-day case is already handled honestly. `syncVersions` reopens the very
version that was closed rather than starting a second one, because somebody
separated and brought back on the same date was never actually gone. That
behaviour is correct and proven — it simply expires at midnight and cannot be
asked for on purpose.

### There are two situations and only one tool

| Situation | What is true | What the record should do |
| --- | --- | --- |
| The person left the agency | They really are gone | Their version closes on the day they left, and stays closed |
| Somebody picked the wrong row | The person never left | Nothing should have changed at all |

This is the same split Topic 10 settled for names and positions: correcting an
entry means what was there was never true, while recording a change means it was
true until now. Employment status never received that split. It only has the
"record a change" half.

### Decision — the missing operation is an undo, not a second reinstate

Reopen the version that was closed and set the person back to employed. No new
version, no gap, nothing to explain to anybody reading the history later.

This is deliberately **not** the same as bringing back somebody who genuinely
left and has genuinely returned. That case keeps its current behaviour, because
the break in service is real and documents filed during it must go on showing
that they were not there.

### Why this is not a super admin feature

It reached us through the lockout, but it applies to everybody in the table. A
clerk separated by mistake gets the same false break in service as a super admin
does. The super admin case was simply the one loud enough to notice, because it
also locked somebody out.

### How it is reached today

There is no menu item for bringing anybody back. A separated person's row menu
offers Edit, "Name and position history", and Delete only. Coming back is done
by opening Edit and turning the employed control back on, which posts to the
ordinary `update` action — and that is the path that writes the false break.

The one other route is the duplicate check: adding somebody who already exists
as separated offers to bring them back, which posts to `reinstate`.

### Decision — one menu item, and a dialog asks which of the two happened

Three shapes were put to the user and they chose this one. The row menu built by
`src/routes/admin/employees/employee-actions-cell.svelte` gains a single item for
a person marked as no longer employed. Opening it shows a dialog that asks
whether the person left and came back, or whether the record was marked by
mistake.

Their reason was that the dialog is a place to put a sentence explaining what the
button will do, which a bare menu item has no room for.

This deliberately departs from Topic 10, which chose two separate menu items for
names and positions on the grounds that the item somebody picks is itself the
decision. The difference is that "correct" and "record a change" are two ideas an
admin has to be taught, whereas "did they really leave, or was this a mistake" is
a question anybody can answer without being taught anything. The dialog can ask
it in one plain sentence, so the risk of clicking through without reading is much
lower here.

Whichever wording is settled on, the employee edit dialog in
`src/routes/admin/employees/add-edit-employee-dialog.svelte` still has to be
dealt with, because switching its employed control back on today takes one of the
two paths silently, without asking anything.

### Decision — the menu item is called "Mark as employed"

The first suggestion was "Mark as employed again". The user rejected it, and the
reason it was wrong is that the word "again" answers the question the dialog is
about to ask. The item has to stay neutral, because at the moment of clicking it
the admin has not yet said whether the person left or whether the record was a
mistake.

"Mark as employed" is the exact mirror of the item already in that same menu,
"Mark as no longer employed" in
`src/routes/admin/employees/employee-actions-cell.svelte`. The pair reads as
opposites and neither claims anything about why.

### Decision — the wording inside the dialog

Settled line by line with the user. The dialog is titled with the person's name,
asks one question, and offers two answers:

```
Mark Juan Dela Cruz as employed

What happened?

( ) They came back
    They really left, and have now returned. Choosing this starts a
    new name and position entry from today, and their history will
    show a gap for the time they were away.

( ) It was a mistake
    They never left. Somebody marked them as no longer employed by
    mistake. Choosing this undoes it, so their name and position
    history stays unbroken.

                                            [ Cancel ]  [ Save ]
```

Five things were decided while arriving at that, each because an earlier draft
was wrong in a way worth remembering.

**The question is "What happened?"** The first draft asked "Which of these is
true?", which the user replaced with something closer to how a person would ask
it out loud.

**Each answer opens with a short bold header.** "They came back" and "It was a
mistake" are three words each and carry the whole decision, so somebody skimming
can pick correctly without reading further. The user asked for this after a draft
whose first lines were too long to work as headers.

**The lines underneath say what happens, and announce that they are doing so.**
An earlier draft put a sentence about the person next to a sentence about the
stored data with nothing between them, which the user described as reading a few
words and then hitting a sudden change of meaning. The phrase "Choosing this ..."
now marks where the subject changes. It makes the lines longer, and the user
judged that worth it.

**The mistake is named as an action, not as a record.** An earlier draft said
"the record was marked by mistake", and the user asked what kind of record that
meant. The answer is that it was not a record at all: somebody clicked the menu
item "Mark as no longer employed" on the wrong row. The dialog now says exactly
that, reusing the menu item's own words.

**No idioms.** "Leaves a gap" was replaced with "their history will show a gap".
The user, who is not a native English speaker, had to stop and work out whether
"leaves" meant "adds". The admins reading this dialog are their colleagues in the
same office, so anything needing that pause is wrong here. This applies to every
message the software shows, including errors, notices and the output of the
command-line scripts.

**The word for one row of history is "entry".** Not "version", and not
"employment history". "Entry" is already what these screens say — the toast in
`correct-entry-dialog.svelte` reads "The entry was corrected" — and it came from
Topic 10. The dialog says "a new name and position entry" rather than just "a new
entry", so it is clear which record is meant.



---

## Topics not opened yet

Listed so they are not forgotten. Not discussed, no decisions.

- **The "Give this person a login" shortcut** on each row of the Employees
  page, described at the end of Topic 5. An idea only.

**Migration order** used to be listed here and no longer applies. There was
never any data to preserve — every table was empty when this began — and the
code was changed in a workable order as the work went along.
