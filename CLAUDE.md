# EMS Project — Claude Context

Read these repo files for full context (don't repeat what's in them): `project-brief.md`, `conventions.md`, `RBAC_design___locked_decisions.md`, `src/lib/server/db/schema/index.ts` (Drizzle table definitions).

## Stack

SvelteKit + Svelte 5 (runes syntax), TypeScript, Tailwind CSS, shadcn-svelte, Drizzle ORM, MySQL 8.4, `adapter-node`. Fully offline LAN — no internet, no CDN, no OAuth. Dev environment: Windows, local MySQL 8.4.

## Auth & Routing

Session-based auth via `node:crypto` (`createHash`, `randomBytes`, `scryptAsync`). DB vars via `$env/static/private` (not `DATABASE_URL`/`process.env`). Password reset uses `must_change_password` flag (no email). `void url.pathname` in `+layout.server.ts` forces server round-trips so `hooks.server.ts` guard fires on client nav — structurally necessary, not a workaround. `ROLE_ROUTING_EXEMPT` skips paths like `/logout`. `event.route.id !== null` prevents misrouting on missing URLs.

## RBAC in Code

Permission keys: `module:verb` or `module:verb_qualifier` (e.g. `fuel:view`, `admin:manage_roles`). `PermissionKey` type derived from `as const` in `src/lib/server/permissions.ts` — use `import type` when importing client-side to avoid server-only guard issues. Permissions loaded via `validateSessionToken` join → `Set<string>` on `locals.permissions`. Access utils in `src/lib/rbac/access.ts`: `can`, `canAll`, `canAny`, `canModule`, `createAccess`. Pattern A (tiered/OR): `fuel:view_all` supersedes `fuel:view`. Pattern B (AND-gate): rare, only confirmed instance is the admin critical pair.

## Drizzle Conventions

`BIGINT UNSIGNED` PKs, `_pk`/`_fk` naming, semantic FKs allowed (e.g. `created_by_fk` → `user_pk`). Soft deletes via `status` ENUM. Types via `$inferSelect`/`$inferInsert` (in `src/types/`). Composite PKs as arrays. `AnyMySqlColumn` for circular FK imports. Migration: `drizzle-kit push` during dev, `drizzle-kit generate` once per release.

## Org Hierarchy

Four levels: Office → Division → Section → Unit. Self-referencing `org_unit` adjacency list (not flat FK fields on user).

## CLI Scripts

In `scripts/`, run via `tsx`. `create-admin.ts` is a production provisioning script (seeds Admin role from `ROLE_TEMPLATES` if absent, then creates user). Shared helpers in `scripts/lib/`. UI: `@clack/prompts` + `picocolors`.

## Svelte Patterns

Svelte 5 runes (`$state`, `$derived`) — not legacy stores. Colocated components in route folders with self-relative imports. `makeContext` utility for shared context state. `ROLE_TEMPLATES` is UI suggestion + bootstrap source only — not seeded DB rows.

## Dev Preferences

Iterative, debug-driven: build one layer, surface real errors, resolve before moving on. Show options/samples before committing to implementations. Explain rationale before architectural decisions.
