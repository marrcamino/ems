---
name: code-comments
description: Decide whether a piece of code needs a comment and write it, lean by default or as a complete teaching comment when the user asks for one, and review the comments already in a file (keep, cut, or wrong). Use this skill whenever writing or changing code in the EMS repo, because every new function, component, effect, CSS trick, or workaround raises the question, and whenever the user says "comment this", "explain this in the code", "write a complete comment", "add a full comment", "is this comment needed?", "too many comments", "clean up the comments", or points at the comments in a file, even if they never mention a skill.
---

# Code comments

Goal: every comment tells the next reader something that the code cannot. The
next reader is a developer who knows TypeScript, Svelte 5, and Tailwind and is
opening the file for the first time. It is not me right after writing the
code, when everything still feels worth explaining.

My habit is to over-comment: I narrate what each variable holds and what each
effect does, and I repeat one idea in two or three places. The user pointed
this out on 31 October 2026 in `src/lib/components/radio-tabs.svelte`, where
about half the comments only repeated the code. That is why lean is the
default.

## Modes

| Mode | When | What I produce |
|---|---|---|
| **Lean** (default) | Any code I write or change, unless told otherwise | Comments only where Step 1 says yes, one or two lines each |
| **Complete** | The user asks for a "complete", "full", or "explaining" comment, or says that a part is confusing or too technical | One teaching comment for that part, in the code (Step 4) |
| **Review** | The user asks to check, judge, or clean up the comments in a file | A numbered list of keep, cut, and wrong (Step 5); I edit only after they agree |

The user names a mode in plain words: "lean comments on this", "write a
complete comment for `measure()`", "review the comments in radio-tabs". If they
only want to understand some code and do not ask for it in the file, explain
it in chat, leading with a usage example, and leave the file alone.

## Step 1: Does it need a comment?

Ask: *would a first-time reader be confused here, or be tempted to "fix"
this?* If neither, write nothing.

**Comment these:**

| Kind | Example from this repo |
|---|---|
| **Why**: a choice where an obvious alternative exists | "The line under the tabs is a background, not a border, so the scrolling box does not clip the underline that sits on it." |
| **Looks wrong but is not**: code that someone would simplify away | Above the `@property` blocks: "Registered so they animate; unregistered custom properties jump." |
| **Hidden rule**: an order, a value that must match another place, a unit, or whether a range includes its end | "A label with no number after it yet is skipped, so the list does not go empty while the number is still being typed." |
| **Workaround**: a browser or library bug | Name the bug, link it, and say when the workaround can go. |
| **Office rule**: business logic that came from the user | State the rule in one sentence and point to where it is recorded (the feature doc point or the MPP issue). |
| **Interface**: an exported function, type, or prop whose name does not say it all, and every shared component | One line on what the caller gets. A shared component also gets a usage example. |
| **Unfinished**: a known gap | `TODO(MPP-60): what is missing and what it waits on` |

**Do not comment these:**

| Kind | Example (cut from radio-tabs.svelte) | Instead |
|---|---|---|
| The name already says it | `/** Which way it last moved */` on `direction` | Nothing |
| The next lines already show it | `// Again when a tab is picked` above an effect that reads `value` and `tabs` | Nothing |
| Another comment already says it | "The leading end moves first", written in three places | Keep it once, where it happens |
| The type already says it | `@param search {string}` | Nothing |
| A standard idiom | `$bindable()`, `$props.id()`, `sr-only` | Nothing |
| History | "Changed from a border", "used to be a Tabs component" | The commit message or the feature doc |
| Old code | Commented-out lines | Git |
| A bad name | `// litres` next to `n` | Rename it to `litres` |

If a clear comment is hard to write, the code is usually the problem. Simplify
the code first, then check whether a comment is still needed. If nearly every
declaration in a file has a comment, that is narration, so check each one
against this step again.

## Step 2: Where it goes and which syntax

| What | Syntax | Why |
|---|---|---|
| A shared component in `src/lib/components/` | `<!-- @component ... -->` at the top of the markup, with a short usage example | The editor shows it on hover only when `@component` is there (Svelte FAQ). |
| An exported function, type, interface field, or prop | `/** ... */` directly above it, on one line when it fits | Editors show it on hover and at every call site. |
| A rule for the whole file (what the module does and does not do) | A `/** ... */` block at the top of the file | See `src/routes/(app)/fuel/withdrawal-search.ts`. |
| A note on how the script works | `//` above the line it explains; several `//` lines for a longer note | Plain comments are for the people who change the code, not the people who call it. |
| A note on markup | `<!-- ... -->` above the element | |
| A note in CSS | `/* ... */` above the rule | |

Put the comment above the code that it explains, not at the end of a long
line. When two places depend on the same fact, explain it once and have the
other place say only "keep in step with X".

### Sample code inside a comment

Wrap every code sample in a fenced block with its language: `svelte` for
markup, `ts` for script. Editors render JSDoc and `@component` text as
Markdown, so an unfenced sample shows up as prose with its braces and tags
mangled. Indenting does not rescue it either: behind the ` * ` there are rarely
the four spaces that Markdown needs for an indented code block.

- Start the code at the same column as the fence, not deeper, or the hover
  shows it shifted to the right.
- Inside `/** ... */`, keep the ` * ` in front of every line, the fences too.
- When a sample mixes markup and script, give each its own block.
- A name or value inside a sentence takes single backticks: `value`, `null`.

