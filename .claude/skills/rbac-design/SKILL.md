---
name: rbac-design
description:
  Locked RBAC decisions for the EMS project. Use for any work touching
  permission keys, PERMISSION_DEFS, roles, the role editor, the super-admin role,
  expandPermissions or PERMISSION_IMPLIES, session permission loading, route guards
  in hooks.server.ts, create-admin.ts, or sync-permissions.ts. Also use when deciding
  where a new page belongs, which key gates it, or whether it shows only the
  person's own office's records.
---

## RBAC Design — Locked Decisions

The rules below were rewritten on 24 October 2026 for the shared work pages
(MPP-121). The decision and its reasons:
`.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md`.

### Core model

- User → Role → Permissions (many-to-many via `role_permission`)
- Permissions are fixed and developer-defined at build time. An admin never creates or edits a permission.
- Roles are created and edited by an admin at runtime. No role is hardcoded — except the super-admin role, which is created by script and then frozen (see below).
- One role per user. There are no per-user permission overrides; if one person needs a different set, duplicate the closest role and adjust it.
- A role may mix any keys. There is no "admin role" or "staff role".
- Every access check in code — route `load` functions, form actions, and show/hide conditionals in components, all via the helpers in `src/lib/rbac/access.ts` — tests a permission key, never a role name. `can("purchase_orders:manage")`, never `roleName === "GSU"`. Role names are runtime data an admin can rename; keys are defined in source and cannot change underneath the code.
- A key decides what someone may do. Belonging to a particular office, such as GSU, never does; the person's office only decides which rows they see (see "Rows by office").

---

### Where pages live

- **One shared set of work pages**, for everyone who holds their keys: `/fuel`, with `/fuel/assets` and `/fuel/purchase-orders`, and later electricity, water, paper, air travel, ESWM, and GHG. There is never a separate admin copy of a data page.
- **The pages for running the system** sit in the `src/routes/(app)/(admin)/` folder: `/users`, `/employees`, `/org-structure`, `/signatories`, `/roles`. The brackets group files without adding to the address, so there is no `/admin` address. The folder has no layout check, because each page needs a different key.
- **One layout** (`src/routes/(app)/+layout.svelte`) and **one sidebar** (`src/lib/components/navigation/app-sidebar.svelte`, links in `nav-items.ts`) for everyone. Each link shows only to people who hold its key; a parent such as Fuel also shows, as a plain heading, when the person holds the key of a page under it.
- **Everyone lands on `/`** (the dashboard) after signing in. Nobody is sent into an area, or kept out of one, by their address; `hooks.server.ts` only handles signing in and the forced password change.
- **Each page checks its view key** in its `load` and throws `error(403, ...)`, which shows the "You do not have permission" page. **Each save checks its manage key** and returns `fail(403, ...)`.
- Two pages cannot share an address, because no page has a prefix. SvelteKit refuses to start and names the two if it happens.

---

### Permission key shape

`PERMISSION_DEFS` in `src/lib/server/permissions.ts` is the single source. `PERMISSIONS`, `PermissionKey`, and `PERMISSION_IMPLIES` are all derived from it — a new module or action is added there and nowhere else.

