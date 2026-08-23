---
name: commit-message
description: Use when writing a git commit message for this repo — when the user asks to commit, stage and commit, amend a commit message, or rewrite one. Enforces the house format - a prefix and short lowercase title, a blank line, then a wrapped bullet list. Never prose paragraphs.
---

# Commit message format

## Shape

```
<prefix>: <short title>
                              <- blank line, always
- <bullet>
- <bullet that runs long wraps at 72 characters and the
  continuation is indented two spaces>
```


## Title
 
- Conventional prefix: `feat:`, `fix:`, `refactor:`, `chore:`,
  `docs:`, `test:`
- Lowercase the first letter after the prefix. No trailing period.
  Under ~72 characters.
- New, previously untracked files are `feat:`, not `refactor:`.
- Then a blank line. Always.
## Body
 
- **Bullets only** (`- `). Never prose paragraphs.
- Wrap at 72 characters; indent continuation lines two spaces.
- One bullet per logical change — don't split one change in two, or
  pack two changes into one.
- Say what changed. Add *why* only when it isn't obvious, and keep it
  to one clause.
- Write identifiers literally: `src/lib/rbac/access.ts`,
  `admin:manage_org_units`, `PERMISSION_DEFS`.
- 3–6 bullets. If it needs more, say so — the commit is probably doing
  too much.
- No `Co-Authored-By` trailer, no "Generated with" footer.
## Good
 
```
feat: add rbac access utility and enforce permissions on org-units
 
- add admin:manage_org_units to PERMISSION_DEFS
- add src/lib/rbac/access.ts with can, canAll, canAny, canModule for
  checking locals.permissions (Set<string>) against PermissionKey.
  lives outside server/ since it's pure Set logic — safe to import in
  load functions, hooks, and .svelte components
- guard org-units create/update/delete with admin:manage_org_units,
  using fail(403) so use:enhance surfaces a toast instead of the error
  boundary
```
 
## Bad
 
```
feat: split admin and staff permission trees
 
PERMISSION_DEFS now carries one submodule per admin page under `admin`,
each with view and manage, mirroring the staff modules one-for-one so
that /admin/fuel and /fuel are separate routes. Also rewrites CLAUDE.md,
moves the locked RBAC decisions into .claude/, adds the shadcn-svelte
table component, and refreshes the graphify-out data.
 
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```
 
Wrong because: prose instead of bullets; the "Also rewrites..."
sentence crams four separate changes into one line when each is its own
bullet; and it carries a `Co-Authored-By` trailer.
 
## Check before finishing
 
Prefix and lowercase title · blank line after it · every body line is
`- ` or a 2-space wrap · nothing over 72 characters · no trailers.