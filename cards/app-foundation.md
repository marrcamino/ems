---
type: module
status: done
next: none planned; the dashboard at `/` is empty until the owner designs it (MPP-83)
updated: 2026-10-24
---
# App foundation

Sign-in, sessions, the one layout and sidebar, shared components, and the command-line scripts.

## Home
| Source | Path |
|---|---|
| Code | `src/hooks.server.ts`, `src/routes/(auth)/`, `src/routes/(app)/+layout.svelte`, `src/routes/(app)/+page.svelte` (dashboard), `src/lib/server/auth/`, `src/lib/components/navigation/`, `src/lib/components/dialog-views/`, `scripts/` |
| Tests | none (the old `e2e/test-page.spec.ts` was archived with the price tester, 24 October 2026) |
| Decisions / notes | `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md` (one layout, one sidebar, everyone lands on `/`), `.claude/docs/features/employee-and-user-separation.md` (Topic 11, `create-admin`) |
| Graph nodes | `hooks.server.ts`, `session.ts`, `redirect.ts`, `app-sidebar.svelte`, `dialog-views-content.svelte`, `cli.ts` |
| Related cards | `cards/roles-and-permissions.md` |

## Open (tracked in Linear)
- MPP-64 run `create-admin` on an empty database
- MPP-83 build the dashboard at `/`, one home page for everyone (kept empty for now)
- MPP-122 an activity log of who changed what, and when
- MPP-124 decide whether records need attachments (not needed now)

## Gotchas
- Nobody is sent into or kept out of an area by address: each page's `load` checks its own key, and sidebar links come from `nav-items.ts` (MPP-121).
- Session cookie is not `secure`: the office network has no HTTPS.
- Script messages are wrapped at 60 characters by `wrap()` in `scripts/lib/cli.ts`.
