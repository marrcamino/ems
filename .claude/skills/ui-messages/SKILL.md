---
name: ui-messages
description: Write short, correct UI messages (neutral/normal, info, success, warning, error), confirm dialogs, field validation errors, and empty states. Decides the component, whether the message needs a title, a description, an action button, and a dismiss control, then writes the copy and the shadcn-svelte code. Use whenever writing, reviewing, or fixing any user-facing alert, toast, banner, notification, validation message, confirmation dialog, or empty-state text, even if the request is only "add a warning here", "show an error when save fails", "toast when saved", "is this message ok?", or pasted message text.
---

# UI messages

Goal: the user understands the message in a few seconds. Short beats complete. Every extra word costs reading time, so a message only includes what the user needs to act or to trust that things worked.

## Workflow

1. Classify the **type** (Step 1).
2. Pick the **component** (Step 2).
3. Decide the **parts**: title? body? action? dismiss? (Step 3).
4. Write the copy with the **rules** (Step 4).
5. Run the **validator** (Step 5), fix errors, judge warnings.
6. Return the result in the **output format**. Add Svelte code only when code is being written (read `references/components.md` first).

## Step 1: Type

Ask: *has the user acted yet, and how did it go?*

| Type | Use when | Example |
|---|---|---|
| neutral (normal) | Status update with no good/bad tone | "Syncing records" |
| info | Helpful context, no action needed | "Reports count only approved records." |
| success | A task finished as expected | "Asset saved" |
| warning | **Before** an action, or a condition that will cause a problem (incl. a missing prerequisite) | "No asset types yet" |
| error | **After** an action: something failed or is blocked | "Asset not saved" |
| confirm | User is about to do something destructive or irreversible | "Delete asset?" |

Warning vs error: warning = might go wrong / can't start yet; error = already went wrong.

## Step 2: Component

| Situation | Type | Component | Title | Body | Action | Dismiss |
|---|---|---|---|---|---|---|
| One field has invalid input | error | `Field.Error` under the field | no | 1 sentence: the fix | no | clears when fixed |
| Form submit with several errors | error | `Alert` destructive at top of form **+** `Field.Error` per field | yes: "2 fields need fixing" | none | no | no |
| Routine save/create/update worked | success | `toast.success` | yes | only for undo or next step | optional: Undo / View | auto |
| Action failed | error | `toast.error`; `Alert` destructive if it blocks the page | yes: what failed | 1 sentence: the fix | Retry, if retry can work | toast: stays if it has an action |
| Missing prerequisite / page condition | warning | `Alert` warning style, top of the section | yes: the condition | 1 sentence | yes: button that fixes it | no, stays until resolved |
| Risky or irreversible action | confirm | `AlertDialog` | question: "Delete asset?" | what is lost + can it be undone | specific verb + Cancel | Cancel |
| Tip / context | info | `Alert` info style, or `Field.Description` | only if it helps scanning | 1 sentence | no (link if needed) | optional |
| Nothing to show yet | info | `Empty` | yes: the state or what to do | 1 sentence: why + next | 1 button matching the title | no |
| Neutral status | neutral | `toast()` | yes | usually none | no | auto |

## Step 3: Parts

**Title**
- Needed on alerts, toasts, dialogs, empty states: it is the line people actually read.
- No title on field errors and helper text.
- Skip it on info alerts when one sentence already says everything; a title there just repeats the body.
- Title-only is often enough for success and neutral toasts ("Asset saved").
- Test: read the title alone. If the user knows what happened, the body is optional.

**Body**
- Include it only if it adds the fix, the consequence, or the undo. Otherwise leave it out.
- Errors must say how to fix (in the body or via the action button).
- Max 2 sentences (field errors: 1).

**Action button**
- Add one when the user can fix it right here (Retry, Add asset type), when there is a real follow-up (View, Undo), or when a choice is required (dialog).
- Skip it when there is nothing to do, when the fix is typing in a field, or when the right button is already next to the message.
- One action per message, plus Cancel/dismiss if needed.
- The button lives **in** the message. Never write "use the button above" or "click X on the left"; that makes the user search.
- A toast with an action must stay until dismissed (`duration: Number.POSITIVE_INFINITY`), or the action must also be reachable elsewhere, because toasts disappear.

