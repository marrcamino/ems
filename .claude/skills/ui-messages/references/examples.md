# Examples (before → after)

Each "after" passes `scripts/validate.mjs` with 0 errors (#6 and #10 get expected warnings: a proper noun, and a summary whose fix is in the field errors). The "why" names the rule that changed it. Run the validator on `scripts/samples/good.json` and `scripts/samples/bad.json` to see both sides.

---

## 1. Missing prerequisite (warning, Alert)

**Before**
> **No asset type is in use**
> Every asset belongs to a type, such as motorcycle or generator. The type decides which meter reading is asked for when fuel is recorded, and the reports add up fuel by type. Use "Set up asset types" above to add one first.

**After**
```
Type: warning
Component: Alert (warning), top of Assets section
Title: No asset types yet
Body: Each asset needs a type, like motorcycle or generator. Add one to start adding assets.
Action: Add asset type
Dismiss: no, stays until a type exists
```

Why: cause first, then the step (Problem → Cause → Resolution: the title is the problem); 4 sentences → 2; meter-reading and report details cut (the user doesn't need them to act); button moved into the message instead of pointing "above".

## 2. Field error (error, Field.Error)

**Before**: `Invalid input!`
**After**: `Enter a plate number, like ABC 1234.`

Why: says the fix, gives an example, no "!", no title.

## 3. Save failed (error, toast)

**Before**
> **Error!**
> Failed to save record due to an error (HTTP 500). Please try again later. Sorry for the inconvenience.

**After**
```
Type: error
Component: toast.error, stays until dismissed
Title: Asset not saved
Body: Check your connection and try again.
Action: Retry
```

Why: specific title; no code, "please", or "sorry"; one-button fix; input stays in the form.

## 4. Save worked (success, toast)

**Before**: `Success! Asset has been successfully saved!`
**After**: `Asset saved` (title only)

Why: object + past verb; no "success", "successfully", or "!"; frequent action → shortest message.

## 5. Delete with undo (success, toast)

```
Type: success
Component: toast.success, ~10 s
Title: Asset deleted
Action: Undo
```

Why: undoable action → no confirm dialog needed; undo in the toast.

## 6. Destructive confirm (confirm, AlertDialog)

**Before**
> **Are you sure?**
> This action cannot be undone.
> [Cancel] [Continue]

**After**
```
Type: confirm
Component: AlertDialog
Title: Delete Toyota Hilux?
Body: Its 24 fuel records will be deleted too. This can't be undone.
Action: Delete (destructive) + Cancel
```

Why: title names the verb and object; body says what is lost; button repeats the verb instead of "Continue".

## 7. Page context (info, Alert callout)

**Before**
> **Heads up!**
> Please note that you can only see approved fuel records in the reports below.

**After**
```
Type: info
Component: Alert (info, role="status"), above the report table
Title: (none)
Body: Reports count only approved fuel records.
```

Why: generic title dropped; "please note", "you can", and "below" cut; one sentence.

## 8. Session about to end (warning, imminent)

**Before**
> **Warning**
> Your session is about to expire and you will lose unsaved changes if you do not do anything.

**After**
```
Type: warning
Component: Alert (warning) or toast.warning, stays until dismissed
Title: Session ending soon
Body: Unsaved changes will be lost when it ends in 5 minutes.
Action: Stay signed in
```

Why: consequence first, then the choice in the button (Consequence → Choice); specific title instead of "Warning".

## 9. Server failure, unknown cause (error, Alert)

**Before**
> **Error 500: Internal Server Error**
> An unexpected exception occurred while fetching data.

**After**
```
Type: error
Component: Alert (destructive), in place of the asset list
Title: Can't load assets
Body: Try again. If it keeps happening, contact ICT.
Action: Retry
```

Why: plain words; most likely fix first, backup second; code goes to logs.

## 10. Form with several errors (error, summary + fields)

**Before**: `There were some errors with your submission. Please review the form.`
**After**: summary title `2 fields need fixing` (no body) + a `Field.Error` under each bad field.

Why: the count tells users how much work is left; the fix lives next to each field.

## 11. Nothing to show (empty state)

**Before**: `No data found.`
**After**
```
Type: info
Component: Empty
Title: No assets yet
Body: Add a vehicle or generator to start recording fuel.
Action: Add asset
```

Why: says what's missing and how to start; one CTA matching the title.

## 12. Background task (neutral, toast)

**Before**: `Please wait... syncing is in progress...`
**After**: `Syncing records` → then `Records synced` or `Records not synced` (via `toast.promise`).

Why: short status; the result is reported separately so the user knows when it's done.

## 13. Blocked by a business rule (error, toast)

**Before**
> **Error**
> You can't delete this.

**After**
```
Type: error
Component: toast.error, stays until dismissed
Title: Role not deleted
Body: It is assigned to 3 users. Remove them from the role first.
Action: View users
```

Why: Problem → Cause → Resolution (title, then the two body sentences); "You can't" dropped, because it sounds like a missing permission when the role's state is the cause.
