# Rules by type

Details behind `SKILL.md`. Each rule notes its source in brackets; links are at the bottom. [UX guide] is the owner's own message guide, which wins where it disagrees with the others.

## Contents

1. Neutral (normal)
2. Info
3. Success
4. Warning
5. Error
6. Confirm (risky action)
7. Empty state
8. Accessibility
9. Where sources disagree (and what this skill picks)
10. Sources

---

## 1. Neutral (normal)

- For status updates with no good/bad tone: "Syncing records", "Export started".
- Usually a default `toast()` with a title only.
- If the user needs to know when it finishes, follow with a success or error toast (or use `toast.promise`).

## 2. Info

- Gives context without interrupting work or requiring action. Get to the point, say why it matters, let people get back to work. [Atlassian info]
- Pre-task guidance on a page (a "callout") is info or warning only, never success or error. [Carbon]
- Callout placement: near the element it is about; above the button or input it affects. [Carbon]
- A callout has no button of its own; place it near the relevant button instead. [Carbon]
- Don't stack several callouts; use them sparingly for things that must not be missed. [Carbon]
- Drop the title when it is redundant; use one only if it helps scanning. [Carbon]
- Field-level hints go in `Field.Description`, not in an alert.

## 3. Success

- Appears after a task is done; confirms the action. [Atlassian success]
- Title: no "Success!", no "successfully", no exclamation marks. [Atlassian success]
- Body: confirm what was done; if something was created, offer a way to view it. Mention undo if possible. [Atlassian success]
- CTA only when there is a follow-up; don't add one just to have one. Always dismissible. [Atlassian success]
- Frequent success messages should be the shortest and plainest. [Atlassian success]
- Don't show success for trivial field checks (like "field filled in"). [NN/g forms]

## 4. Warning

- Appears **before** an action to flag a significant change or possible loss, or a condition that may become a problem. [Atlassian warning]
- Structure: **Consequence or risk → Choice**. The user has not acted yet, so never word it as though the action already happened. [UX guide]
- Three patterns [Atlassian warning]:
  - **Raise awareness**: describe the condition and why it matters; offer dismiss.
  - **Imminent problem**: say what to do, why, and by when; one button per option. Give a timeline without creating panic.
  - **Confirm risky action**: see section 6.
- Missing prerequisite (e.g. no asset types before adding an asset): warning `Alert` at the top of the section, title = the condition, one button that fixes it.
- Body covers: the problem, how to act, what happens if they don't (only if not obvious). 1–2 sentences. [Atlassian warning]
- Don't use a banner to explain where to click; make the action clear in the UI itself. [Polaris banner]

## 5. Error

- Appears **after** an action. Structure: **Problem → Cause → Resolution**: what failed, why (when known and useful), what to do next. [Microsoft, Google, NN/g]
- Blocked by a business rule (the record's state, not the user's rights): name the item that failed, not the user. "This role can't be deleted because it is assigned to users. Remove them from the role first." Never "You can't delete this", which sounds like a missing permission. [UX guide]
- Match the wording to the real problem: business rule ("can't be deleted because…"), permission ("You don't have permission to delete roles."), validation ("Role name is required."), system failure ("We couldn't delete the role. Try again."). [UX guide]
- Title: what stopped or can't be done ("Server instance unavailable"). No period. [Carbon]
- Body: the fix is mandatory. [Carbon] Don't repeat the title. [Carbon, Atlassian]
- Several possible causes: most likely cause or simplest fix first, a backup (e.g. contact support) second. [Atlassian error]
- No "please" or "sorry": "sorry" makes errors feel worse, "please" makes required steps feel optional. [Atlassian error]
- Use "we" for system faults so the user doesn't feel blamed. [Atlassian error]
- Don't make up a reason you don't know; say it went wrong and give a fix. [Atlassian error]
- Human-readable: no jargon or codes. [NN/g]
- Preserve the user's input; let them edit instead of starting over. [NN/g]
- Reduce correction effort: if you can guess the fix, offer it as a choice. [NN/g]
- Show errors next to their source. [NN/g visibility]
- Long forms: summary banner at the top, plus inline errors on each field. [Polaris banner]
- Don't show errors too early (e.g. while the user is still typing, or on an untouched field). [NN/g]

