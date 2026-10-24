---
type: module
status: done
next: MPP-121, one layout, one sidebar, and one empty dashboard at `/` for everyone (decided 24 October 2026, not started)
updated: 2026-10-24
---
# App foundation

Sign-in, sessions, the sidebars, shared components, and the command-line scripts.

## Home
| Source | Path |
|---|---|
| Code | `src/hooks.server.ts`, `src/routes/(auth)/`, `src/lib/server/auth/`, `src/lib/components/navigation/`, `src/lib/components/dialog-views/`, `scripts/` |
| Tests | `e2e/test-page.spec.ts` (the only test) |
| Decisions / notes | `.claude/docs/features/employee-and-user-separation.md` (Topic 11, `create-admin`) |
| Graph nodes | `hooks.server.ts`, `session.ts`, `redirect.ts`, `dialog-views-content.svelte`, `cli.ts` |
| Related cards | `cards/roles-and-permissions.md` |

## Open (tracked in Linear)
- MPP-101 fix or remove the failing `e2e/test-page.spec.ts`
- MPP-64 run `create-admin` on an empty database
- MPP-83 build the dashboard at `/`, one home page for everyone (kept empty for now)
- MPP-121 one layout and one sidebar for everyone, no `/admin` redirect
- MPP-122 an activity log of who changed what, and when
- MPP-124 decide whether records need attachments (not needed now)

## Gotchas
- Anybody holding `admin:view` is sent into `/admin`; everybody else is kept out (`hooks.server.ts`). Being removed by MPP-121 (`.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md`).
- Session cookie is not `secure`: the office network has no HTTPS.
- Script messages are wrapped at 60 characters by `wrap()` in `scripts/lib/cli.ts`.
