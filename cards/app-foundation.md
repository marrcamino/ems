---
type: module
status: done
next: none planned; the two home pages are still placeholders
updated: 2026-10-19
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

## Open
- `e2e/test-page.spec.ts` fails: the combo box it drives was removed from `/admin/test`. Delete or replace it.
- `npm run create-admin` has not been run on an empty database since 7 September.
- The staff home `/` and the admin home `/admin` are placeholders.

## Gotchas
- Anybody holding `admin:view` is sent into `/admin`; everybody else is kept out (`hooks.server.ts`).
- Session cookie is not `secure`: the office network has no HTTPS.
- Script messages are wrapped at 60 characters by `wrap()` in `scripts/lib/cli.ts`.
