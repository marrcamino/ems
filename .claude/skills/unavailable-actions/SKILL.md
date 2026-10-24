---
name: unavailable-actions
description: Decide what an action looks like when the signed-in person cannot use it — hidden, disabled, shown as unavailable with the reason written next to it, or left enabled behind a confirmation — and how to build each one with shadcn-svelte in EMS. Use this skill whenever adding, reviewing, or changing a condition that hides, disables, grays out, or blocks a button, menu item, or row action: an `{#if can(...)}` around an action, a `disabled` prop, a `canDelete`-style flag, a server rule that refuses an action for some records, or a tooltip on a disabled control. Trigger it even when the request only says "hide the delete button when…", "gray this out", "disable it if…", "only show this to admins", or "why did this option disappear", because the choice made at that moment decides whether the admin understands the screen.
---

# Unavailable actions

An admin who opens a menu and finds an action missing, or grayed out with no reason, cannot tell whether the action is gone, broken, or waiting on something they can fix. This skill decides which of four outcomes an unavailable action gets, so that the screen answers that question instead of the admin having to ask someone.

## Words

- **Disabled** is the code term (the `disabled` prop). On screen and in documents for users, say **unavailable**. "Grayed out" is the informal name for the same thing.
- GitHub's design system (Primer) calls a muted item that still explains itself "inactive". EMS does not use that word for actions, because "inactive" already means a deactivated record (see the `active-inactive-lists` skill). Say "unavailable, with the reason shown".

## Decide

Ask these questions in order, and stop at the first one that settles it.

1. **Does the signed-in person lack the permission?** Hide the action. They can never use it from this screen, so showing it only adds clutter and invites a question that the screen cannot answer. Test the permission key with `can(...)`, never a role name (see `rbac-design`).

2. **Does the action not apply to this record at all?** That is, it has already been done, or it makes no sense for this record: "Mark as no longer employed" on someone who already left, or "Activate" on a record that is active. Hide it, or show the opposite action in the same place.

3. **Does the person have the permission, but something about this record or the system blocks the action right now?** Show it as unavailable. Hiding it here would make the menu change from one record to the next, and the admin would wonder where the action went. Then decide how much to explain:
   - **The cause is visible on the same screen**, to someone who does not know the system's rules: use plain `disabled` with no reason. Examples are "Previous" on page 1, where the page number is right there, and "Remove selected" while nothing is selected.
   - **Otherwise**: show it as unavailable, with the reason in visible text and the step that would make it available, if a step exists. The person who wrote the rule always finds the cause obvious, and the admin usually does not. When unsure, show the reason: a short line costs little, and a grayed-out item with no reason sends the admin to ask someone else.
   - **The data that blocks the action is not loaded on the page**: leave the action normal, let the server check when the admin confirms, and show the refusal inside the dialog that the admin is looking at, never in a toast. An example is deleting an asset that has fuel records, when the assets page does not load fuel records. Loading extra data on every page load only to mark a rarely used action is not worth it. Keep the dialog open, show the reason in a destructive `Alert` above the buttons, and replace the action button with the fix (for example **Deactivate**), so the fix sits next to the reason. A toast disappears on its own and appears away from the dialog, so the admin can lose the step before reading it.

4. **Can the person use it, and is the action serious or hard to undo?** Keep it enabled and ask for confirmation in an `AlertDialog` (the `ui-messages` skill writes it). Routine actions get no confirmation, because a dialog on every action teaches people to click through it without reading. If the action can be undone, a toast with Undo is better than a confirmation (the `active-inactive-lists` skill explains why).

5. **Whatever the screen shows, the server refuses every blocked action.** Hiding and disabling only help the admin; a request sent straight to the server skips them. The condition in the component and the check on the server must be the same rule. Share one function between them where the code allows it, so that the screen never offers what the server refuses, and never hides what the server allows.

Where a locked decision in `rbac-design` already says how a specific control behaves, that decision wins over these rules.

## Never put the reason only in a tooltip

The reason is what the admin needs in order to continue, and a tooltip hides it:

- A tooltip opens on hover, so it never opens on a touch screen.
- In EMS menus a tooltip cannot open on a disabled item at all. The shadcn class in `src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte` sets `pointer-events-none` when the item has `data-disabled`, and bits-ui's arrow-key navigation skips every item that has `data-disabled`. Neither the mouse nor the keyboard can reach the item.
- A native `disabled` button cannot receive focus, so a keyboard user never opens its tooltip either.

A tooltip is fine for extra information on an enabled control, such as the name of an icon-only button.

## Build it

### Menu items (`DropdownMenu.Item`)

