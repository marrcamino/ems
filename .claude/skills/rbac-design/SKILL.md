---
name: rbac-design
description:
  Locked RBAC decisions for the EMS project. Use for any work touching
  permission keys, PERMISSION_DEFS, roles, the role editor, the super-admin role,
  expandPermissions or PERMISSION_IMPLIES, session permission loading, route guards
  in hooks.server.ts, create-admin.ts, or sync-permissions.ts. Also use when deciding
  whether a new page belongs under /admin or the staff routes.
---

## RBAC Design — Locked Decisions

### Core model

- User → Role → Permissions (many-to-many via `role_permission`)
- Permissions are fixed and developer-defined at build time. An admin never creates or edits a permission.
- Roles are created and edited by an admin at runtime. No role is hardcoded — except the super-admin role, which is created by script and then frozen (see below).
- One role per user. There are no per-user permission overrides; if one person needs a different set, duplicate the closest role and adjust it.
- Every access check in code — route `load` functions, the `hooks.server.ts` guard, and show/hide conditionals in components, all via the helpers in `src/lib/rbac/access.ts` — tests a permission key, never a role name. `can("admin:manage_fuel")`, never `roleName === "Admin"`. Role names are runtime data an admin can rename; keys are defined in source and cannot change underneath the code.

---

### Two kinds of role

A user holding `admin:view` is an admin user and is sent to `/admin`, which is their dashboard. Their navigation shows only `/admin/*` pages. If they type a staff URL like `/fuel` directly, the normal permission guard in `hooks.server.ts` blocks them — they hold no `fuel:*` key, so nothing special is needed to stop them.

This means a staff permission is unusable to an admin user. So every role is one of two kinds, chosen when the role is created:

- **Admin role** — holds only `admin:*` keys. Works inside `/admin/*`.
- **Staff role** — holds only non-admin keys. Works inside the staff routes.

The role editor asks which kind up front and then shows only that key set. The two are never mixed in one role.

Admin data pages mirror the staff ones: `/fuel` for staff submission, `/admin/fuel` for admin management. They are separate routes with separate UIs, not one route branching on permissions — the admin table has features the staff table doesn't, and keeping them in one route would tangle two different interfaces together.

---

### Permission key shape

`PERMISSION_DEFS` in `src/lib/server/permissions.ts` is the single source. `PERMISSIONS`, `PermissionKey`, and `PERMISSION_IMPLIES` are all derived from it — a new module or action is added there and nowhere else.

- A module may contain **one** level of submodules. `admin` → `fuel` → `manage`. No deeper: the flattening below stops being unambiguous.
- A submodule action flattens **action first, submodule second**: `admin` → `users` → `manage` becomes `admin:manage_users`.
- Every module and every submodule must define a `view` action. The types enforce it. This is load-bearing: `module:view` is the key each route's `load` function checks, so a module without one is unreachable by anybody.
- **Keys are built forward, never split back apart.** Building forward means assembling the string from its parts: module + submodule + action → `admin:manage_users`. Splitting back apart means taking a finished key and recovering the parts from it, which is impossible here — `_` is both the separator and a legal character inside a submodule name, so `admin:view_org_units` reads equally well as `view` + `org_units` or `view_org` + `units`. Nothing in the string resolves it.
- To find a key's submodule, look it up rather than compute it. `PERMISSIONS` records `submodule` at build time, while the parts were still separate.
- The `permission` table has a `module` column but no `submodule` column, and `module` holds the parent only — `admin`, never `admin.users`. So UI grouping by submodule reads `PERMISSIONS` in TypeScript, not the database row and not the key string.
- Naming: plural for things you can count (`users`, `roles`, `org_units`), singular for the rest (`fuel`, `water`, `paper`, `air_travel`).
- Data modules appear twice on purpose — once as a staff module, once as an `admin` submodule. When adding a new data module, add it in both places.

---

### Implied permissions

Holding a key means holding the keys above it in the nesting:

```
admin:manage_org_units → admin:view_org_units → admin:view
fuel:submit            → fuel:view
```

`PERMISSION_IMPLIES` stores single steps only. Never read it directly — `expandPermissions()` walks the chain all the way up. Running it twice over its own output changes nothing, so it's safe to apply anywhere.

Keys it doesn't recognise pass through untouched rather than being dropped, so a leftover row in the database never silently removes access it was already granting.

---

### Role editor rules

**Auto-tick.** Ticking any non-`view` action immediately ticks that module's `view` as well — ticking `admin:manage_fuel` ticks `admin:view_fuel`, because managing a page you cannot open is meaningless. The reverse also holds: unticking a module's `view` unticks every other action in that module. Unticking `admin:view` at the top clears every admin submodule action at once.

**The Roles page keys are hidden.** Neither `admin:manage_roles` nor `admin:view_roles` appears in the role editor. Not greyed out — absent. The Roles submodule therefore renders no checkboxes at all and its group is omitted. Both keys reach the super-admin role only via `create-admin.ts` and the sync backfill.

**Storage.** Save exactly what was ticked. Because the auto-tick rule means the ticked set already includes every implied key, nothing further is needed when a session loads — read the rows as they are.

Still run `expandPermissions()` on the server before writing. The browser can be bypassed: someone can POST a role save holding `admin:manage_fuel` with no `admin:view_fuel`. Expanding server-side means the database can never reach a state the UI would not have produced.

---

### The restricted page: the Roles editor

