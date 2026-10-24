# Shared work pages, an (admin) page group, and permissions by office

Decided by the owner on 24 October 2026, after a discussion from 22 to 24
October. **Not built yet.** Until the code is moved, it still follows the old
rules in `.claude/skills/rbac-design/SKILL.md`; that skill marks the parts this
decision replaces.

"Office" here means any division, section, or unit, as the office itself says
it.

## Why

1. Fuel lived only under `/admin/fuel` (the dashboard, Assets, and Purchase
   Orders). GSU staff are ordinary staff, and under the old rules a staff
   account cannot open `/admin`. Letting GSU work from their own account would
   have meant building the same screens again under `/fuel`, so every data page
   would exist twice.
2. The old rules made every role either an admin role or a staff role, and sent
   anyone holding `admin:view` into `/admin` (`src/hooks.server.ts`). The reason
   for the split (commit `42dfab9`, 23 August 2026) was that the admin and staff
   screens for the same data were expected to differ. In practice the same
   screens are needed by GSU, by the admin, and partly by every office.
3. Most business systems work the way this decision does: role-based
   permissions for "which pages and buttons", a few rules for "which rows" (as
   Odoo's groups and record rules do), one set of shared work pages that show
   their parts by permission, and one separate area for running the system.

## What was decided

1. **Roles can mix any keys, and it stays one role per user.** There is no more
   "admin role or staff role". The role editor shows every key, listed under
   page headings. Only the super-admin role ever holds the Roles page keys.
2. **Keys are named after the data, as `thing:action`,** with no submodules, so
   a key always splits cleanly at the `:`.
   - `fuel:view` opens the fuel pages.
   - `purchase_orders:view` and `purchase_orders:manage` cover POs and
     suppliers.
   - `assets:view` and `assets:manage`.
   - `users`, `employees`, `org_units`, `signatories`, and `roles` each get
     `view` and `manage`.
   - `electricity`, `water`, `paper`, `air_travel`, `eswm`, and `ghg` each get
     `view` and `manage`. Today each exists twice, as a staff module and as an
     `admin` submodule; the two become one.
   - `fuel:view_all_offices` (point 4), and later `fuel:approve`, for marking
     slips approved.

   Only "view" and "manage" per thing for now; they are split into add, edit,
   and delete only when the office needs it. Moving a page never renames a key.
3. **Assets stays at `/fuel/assets`, with the key `assets`,** because the asset
   list may later cover equipment that uses no fuel (GEMP's inventory). The key
   does not need to change if the page moves.
4. **Each person sees only their own office's records,** using the office on
   their employee record. `fuel:view_all_offices` shows every office's records,
   including every office's allocation. The GSU role and the super-admin hold
   it; no other role does. A key is used rather than a check of "is this person
   in GSU", because the super-admin is not in GSU and because a role can then
   be given the key without changing code.
   Example: a CDS staff member opens the fuel pages and sees only CDS's
   allocation and withdrawals; a GSU staff member sees every office's.
   Within one office, any staff member whose role allows editing may edit a
   record that a colleague made; the record's history shows who changed what
   (told by the owner, 24 October 2026; the history is the activity log,
   MPP-122).
5. **Role templates** (pre-ticked starting points; the super-admin can change
   any role):
   - **Super Admin:** every key, as the last resort. The owner relies on a
     record of who did what, but EMS does not keep one yet: only employee
     history is logged, and most tables store only who created a row (MPP-122).
     `scripts/create-admin.ts` creates the first super-admin role from it.
   - **Admin:** Users, Employees, Org Structure, and Signatories. No Roles keys
     and no fuel work (separation of duties: the admin does not do GSU's job).
   - **GSU:** Fuel, Purchase Orders, Assets, `fuel:view_all_offices`, and later
     approving slips.
   - **Staff:** `fuel:view` for their own office, and later recording
     withdrawals.
6. **The work pages are one shared set:** `/fuel` with its Assets and Purchase
   Orders pages, and later electricity, water, paper, air travel, ESWM, and
   GHG. Each page checks its view key when it opens, and each save checks its
   manage key.
7. **The pages for running the system sit in an `(admin)` folder,** with no
   `/admin` address. A folder name in brackets groups files without becoming
   part of the address, as `(app)` and `(auth)` already do:

   ```
   src/routes/(app)/
     +page.svelte          →  /        (the dashboard)
     fuel/                 →  /fuel, /fuel/assets, /fuel/purchase-orders
     (admin)/
       users/              →  /users
       roles/              →  /roles
       employees/          →  /employees
       org-structure/      →  /org-structure
       signatories/        →  /signatories
   ```

   The folder is named "admin", not "settings", by the owner's choice. It has
   no layout check, because each page in it needs a different key.
8. **One sidebar for everyone;** each link shows only to people who hold its
   key:

   ```
   Dashboard            →  /
   Fuel                 →  /fuel
     Assets             →  /fuel/assets
     Purchase Orders    →  /fuel/purchase-orders
   ────────────
   Users                →  /users
   Employees            →  /employees
   Org Structure        →  /org-structure
   Signatories          →  /signatories
   Roles                →  /roles        (super-admin only)
   ```
9. **Everyone lands on the dashboard at `/` after signing in.** It stays empty
   for now (MPP-83); the owner will design it later. The plan for it: a card
   for each page the person can open, shown by key.
10. **A page someone cannot open** shows the existing "You do not have
    permission" error. It only appears when someone types an address or follows
    an old link.

## What it rules out

1. A separate admin copy of any data page.
2. Sending people into an area, or keeping them out of one, by their address.
3. Keys named after pages, such as `admin:manage_purchase_orders`.
4. Deciding what someone may do by checking whether they belong to a
   particular office, such as GSU. A key decides that; the person's own office
   only decides which rows they see (point 4 above).

## Costs accepted by the owner

1. Two pages cannot share an address, because no page has a prefix. SvelteKit
   refuses to start and names the two if it happens.
2. Logs cannot group the admin pages by address.
3. Every key is renamed once. Nothing is deployed and the database can be
   rebuilt, so the rename has no risk.

## What has to change in the code

1. `src/hooks.server.ts` and `src/lib/server/auth/redirect.ts`: remove the
   `/admin` redirect; everyone lands on `/`.
2. `src/routes/admin/+layout.server.ts` and `src/routes/(app)/+layout.svelte`
   become one layout; `src/routes/admin/+page.svelte` goes, and
   `src/routes/(app)/+page.svelte` (sample content today) becomes the empty
   dashboard; `admin-sidebar.svelte` and `staff-sidebar.svelte` become
   one sidebar; `nav-header.svelte` and `app-error.svelte` stop checking
   `admin:view`.
3. `src/lib/server/permissions.ts`: the new keys, and its top comment rewritten.
4. `src/lib/rbac/permission-tree.ts` (`RoleKind`, `keysForKind`,
   `roleKindOf`), the kind column and the kind question on the Roles page, and
   `src/lib/server/role-templates.ts`.
5. `scripts/create-admin.ts`, `scripts/sync-permissions.ts`, and
   `scripts/lib/super-admin.ts`: the super-admin is found by `roles:manage` and
   is filled with every key.
6. Every `can("admin:…")` check, and every `/admin` link, breadcrumb, and data
   address.
7. `src/routes/admin/test/`: given its own key or removed before deploying.
8. The office rule for rows (point 4), built with the first page that needs it.
9. The docs: `.claude/skills/rbac-design/SKILL.md` rewritten, and the cards and
   feature docs that name `/admin` paths.