## 6. Confirm (risky action)

- Ask whether to proceed, explain why they might not, offer proceed + cancel, and say whether it can be undone. [Atlassian warning]
- Title: verb + object + "?" ("Delete customer?"), not "Are you sure you want to delete customer?". [Polaris modal]
- Max two buttons: primary + secondary. [Polaris modal]
- Action button reuses the title's verb ("Delete"), never "OK" or "Continue". [Atlassian, Polaris]
- If the action is easy to undo, prefer doing it immediately and showing an Undo toast instead of a dialog. Confirmation dialogs lose power when shown for everything.

## 7. Empty state

- Title: describe the empty state, or tell people what they can do. Sentence case, no period (question mark allowed). [Atlassian empty state]
- Body: why it's empty and where to go next. 1–2 sentences. [Atlassian empty state]
- One CTA that complements the title ("No assets yet" → "Add asset"). Don't crowd the page with buttons. [Atlassian empty state]

## 8. Accessibility

- Critical and warning banners use `role="alert"` (announced right away); other banners use `role="status"`. [Polaris banner]
  - shadcn-svelte `Alert.Root` hard-codes `role="alert"`. Pass `role="status"` for info, success, and neutral alerts (the prop overrides it).
- Don't move focus to banners that appear on page load; do move focus to a form's error summary on submit. [Polaris banner]
- Actionable notifications take focus and interrupt screen readers, so use actions only when needed. [Carbon]
- Never rely on color alone: icon + color + text. [NN/g]
- Links must say where they go ("View asset", not "Click here"). [Atlassian, Polaris]

## 9. Where sources disagree (and what this skill picks)

1. **Body order.** Atlassian lists reason → action → consequence; Polaris's own example states the limit first, then the fix. This skill follows the owner's UX message guide, which supersedes the earlier "action first" rule: each type has its own structure (the table in SKILL.md Step 4), and for errors the cause comes before the step (**Problem → Cause → Resolution**, as in Microsoft's problem, cause, solution).
2. **Title length.** Atlassian: 3–4 words. Visa: 3–5. This skill: target 2–4, hard max 5.
3. **Action label length.** Atlassian and Carbon: 1–2 words. Polaris: verb + noun ("Add menu item"). This skill: 1–3 words, verb first.
4. **Action-style titles.** Atlassian: titles shouldn't explain what to do. This skill follows that, except confirm dialogs and empty states.

## 10. Sources

- Atlassian — Warning messages: https://atlassian.design/foundations/content/designing-messages/warning-messages
- Atlassian — Error messages: https://atlassian.design/foundations/content/designing-messages/error-messages
- Atlassian — Info messages: https://atlassian.design/foundations/content/designing-messages/info-messages
- Atlassian — Success messages: https://atlassian.design/foundations/content/designing-messages/success-messages
- Atlassian — Empty state: https://atlassian.design/foundations/content/designing-messages/empty-state
- IBM Carbon — Notification usage: https://carbondesignsystem.com/components/notification/usage
- Shopify Polaris — Banner: https://polaris-react.shopify.com/components/feedback-indicators/banner
- Shopify Polaris — Modal (title/button wording): https://polaris.shopify.com/components/deprecated/modal
- Visa — Messaging: https://design.visa.com/content/messaging
- Microsoft — Error message guidelines: https://learn.microsoft.com/en-us/windows/win32/debug/error-message-guidelines
- Microsoft — Error messages (problem, cause, solution): https://learn.microsoft.com/en-us/windows/win32/uxguide/mess-error
- Google — Writing helpful error messages: https://developers.google.com/tech-writing/error-messages
- Material Design — Errors: https://m1.material.io/patterns/errors.html
- NN/g — Ten usability heuristics (help users recognize, diagnose, and recover from errors): https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g — Error-message guidelines: https://www.nngroup.com/articles/error-message-guidelines/
- NN/g — Errors in forms: https://www.nngroup.com/articles/errors-forms-design-guidelines/
- NN/g — Error-message scoring rubric: https://www.nngroup.com/articles/error-messages-scoring-rubric/
- shadcn-svelte — Alert, Alert Dialog, Sonner, Field: https://shadcn-svelte.com/docs/components