The Roles page is super-admin-only, both keys. `admin:manage_roles` is the critical one — it is what defines the super-admin role — and `admin:view_roles` is withheld alongside it because a Roles page nobody can edit has no reason to exist. The read-only rendering of that page is therefore never built.

This is the one admin page that does not follow the usual view/manage split. Every other page can be granted view-only to a read-only admin; this one cannot.

There is no `is_protected` column. Protection comes from a live condition — does this role hold `admin:manage_roles`? — read from `role_permission`.

1. **One holder only.** Exactly one role in the system may hold `admin:manage_roles`. Because both Roles keys are hidden from the role editor entirely, no admin can violate this through the UI; the check exists as a safety net against a bypassed request.
2. **The super-admin role is frozen.** No user may edit it, including a user assigned to it.
   - Editable: `description` only.
   - Locked: `roleName`, `status` (always `active`), and the whole permission set (always every `admin:*` key).
   - Blocked: deletion, deactivation, and duplicating it into a second role holding the restricted key.
   - Opening it in the role editor shows its permission list as plain text or badges rather than tickable checkboxes — visible so an admin can see what it holds, with nothing to click.
3. **Never zero holders.** Block any user action — delete, deactivate, reassign role — that would drop the number of active users holding `admin:manage_roles` to zero.
4. **Warn at two to one.** When such an action would take the count from 2 to 1, show a warning but allow it.
5. **No user changes their own role.** Applies to everyone, including the super-admin. A user holding `admin:manage_users` may reassign other users freely, but never themselves. This prevents self-promotion, and also self-lockout — an admin stripping their own `admin:manage_users` and losing access to the only page that could undo it.

6. **Only a super-admin assigns super-admin.** Assigning _or_ unassigning the super-admin role requires holding `admin:manage_roles`. For every other user that role is disabled in the user editor's dropdown, and users already holding it cannot be moved off it.

   Rules 5 and 6 together close the grant path completely: a user manager can neither promote themselves nor promote a colleague, so the role can only ever be granted by someone who already holds it, or by `create-admin.ts` on the server. Unassignment is restricted the same way — rule 3 only prevents the count reaching zero, so without this a user manager could still unilaterally demote one of two super-admins.

**Net effect.** Exactly one super-admin role exists, it always holds every admin permission, it cannot be weakened or deleted, at least one active user always holds it, and it can only be granted by someone who already holds it or by the bootstrap script. Ordinary admin roles — a user manager, a data-only admin, a read-only admin — remain fully editable and are expected.

---

### Role templates

Constants in `role-templates.ts`. They are pre-checked defaults shown when an admin creates a role, and nothing more. They are never saved to the database as records of their own; once a role is created from one, the template has no further connection to it.

- The **Super Admin** template holds every `admin:*` key and is what `create-admin.ts` reads on a fresh server. It is the only template that includes `admin:manage_roles` or `admin:view_roles`.
- The **Admin** template holds every `admin:*` key _except_ the two Roles page keys, derived by filtering rather than listed by hand — so a new admin page is picked up automatically while the Roles page stays excluded.
- No other admin template may include either Roles key.
- Staff templates hold only non-admin keys.

---

### Bootstrapping — `create-admin.ts`

Runs on the production server after build, via `tsx`, reading source directly rather than build output.

- Look for the super-admin role **by permission** — the role holding `admin:manage_roles`. Never by name.
- If none exists, create it from the **Super Admin** template: the role row plus a `role_permission` row for every `admin:*` key.
- If it already exists, reuse it and just create the user.

---

### Permission sync — `sync-permissions.ts`

Permission rows are data, not schema. Adding a key to `PERMISSION_DEFS` changes no table, so `drizzle-kit generate` produces nothing for it. This script is what puts new keys into the database, and must be run after any change to `PERMISSION_DEFS`.

1. **Upsert** every key in `PERMISSIONS`.
2. **Report** orphans — keys still in the `permission` table that no longer exist in `PERMISSION_DEFS`, left behind when a key is renamed or removed in code. Report only, never delete. `role_permission.permission_fk` is declared without `onDelete`, so MySQL restricts: deleting a permission any role still holds fails with a foreign key error rather than removing access. Clearing an orphan therefore means deleting its `role_permission` rows first, which is a deliberate decision about live roles and not one a script should make unattended.
3. **Backfill the super-admin role** with any `admin:*` key it is missing. Required, because that role is frozen and has no UI path to gain a new module. If no role holds `admin:manage_roles`, warn and skip — that's a fresh database where `create-admin.ts` hasn't run yet.
4. **Re-normalize every role** to include its implied keys.

Same security posture as `create-admin.ts`: server access is the real boundary, the DB-password prompt is a secondary check.

---

### Still open

**Staff module actions beyond `view`.** Staff modules currently define only `view`. Fuel will likely need `submit` and `approve`, and possibly `view_all`. Blocked on deciding whether encoder-submitted data requires approval before it counts toward reports — still undecided in the project brief.

**Orphan cleanup.** An orphan is a `permission` row whose key no longer exists in `PERMISSION_DEFS`. Renaming `air-travel` to `air_travel` produces one: the sync inserts `air_travel:view`, while `air-travel:view` stays in the table because step 2 only reports. Today these are removed by hand in MySQL Workbench. Whether the script should eventually offer to delete them — after listing which roles hold them — is undecided and not urgent.

**Surfacing role contents outside the Roles page.** A user manager assigns roles without being able to open the Roles page, so they are picking by name alone. Likely fix is a popover in the user editor listing the selected role's permissions. Not built yet.
