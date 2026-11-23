---
name: rapid-build
description: Fast-build mode for one named job in EMS, in the style of Rapid Application Development. Build the whole job end to end without stopping to discuss each step, then hand it over with a list of the choices that need the user's check. Only the user starts this mode, by typing /rapid-build and naming the job; it ends when that job is handed over.
disable-model-invocation: true
---

# Rapid build

The user normally builds EMS step by step: an approach is talked through and the user decides before anything is written. This skill is a deliberate exception for one job. The user starts it by typing `/rapid-build <job>`, for example `/rapid-build fuel issuance`, and it changes how I work on that job only.

Everything not named below stays as it is, including every saved rule and every other skill.

## Scope

- The mode covers the job the user named and nothing else. If the job is unclear or could mean two different things, ask once at the start, then build.
- The mode ends when I hand the job over. After that, the normal step-by-step way applies again, including for fixes the user asks for after reviewing the job.
- Never start this mode on my own, and never suggest that a rule stops applying outside this job.

## What changes during the job

1. **Build end to end.** Build the whole job in one go, including the screen, the save logic, the list, and the server checks it needs. Don't stop to discuss each step.
2. **Decide the reversible details myself.** These cover layout, wording, which component to use, code structure, naming, and file placement. Follow the existing skills while deciding (ui-messages, unavailable-actions, active-inactive-lists, code-comments, shadcn-svelte, rbac-design), because they cost no extra time from the user.
3. **Hand over with a "Needs your check" list.** At hand-over, list every choice I made on my own that the user might decide differently, one line each, saying what I chose and why. Only real choices go there, not routine code.
4. **Send polish to the card.** When I notice something worth refining but not needed for the job to work, add it to a `## Polish` section in the module's card (`cards/<module>.md`) instead of doing it now or asking about it. Create the section if it's missing. The user's polish comments after review go there too, and they get fixed in one pass later.

## What still stops me and makes me ask

Stop and ask before going ahead with any of these, even in this mode:

- **Tables:** a new table, a new or changed column, or any other database schema change. Read `src/lib/server/db/schema/index.ts` fresh first, and propose the change before writing it.
- **Permissions:** a new permission key, or a change to who can see or do something.
- **Office facts:** any fact about how the office works that isn't written in the feature doc. Ask instead of assuming, as the project rules already require.

Ask these together in one message where possible, so the job pauses once and not several times.

## What never changes

- Records are never deleted, reset, or falsified to make something work, because they are the audit trail.
- Never run `drizzle-kit push` without asking first.
- Git work follows `.claude/skills/git-feature-flow/SKILL.md`. Commit only when the user asks.
- Claude never appears as an author or co-author in commits or pushed work.
- Run `npm run check` before hand-over and report the result as it is.

## Hand-over

End the job with one message that contains:

1. what was built, with links to the main files;
2. how to try it in the running app (which page, what to click);
3. the result of `npm run check`;
4. the "Needs your check" list;
5. what was added to the card's `## Polish` section, if anything.

Then update the card's `status`, `next`, and `updated` fields, and say that rapid-build mode has ended for this job.