- A key is **`thing:action`**, named after the data, not the page: `purchase_orders:manage`, `org_units:view`. There are no submodules, so a key always splits cleanly at the `:` into its module and its action.
- Every module must define a `view` action. The types enforce it. `view` opens the module's pages; it is what each page's `load` checks.
- Only `view` and `manage` per thing for now. They are split into add, edit, and delete only when the office needs it.
- **Moving a page never renames a key.** Assets lives at `/fuel/assets` but its key is `assets`, because the asset list may later cover equipment that uses no fuel (GEMP's inventory).
- Fuel's keys: `fuel:view` opens the fuel pages, and `fuel:view_all_offices` shows every office's records (see "Rows by office"). `fuel:approve`, for marking slips approved, and a key for recording withdrawals come with MPP-80 and MPP-81. There is no `fuel:manage`.
- Naming: plural for things you can count (`users`, `roles`, `org_units`), singular for the rest (`fuel`, `water`, `paper`, `air_travel`). Keys use `_`, never `-`; keys do not have to match URLs.
- The `permission` table's `module` column holds the part before the `:`.

---

### Implied permissions

Holding any action of a module means holding its `view`:

```
org_units:manage      → org_units:view
fuel:view_all_offices → fuel:view
```

There are no implications across modules: `purchase_orders:view` does not imply `fuel:view`.

`PERMISSION_IMPLIES` stores single steps only. Never read it directly — `expandPermissions()` walks the chain all the way up. Running it twice over its own output changes nothing, so it's safe to apply anywhere.

Keys it doesn't recognise pass through untouched rather than being dropped, so a leftover row in the database never silently removes access it was already granting.

---

### Role editor rules

**Every key, under page headings.** The editor shows one group per module, headed by the name of the page it opens ("Purchase orders", "Organizational structure"), in the order of `PERMISSION_DEFS`. There is no question about which kind of role it is.

**Auto-tick.** Ticking any non-`view` action immediately ticks that module's `view` as well — ticking `assets:manage` ticks `assets:view`, because managing a page you cannot open is meaningless. The reverse also holds: unticking a module's `view` unticks every other action in that module.

**The Roles page keys are hidden.** Neither `roles:manage` nor `roles:view` appears in the role editor. Not greyed out — absent. The Roles group therefore renders no checkboxes at all and is omitted. Both keys reach the super-admin role only via `create-admin.ts` and the sync backfill.

**Storage.** Save exactly what was ticked. Because the auto-tick rule means the ticked set already includes every implied key, nothing further is needed when a session loads — read the rows as they are.

Still run `expandPermissions()` on the server before writing. The browser can be bypassed: someone can POST a role save holding `assets:manage` with no `assets:view`. Expanding server-side means the database can never reach a state the UI would not have produced.

**Switching a role off.** An active role is switched off only once no user is assigned to it; the editor makes the switch unavailable with the count and the step, and the server refuses it too (MPP-120). A user left on an inactive role holds no keys (`validateSessionToken`).

---

### The restricted page: the Roles editor

The Roles page is super-admin-only, both keys. `roles:manage` is the critical one — it is what defines the super-admin role — and `roles:view` is withheld alongside it because a Roles page nobody can edit has no reason to exist. The read-only rendering of that page is therefore never built.

This is the one page that does not follow the usual view/manage split. Every other page can be granted view-only; this one cannot.

There is no `is_protected` column. Protection comes from a live condition — does this role hold `roles:manage`? — read from `role_permission`.

1. **One holder only.** Exactly one role in the system may hold `roles:manage`. Because both Roles keys are hidden from the role editor entirely, no admin can violate this through the UI; the check exists as a safety net against a bypassed request.
2. **The super-admin role is frozen.** No user may edit it, including a user assigned to it.
   - Editable: `description` only.
   - Locked: `roleName`, `status` (always `active`), and the whole permission set (always every key).
   - Blocked: deletion, deactivation, and duplicating it into a second role holding the restricted key.
   - Opening it in the role editor shows its permission list as plain text or badges rather than tickable checkboxes — visible so an admin can see what it holds, with nothing to click.
3. **Never zero holders.** Block any user action — delete, deactivate, reassign role — that would drop the number of active users holding `roles:manage` to zero.
4. **Warn at two to one.** When such an action would take the count from 2 to 1, show a warning but allow it.
5. **No user changes their own role.** Applies to everyone, including the super-admin. A user holding `users:manage` may reassign other users freely, but never themselves. This prevents self-promotion, and also self-lockout — an admin stripping their own `users:manage` and losing access to the only page that could undo it.
6. **Only a super-admin assigns super-admin.** Assigning _or_ unassigning the super-admin role requires holding `roles:manage`. For every other user that role is disabled in the user editor's dropdown, and users already holding it cannot be moved off it.

   Rules 5 and 6 together close the grant path completely: a user manager can neither promote themselves nor promote a colleague, so the role can only ever be granted by someone who already holds it, or by `create-admin.ts` on the server. Unassignment is restricted the same way — rule 3 only prevents the count reaching zero, so without this a user manager could still unilaterally demote one of two super-admins.

**Net effect.** Exactly one super-admin role exists, it always holds every key, it cannot be weakened or deleted, at least one active user always holds it, and it can only be granted by someone who already holds it or by the bootstrap script. Ordinary roles — a user manager, a GSU role, a read-only role — remain fully editable and are expected.

---

### Role templates

Constants in `src/lib/server/role-templates.ts`. They are pre-ticked defaults shown when an admin creates a role, and nothing more. They are never saved to the database as records of their own; once a role is created from one, the template has no further connection to it.

- **Super Admin:** every key, read from `PERMISSIONS`, so a new module is picked up automatically. It is what `create-admin.ts` reads on a fresh server, and the only template that includes either Roles key. The editor never offers it.
- **Admin:** Users, Employees, Org Structure, and Signatories, `view` and `manage` each. No Roles keys and no fuel work: the admin does not do GSU's job.
- **GSU:** `fuel:view`, `fuel:view_all_offices`, Purchase Orders, and Assets, and later approving slips.
- **Staff:** `fuel:view` for their own office, and later recording withdrawals.
- No template other than Super Admin may include either Roles key.

---

### Rows by office (decided, not built yet)

Each person sees only their own office's records, using the office on their employee record (`employee.org_unit_fk`). `fuel:view_all_offices` shows every office's records, including every office's allocation; the GSU role and the super-admin hold it, and no other role does. A key is used rather than a check of "is this person in GSU", because the super-admin is not in GSU and because a role can then be given the key without changing code.

Example: a CDS staff member opens the fuel pages and sees only CDS's allocation and withdrawals; a GSU staff member sees every office's.

Within one office, any staff member whose role allows editing may edit a record that a colleague made; the record's history shows who changed what (MPP-122).

The rule is built with the first page that needs it. Until then the key exists and is in the GSU template, but nothing checks it.

---

### Bootstrapping — `create-admin.ts`

Runs on the production server after build, via `tsx`, reading source directly rather than build output.

- Look for the super-admin role **by permission** — the role holding `roles:manage`. Never by name.
- If none exists, create it from the **Super Admin** template: the role row plus a `role_permission` row for every key.
- If it already exists, reuse it and just create the user.

---

### Permission sync — `sync-permissions.ts`

Permission rows are data, not schema. Adding a key to `PERMISSION_DEFS` changes no table, so `drizzle-kit generate` produces nothing for it. This script is what puts new keys into the database, and must be run after any change to `PERMISSION_DEFS`.

1. **Upsert** every key in `PERMISSIONS`.
2. **Report orphans and offer to delete them** — keys still in the `permission` table that no longer exist in `PERMISSION_DEFS`, left behind when a key is renamed or removed in code. Each is listed with the roles that hold it, then a single yes/no covers the whole set, defaulting to No. Answering yes deletes the `role_permission` grants and the `permission` rows in one transaction, grants first, because `role_permission.permission_fk` is declared without `onDelete` and MySQL restricts. The question is never skipped: "missing from the code" means either removed for good or absent from the branch currently checked out, and the script cannot tell those apart — while which roles held a key is recorded nowhere but the database.
3. **Backfill the super-admin role** with any key it is missing. Required, because that role is frozen and has no UI path to gain a new key. If no role holds `roles:manage`, warn and skip — that's a fresh database where `create-admin.ts` hasn't run yet.
4. **Re-normalize every role** to include its implied keys.

Renaming a key leaves every role that held it without the new one, and the sync cannot tell a rename from a removal. A rename therefore needs a one-off step that grants the new key to each holder of the old one before the old one is deleted, as `tmp/mpp-121-carry-keys/carry-old-keys.ts` did on 24 October 2026.

Same security posture as `create-admin.ts`: server access is the real boundary, the DB-password prompt is a secondary check.

---

### Still open

**Fuel's later keys.** `fuel:approve` controls who may mark a withdrawal slip approved. Fuel is the only module with an approval step: a staff member requests a slip and GSU approves it; the approval is physical, a signature on the printed slip, and afterwards someone marks the slip approved in the system. A key for recording withdrawals comes with it. Both come with MPP-80 and MPP-81. The other modules (electricity, water, paper, ESWM, GHG) record data without approval and need no `approve` key.

**Surfacing role contents outside the Roles page.** A user manager assigns roles without being able to open the Roles page. The user editor shows the pages the selected role opens, and the Users table shows them in a tooltip on the role.

**A "view as this role" tool** for the super-admin is being considered (MPP-123).
