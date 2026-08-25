---
name: git-feature-flow
description: Use when doing git work in this repo — committing, merging, switching branches, starting or resuming a feature, or deciding where a change belongs. Enforces the house flow - feature work reaches main only through --no-ff merge commits, main carries app-level or multi-feature commits only, and main merges into a feature branch as a plain fast-forward. Never squash, rebase, delete merged branches, or push.
---

# Git feature flow

The point of this workflow is the **shape of the graph on main**. Main should read as a
short list of merge bubbles (one per feature) plus a handful of app-level commits. Someone
scrolling `git log --graph` on main should be able to see what features landed and when,
without wading through every intermediate commit of each feature.

Everything below follows from that.

## Where does this change belong?

Before writing anything, decide the destination:

| The change is…                                                                                         | Where it goes                                                           |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Part of one feature                                                                                    | A commit on that `feature/*` branch                                     |
| App-level: config, dependencies, build tooling, project scaffolding, docs, chores, cross-cutting fixes | A direct commit on `main`                                               |
| Touching **several features at once**                                                                  | A single direct commit on `main`, message describing the mixed contents |

That last row is a deliberate escape hatch, not a failure. Splitting one change across three
feature branches would create three half-merges and a tangled graph, which defeats the
purpose. One honest mixed commit on main is cleaner. Don't try to talk the user out of it,
and don't quietly split it up.

If it's genuinely unclear which bucket a change falls in, ask — guessing wrong means
history that has to be rewritten later.

## The merge asymmetry (easy to get wrong)

- **feature → main**: always `git merge --no-ff`. The merge commit _is_ the record of the
  feature. Never let this fast-forward.
- **main → feature**: plain `git merge main`. Fast-forward is fine and preferred here —
  these merges are just catching the branch up, and bubbles inside a feature branch add
  noise for no benefit.

Never `rebase` or `squash` to get changes between these branches unless the user explicitly
asks. Both destroy the topology this workflow exists to preserve.

## Routines

Always start by checking `git status` and `git branch --show-current`. Assumptions about
which branch is checked out are the main source of mistakes here.

### Resuming a feature branch that's behind

```bash
git switch feature/<name>
git merge main          # plain merge, no --no-ff
# ...then make the feature's changes and commit on this branch
```

If the branch only exists on the remote:
`git switch feature/<name>` (git tracks it automatically), or
`git switch -c feature/<name> origin/feature/<name>` if that doesn't resolve.

### Starting a new feature branch

```bash
git switch main
git switch -c feature/<name>
```

### Pausing or finishing work on a feature

Same sequence either way — pausing and finishing look identical in this workflow:

```bash
git switch main
git merge --no-ff feature/<name>
```

The user pushes the feature branch themselves, usually before switching to main. Don't run
the push. Once the local merge is done, say so and let them take it from there.

**Leave the feature branch alive.** Do not delete it locally or on the remote after merging.
Branches here are long-lived — the user comes back to `feature/roles` weeks later, merges
main into it again, and keeps going. Deleting merged branches is a common git reflex and it
is wrong in this repo.

### App-level commit on main

```bash
git switch main
git add <paths>
git commit -m "<message>"
```

Keep these scoped to genuinely app-level work. If half the diff is feature code, it belongs
on the feature branch instead.

## Commit and merge messages

The user has a separate skill that owns commit message style. If it's available in the
session, follow it — this skill has no opinion on message format and should not compete with
it. If it isn't available (different project, not loaded), fall back to reading
`git log --oneline -15` and mirroring the style already in that repo.

For merges, use git's default message (`Merge branch 'feature/roles'`). It keeps the graph
scannable and there's rarely anything worth adding.

## Before acting

**Never push.** Not `main`, not feature branches, not with any flag. Pushing is the user's
job and they want to keep it that way — it's their last checkpoint before anything leaves
the machine. Local commits and merges are fine to run; the moment a command would contact
the remote, stop and hand it back to them.

Fetching is the one exception — `git fetch` and other read-only remote commands are fine
when you need to know whether a branch is behind.

Run read-only commands (`status`, `log`, `diff`, `branch`) freely. Confirm with the user
first for anything else that is hard to undo:

- deleting or renaming branches
- `reset --hard`, `rebase`, history rewrites of any kind

## Conflicts

If a merge conflicts, stop and report which files conflicted and what the two sides are
doing. Don't resolve by picking a side automatically — a conflict during `main → feature`
usually means a real overlap the user needs to see. Never `git merge --abort` without
saying so.

## Sanity check

After a feature lands, `git log --graph --oneline main` should show a merge commit whose
second parent is the feature branch's tip. If main instead shows the feature's individual
commits in a flat line, a fast-forward slipped through — flag it to the user rather than
attempting a fix on your own.
