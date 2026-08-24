---
name: commit-message
description: Use when writing a git commit message for this repo — when the user asks to commit, stage and commit, amend a commit message, or rewrite one. Enforces the house format - a prefix and short lowercase title, a blank line, then a wrapped bullet list. Never prose paragraphs.
---

# Commit message format

## What to stage

Settle this before writing the message. Three phrases pick the scope,
and one of them is also the default.

### "commit staged files"

Commit exactly what is already staged. Stage nothing new.

- Read the list with `git diff --cached --name-only` and write the
  message from those files only.
- Leave modified and untracked files alone. Don't mention them.
- If nothing is staged, stop and say so rather than staging something.

### "commit primary changes"

Stage only the files that are the primary changes, then commit.

- **Primary changes** = the files created or modified while doing the
  task in this session, once that task is complete.
- Stage them by name — `git add <path> <path>` — never `git add -A`.
- Everything else stays unstaged: files the user edited by hand, older
  work in progress, stray build output.
- **If this session has no completed task** — the request arrives with
  no prior task in the same session — do not guess. Files may have
  changed for reasons Claude never saw. Ask which files are the
  primary changes and what the commit is about, then proceed.

### "commit this" — and the default

Stage everything: modified files, deleted files, and untracked files.
`git add -A`.

- This is what happens when the user names no scope at all.
- Before committing, look at what got swept in. Anything that isn't
  part of the main work goes in the trailing bullet — see **Default
  ordering** below.
- If an untracked file looks like it shouldn't be in the repo at all —
  `.env`, build output, a scratch file, something with a password in
  it — say so and leave it out instead of committing it quietly.
- **If this session has no completed task**, the title has nothing to
  come from. Ask what the main change is before writing it.

Never widen the scope on your own. If which phrase was meant is
unclear, ask — it is one short question, and the wrong scope means an
`--amend` or a reset afterwards.

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
- Say what changed. Add _why_ only when it isn't obvious, and keep it
  to one clause.
- Write identifiers literally: `src/lib/rbac/access.ts`,
  `admin:manage_org_units`, `PERMISSION_DEFS`.
- 3–6 bullets total, counting both groups below. If it needs more, say
  so — the commit is probably doing too much.
- No `Co-Authored-By` trailer, no "Generated with" footer.

### Default ordering

When the user hasn't said how they want the body arranged, use this
order:

1. **Main changes first.** The work the commit is actually about —
   the thing named in the title. One bullet per logical change, most
   important first.
2. **Unrelated changes last.** Anything swept into the same commit
   that isn't part of that work — a stray typo fix, a formatting pass,
   a config or dependency tweak, an unrelated file that happened to be
   staged. These go after the main bullets, as the last bullet(s).

Keep the trailing bullets short: name the file and what changed, no
_why_. Several tiny ones may share a single bullet. If an unrelated
change is big enough to need its own explanation, it probably belongs
in its own commit — say so instead of burying it at the bottom.

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
- unrelated: fix a typo in conventions.md, bump drizzle-kit to 0.31
```

The first three bullets are the actual work, in order. The last one
collects what got swept in with it.

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

Right staging scope · prefix and lowercase title · blank line after it
· main changes before unrelated ones · every body line is `- ` or a
2-space wrap · nothing over 72 characters · no trailers.