| Outcome | How to build it |
|---|---|
| Hidden | Wrap the item in `{#if}`. Put its separator inside the same `{#if}`, so that no stray line is left behind. |
| Disabled, cause visible | The `disabled` prop. The keyboard skips the item, which is acceptable only because nothing needs explaining. |
| Unavailable, with the reason shown | Do not use the `disabled` prop, for the reasons in the tooltip section. Show a muted label with one short reason line under it, inside the item. The item stays reachable by mouse and by arrow keys. Selecting it does not run the action and keeps the menu open. If the reason needs more than one line, selecting it opens a dialog with the full explanation instead. |
| Enabled, with confirmation | A normal item whose `onclick` opens the `AlertDialog`. |

`dropdown-menu-item.svelte` builds the unavailable item through its `unavailable` prop. Pass the reason, or `undefined` when the action is available. The `onclick` stays on the item and simply does not run while a reason is set:

```svelte
<script lang="ts">
  const deleteUnavailable = $derived(
    hasLogin(employee)
      ? `This employee has a login. Delete the account "${employee.username}" on the Users page first.`
      : undefined,
  );
</script>

<DropdownMenu.Item
  variant="destructive"
  unavailable={deleteUnavailable}
  onclick={() => (ctx.deleteAlertDialog = true)}
>
  <Trash2 /> Delete
</DropdownMenu.Item>
```

Keep the menu the same shape for everyone at the same permission level: every record shows the same actions in the same order, except the ones that question 2 hides.

### Buttons

| Outcome | How to build it |
|---|---|
| Hidden | `{#if}` around the button. |
| Disabled, cause visible | The `disabled` prop. |
| Unavailable, with the reason shown | Disable the button and put the reason in visible muted text next to it or under it. |
| Form submit | Keep it enabled. Validate when the form is submitted and show the field errors (`ui-messages`). A submit button that stays disabled until every field is valid gives no clue about which field is wrong. |

## Writing the reason

- Follow **Problem → Cause → Resolution** from `ui-messages`. The muted label already shows the problem (the action is unavailable), so the line gives the cause, then the step: "This employee has a login. Delete the account on the Users page first." Keep it short; two short sentences at most.
- Always state the cause. A step with no cause leaves the admin guessing why it is needed.
- If no step exists, name what to do instead.
- Don't write "You can't…". The person has the permission (question 3), so wording that sounds like a missing permission is wrong here.
- Write it with the `ui-messages` rules: plain and formal, simple tenses, no permission keys, no codes, and no "row" or "column".

## Check before finishing

1. Every hidden action is hidden either because the person lacks the permission (question 1) or because the action does not apply to the record (question 2). If neither is true, the action should be visible.
2. Every `disabled` action with no reason passes the test in question 3: someone new to the screen can see the cause on the same screen.
3. No reason lives only in a tooltip.
4. Confirmation appears only on serious or hard-to-undo actions.
5. The server refuses each blocked case, using the same rule as the screen.

## Examples from EMS

The row menu in `src/routes/(app)/(admin)/employees/employee-actions-cell.svelte`:

| Action and situation | Question | Outcome |
|---|---|---|
| The whole menu, for someone without `employees:manage` | 1 | Hidden |
| "Mark as no longer employed", on someone who already left | 2 | Hidden |
| "Mark as no longer employed", on yourself or on the last person who can manage roles | 3 | Unavailable, with the reason shown |
| "Delete", on an employee who has a login | 3 | Unavailable, with the reason shown |
| "Mark as no longer employed", on the second-to-last person who can manage roles | 4 | Enabled, with confirmation |

## Sources

Use these when a rule is challenged.

- Jakob Nielsen, "Inactive GUI Controls: Show, Disable, or Hide?" (uxtigers.com): hide what is never available to the person; disable what is sometimes available, and explain why, unless the cause is obvious.
- GitLab Pajamas design system, "Feature management": hide when the person lacks the permission; when they have access but the feature cannot be used now, show it with an explanation.
- Microsoft Windows menu guidelines: context menus remove items that do not apply, but keep expected commands such as Delete and Rename, disabled.
- Apple Human Interface Guidelines: dim unavailable menu items instead of removing them, so that menus stay stable.
- Microsoft Windows menu guidelines, again: if working out when an item should be disabled causes performance problems, leave it active and let selecting it show an error.
- Nielsen Norman Group, "Error-Message Guidelines": show the error close to its source; toasts are for issues that need little interaction; offer a remedy.
- IBM Carbon design system, "Notification": inline notifications stay until resolved; toasts disappear after a few seconds and suit messages that do not belong to one part of the screen.
- Nielsen Norman Group, "Tooltip Guidelines": users should not need to find a tooltip in order to complete their task.
- W3C ARIA Authoring Practices, "Developing a Keyboard Interface": disabled menu items should stay focusable so that people can discover them.
- Nielsen Norman Group, "Confirmation Dialogs Can Prevent User Errors — If Not Overused".
- OWASP, "Business Logic Security Cheat Sheet": check "this user, this object, this state, right now" in code, never only in the UI.
- Adam Silver, and the GOV.UK Design System "Button" page: avoid disabled submit buttons; validate on submit.
