---
name: active-inactive-lists
description: Decision rules and validated Svelte 5 + shadcn-svelte code for any list whose records can be activated/deactivated, archived, enabled/disabled, or soft-deleted instead of hard-deleted. Use this skill whenever the work touches an `is_active` / `status` / `archived` flag on a list — building the list page, choosing what the default view shows, adding a status filter, wiring the deactivate/activate action, deciding whether the row disappears, handling pickers and dropdowns that must exclude inactive records, or keeping historical references to deactivated rows working. Trigger it even when the user only says "add a disable button", "archive instead of delete", "soft delete", "toggle status", or "hide inactive ones" without asking for the whole pattern — the defaults chosen at that moment determine the API shape and are painful to change later.
---

# Active / inactive lists

Most CRUD lists in an internal app eventually need deactivation instead of deletion: an employee resigns, a vehicle is sold, a fuel type is retired. The records must stay in the database because historical rows point at them, but they should stop appearing in everyday work.

Almost every mistake in this pattern is one of three:

- Hard-deleting, then discovering old records now reference a missing row.
- Defaulting the list to show everything, so the working view fills with dead records.
- Letting inactive records stay selectable in form pickers, so new records get created against retired entities.

This skill fixes the defaults so those don't happen.

## The defaults

Apply these unless the user's domain contradicts them. State the assumption rather than asking, then let them correct it.

1. **The list defaults to active only.** People work with live records; inactive is clutter. `GET /api/items` with no params returns active.
2. **A filter reveals the rest**: `Active | Inactive | All`. Never a second endpoint, never a separate page.
3. **The filter lives in the URL** (`?status=inactive`). Refresh, back button, and shared links all keep the view. `status=active` is the default, so omit it from the URL rather than writing it.
4. **Deactivation is `PATCH`, not `DELETE`.** `DELETE` implies the row is gone. Reserve it for records with no history (or don't expose it at all).
5. **Rows never hard-delete.** Resolve historical references by id regardless of status, so a deactivated record still renders its name in old reports.
6. **Form pickers show active only, with one exception**: when editing an existing record whose current selection is now inactive, include that one value so the form doesn't silently change it. See `references/svelte-snippets.md`.

## What happens to the row when it's deactivated

This is the question that actually gets asked. The answer depends on which view is open — **the list must always match its filter**, but the change should be visible rather than instant.

| Current view | On deactivate |
|---|---|
| Active | Row leaves, with a short out transition + undo toast |
| All | Row stays; restyle to muted + `Inactive` badge; action flips to Activate |
| Inactive | Row stays; nothing changes |

Activating does the mirror image.

Supporting rules:

- **Animate the exit.** A row vanishing on click reads as a bug or a delete. A 200ms fade with `animate:flip` on the siblings makes the cause legible.
- **Toast with Undo beats a confirm dialog.** The undo path is one click and costs nothing when the user meant it; a confirm dialog taxes every correct action to guard the rare wrong one. Add a confirm dialog on top only when deactivation cascades (deactivating a department hides its staff) or the user asks for it.
- **Update the counts in the filter labels** — `Active (41) | Inactive (4)` — so the row's destination is obvious.
- **Mutate local state; don't refetch the whole list** for one toggle. Refetch only when server-side pagination or sorting would be left inconsistent.
- **Don't backfill a paginated page** after removing a row. A page of 19 is fine. Pulling the next item in creates a confusing shuffle.

## Optimistic vs pessimistic

Default to **pessimistic** for internal apps on a LAN or nearby server: disable the control, await the `PATCH`, then update. It is fewer states, no rollback path, and the latency is invisible.

Switch to optimistic when the round trip is actually noticeable (remote server, flaky connection) or the user asks. Then the row must restore on failure and the error toast must say what failed, not just "Error".

## Build checklist

When implementing this end to end:

1. Schema: `is_active BOOLEAN NOT NULL DEFAULT true` (plus `deactivated_at TIMESTAMP NULL` if the user needs an audit trail). Not an enum unless there are genuinely three or more states.
2. `GET` collection endpoint accepting `?status=active|inactive|all`, defaulting to `active`, returning counts alongside the rows.
3. `PATCH /api/items/:id` accepting `{ isActive: boolean }`.
4. `load` function that parses and validates `status` from the URL.
5. Filter control bound to the URL via `goto(url, { keepFocus: true, noScroll: true })`.
6. Row rendering that branches on `isActive` for badge, muting, and action label.
7. Toggle handler with toast + undo.
8. Any picker feeding this entity switched to active-only, with the edit-mode exception.

Read `references/api-contract.md` for the endpoint and schema details, and `references/svelte-snippets.md` for the Svelte 5 + shadcn-svelte code. Both are written for TypeScript, runes (`$state`, `$derived`, `$props`), Svelte 5 event attributes (`onclick`, not `on:click`), and `svelte-sonner` for toasts.

## Wording

Pick one vocabulary and hold it across button, badge, filter, and toast. Mixed vocabulary ("Disable" button producing an "Archived" badge) makes users think there are two different states.

- Active/Inactive — records that are still real but not in use (staff, vehicles, categories). Default choice.
- Enabled/Disabled — settings and feature switches, not records.
- Archived — when the user's mental model is "filed away", common for documents and projects.

Toast copy stays factual and short: `Vehicle deactivated` with an `Undo` action. Avoid "Successfully deactivated!" — the toast appearing is the success signal.