**Dismiss (X)**
- Allow it, except for critical messages or a required step (those stay until resolved).
- Info callouts that explain the page stay visible, no X.

## Step 4: Writing rules

**Title**
- 2–4 words, not counting a/an/the. Hard max 5.
- State what happened or the condition, not what to do. Exceptions: confirm dialogs ("Delete asset?") and empty states may lead with the action.
- Specific, never generic: not "Error", "Warning", "Heads up", "Oops". Don't prefix the type ("Error: …"); the icon and color already say it.
- Sentence case, no period, no "!". Question mark only in confirm dialogs.
- Success: object + past-tense verb ("Asset saved"). Never "Success" or "successfully".

**Body**
- Order: **action first** when the user must act, then a short reason. Info and no-action warnings: the fact first.
- Max 2 sentences. Don't repeat the title.
- Plain words. No error codes or tech terms (HTTP 422, null, constraint, exception); log those instead.
- No "please", "sorry", "oops". No "you can": start with the verb.
- Don't blame. System fault: "We couldn't…". User input: state the fix neutrally ("Enter a date after March 1.").
- Unknown cause: most likely fix first, backup second ("If it keeps happening, contact ICT.").
- Don't point at screen locations ("above", "on the left"). Put the button in the message.

**Joining words** (titles, bodies, helper text, descriptions)
- Short does not mean dropping words. Keep "that", "which", "who", "where", "when". English allows dropping them (a contact clause), but the reader then cannot tell where one phrase ends and the next begins, which is hardest for people reading English as a second language.
- Keep the joining word before a describing clause: "machines **that** the office fuels", not "machines the office fuels".
- Keep "that is / which are" when the phrase is more than a word or two: "assets **that are** saved under it", not "assets saved under it".
- Keep "where" and "when": "the list **where** types are picked", "the day **when** it arrives".
- Keep "that" after say, think, know, mean: "This means **that** the plate is required."
- Don't stack nouns: "the screen **where** fuel is recorded", not "the fuel record screen".
- To save length, cut a whole idea, not the small words that hold a sentence together.

**Action label**
- Verb first, 1–3 words: "Retry", "Add asset type", "View asset".
- Never "OK", "Done", "Yes", "No", "Click here". Avoid "Continue", "Submit", "Confirm".
- In a confirm dialog, reuse the title's verb: "Delete asset?" → "Delete".

**Behavior** (not copy, but part of a good message)
- On error, keep what the user typed. Never clear the form.
- Show field errors after the user leaves the field or submits, not while they type the first time.
- Use icon + color + text together; never color alone.

## Step 5: Validate

The validator checks the hard limits and banned words. It cannot judge meaning, so still re-read the message against the rules above.

```bash
# one message
node .claude/skills/ui-messages/scripts/validate.mjs --type warning --component alert --title "No asset types yet" --body "Add one to start adding assets. Each asset needs a type, like motorcycle or generator." --action "Add asset type"

# many messages (JSON array of {type, component, title, body, action, persistent})
node .claude/skills/ui-messages/scripts/validate.mjs messages.json
```

Fix every `ERROR`. For each `WARN`, fix it or keep it with a reason. If the skill is installed globally, the path is `~/.claude/skills/ui-messages/scripts/validate.mjs`.

## Output format

When writing a message:

```
Type: warning
Component: Alert (warning style), top of Assets section
Title: No asset types yet
Body: Add one to start adding assets. Each asset needs a type, like motorcycle or generator.
Action: Add asset type → opens asset type setup
Dismiss: no, stays until a type exists
```

Then the Svelte 5 snippet if code is involved.

When reviewing existing copy: numbered issues (each naming the broken rule), then the rewrite in the format above.

## References

- `references/components.md`: shadcn-svelte snippets (Alert, Sonner toast, AlertDialog, Field, Empty) and how to add warning/success/info styles. **Read before writing code.**
- `references/examples.md`: before/after pairs for every type. Read to calibrate tone and length.
- `references/rules.md`: per-type details, accessibility, where the sources disagree, and source links. Read when unsure or when asked "why".
