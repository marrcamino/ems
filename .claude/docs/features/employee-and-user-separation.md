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

## What the `user` table holds today

For reference while we split it. From `src/lib/server/db/schema/user.ts`:

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

**Status: Settled on what to include. The exact wording of the lists is Topic 3.**

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
position, so somebody on file with no position at all is not a real case.
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

### Still uncertain

- Whether `employment_status` needs more than active and separated — for
  example telling retirement, resignation, and end of contract apart. Not yet
  discussed; `active` and `separated` are the working assumption.

---

## What the separation touches — high level

Listed so the size of the change is visible. Not decisions, except where
marked. Detail is deliberately left out.

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

```sql
CREATE TABLE `employee` (
	`employee_pk` bigint unsigned AUTO_INCREMENT NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`suffix` varchar(20),
	`position_title` varchar(100),
	`org_unit_fk` bigint unsigned,
	`birth_date` date,
	`sex` enum('male','female'),
	`civil_status` enum('single','married','widowed','separated','annulled'),
	`tenure_status` enum('permanent','temporary','casual','coterminous','contractual','cos','job_order'),
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

The application code has **not** been changed yet, so it still refers to columns
that have moved. That work is the "What the separation touches" list above.

---

## Topic 5 — One admin screen or two?

**Status: Settled — two screens.**

### The problem

Today `src/routes/admin/users/` has one page and one dialog that create the
person and the login together in a single step. After the split those are two
records, so the screen has to be either one page doing both or two pages.

### Decision

**Two pages.** An employee page listing everyone in the office, and the users
page for logins.

### Why

- **The form is already long.** The current dialog asks for ten things: first
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

### Running the sync is deferred

Adding keys to `PERMISSION_DEFS` changes no table, so the new keys reach the
database only when `npm run sync-permissions` is run. The user has chosen to
hold that off for now: every table is empty, and `scripts/create-admin.ts` does
not work against the new schema yet, so there is no super-admin role for the
sync to backfill. Both are done once the bootstrap path is repaired.

---

## Topic 7 — What the Employees page shows

### Status

**Built as recommended, still open to change.** The user asked to go ahead
with the recommendation rather than discuss it first, and said they want to
talk about it later. So nothing here is locked — it is what was built, not
what was agreed.

### The problem

The Employees page did not exist. Before writing it, we had to know which
facts appear as columns in the list, and which are only visible when you open
one person to edit them. The employee record now holds personal things —
birthday, sex, civil status — that were never on the old Users page.

### What was built — five columns

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

### Also decided while building, worth revisiting

- **COS and Job Order are shortened in the table** and spelled out in full in
  a tooltip, because "Contract of Service" does not fit in a column.
- **Deleting somebody who has a login is refused**, with a sentence saying to
  delete the account first or mark them as no longer employed instead.
- **Marking somebody as no longer employed does not switch off their account.**
  The editor says so plainly. The reasoning: switching an account off is a
  decision made on the Users page, possibly by a different admin, and doing it
  silently from here would hide it from them. This one is worth talking about
  — the opposite choice is defensible.
- **A repeated name is a warning, not a refusal.** Two people can genuinely
  share a name in a small office, but the usual cause is the same person being
  added twice.

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

`npm run build` succeeds.

### Verified by the user

`npm run create-admin` runs cleanly against the new schema, and signing in and
changing the password both work.

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

`npm run check` reports **0 errors**, down from 54. `npm run build` succeeds.

### Not tested against a running server yet

Everything above type-checks and builds, but the two pages have not been
opened in a browser with real rows in the database.

---

## Topics not opened yet

Listed so they are not forgotten. Not discussed, no decisions.

- **Migration order.** No data to preserve, but the code still has to be
  changed in a workable order. The sidebar showing the signed-in person's name
  is the known place that reads the name fields today.