````svelte
<!--
  @component
  Radio buttons that look like tabs.

  ```svelte
  <RadioTabs legend="Status" tabs={statusTabs} bind:value={statusTab} />
  ```
-->
````

````ts
/**
 * A date the user can type or pick.
 *
 * ```svelte
 * <DateInput bind:this={slipField} bind:value={slipDate} />
 * ```
 *
 * ```ts
 * slipField.clear();
 * ```
 */
````

## Step 3: How to write it

1. Write plain English in full sentences, and keep "that", "which", and
   "where" in. Use the office's words from the feature doc, not invented
   labels.
2. Give the reason with "so" or "because": "Off until the first frame, so the
   underline does not slide in on load."
3. Be exact where the code is vague: units (litres, pesos, px), whether an end
   is included, and what `null` means.
4. Name the trap, not the story of how it was found.
5. Keep lean comments to one line, or two or three at most, wrapped at about 80
   characters like the code around them.
6. In a function's JSDoc, say what the caller gets: "The rows that match every
   word of `search`." Leave out `@param` and `@returns` unless they add a rule,
   such as "Must not be negative."
7. Match the file. If its JSDoc already uses noun phrases, keep using them.
8. When the code changes, change or delete its comment in the same edit. A
   wrong comment is worse than none, because readers trust it.

Conventions already in use in this repo:

- A TODO names its Linear issue: `TODO(MPP-60): ...`.
- An office rule points to where it is recorded:
  `(point 9 of "Recording a fuel issuance" in fuel-purchase-orders.md)`. When
  no doc holds it yet, `(decided by the user, 28 October 2026)` is the
  fallback.

## Step 4: Complete mode

Write for the user, who is learning and wants to understand the part without
tracing it through several functions. Here a comment may say *what* the code
does, because it saves the reader from rebuilding the picture. It still never
narrates line by line.

Put it in one place: above the function, or at the top of the component. Use
this order, and drop any part that has nothing to say:

1. **What it does**: one plain sentence, at a higher level than the code.
2. **How it works**: numbered steps, if there are steps.
3. **Why this way**: the obvious alternative, and why it was not used.
4. **Example**: a concrete input and its result, or what the user sees.
5. **Watch out**: what breaks if someone changes it, and what must change with
   it.

Example for the underline in `src/lib/components/radio-tabs.svelte`:

```svelte
<!--
  How the underline moves

  The underline is one line as wide as the whole row. A clip-path hides all
  of it except the part between --tab-start and --tab-end, which measure()
  sets to the picked tab's left and right edges.

  1. Picking a tab runs measure(), which reads that tab's edges.
  2. The browser animates the two edges separately.
  3. The edge on the side it moves toward takes 180ms; the other takes 280ms.

  Why not slide one bar with transform: a single bar keeps its width, so it
  cannot stretch on the way.

  Example: going from "All" to "Out", the right edge reaches "Out" first, so
  for a moment the line covers both tabs. Then the left edge catches up, and
  the line shrinks to fit "Out".

  Watch out: the two durations follow the order of transition-property
  (--tab-start, then --tab-end). Swap one list without the other, and the
  trailing edge leads.
-->
```

When a complete comment covers code that already has lean comments, delete
the lean ones that it now repeats, so each idea lives in one place.

## Step 5: Review mode

1. Read the whole file, and also the files that a comment refers to.
2. Judge every comment with Step 1, and check that it is still true.
3. Answer the user's question first, in one sentence: "Not all of them. About
   half repeat what the code already says."
4. Give one numbered list in three groups. Each item gets a line link and a
   one-sentence reason:
   - **Keep**: say so if it should be shorter.
   - **Cut**: say what already tells the reader the same thing.
   - **Wrong**: say what the code really does.
5. Mention a missing comment too, if Step 1 says one is needed.
6. Ask before editing.

## Before finishing any code

- Each comment passes Step 1 for a first-time reader.
- No comment repeats a name, the lines below it, or another comment.
- Each shared component has `<!-- @component -->` with a usage example.
- Each code sample in a comment is fenced, with its language.
- Each comment is still true after the last change.

## Sources

These rules distil the following sources, and they agree on the core: comment
what the code cannot say, and never restate it.

- John Ousterhout, *A Philosophy of Software Design*, chapter 13: comments
  describe what is not obvious, judged by a first-time reader; interface
  comments differ from implementation comments.
- [Stack Overflow blog, "Best practices for writing code comments"](https://stackoverflow.blog/2021/12/23/best-practices-for-writing-code-comments/):
  do not duplicate the code, rename instead of explaining, explain unidiomatic
  code, link sources, comment bug fixes, and mark unfinished work.
- [antirez, "Writing system software: code comments"](https://www.antirez.com/news/124):
  why, teacher, checklist, and guide comments are good; trivial and backup
  comments are bad.
- [Hillel Wayne, on *what* comments](https://hillelwayne.com/post/what-comments/):
  a *what* comment is right when it saves the reader from jumping elsewhere
  (the basis for complete mode).
- [Google TypeScript Style Guide, comments](https://google.github.io/styleguide/tsguide.html#comments-documentation):
  JSDoc for callers and `//` for implementers; no types in JSDoc; comments must
  add information.
- [Svelte FAQ, documenting components](https://svelte.dev/docs/svelte/faq):
  `@component` is needed for the hover text.
