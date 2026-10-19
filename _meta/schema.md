# Rules, conventions and the card format

Read this before writing or changing code, together with the module's card.

## Code conventions

1. Files and Svelte components are `kebab-case`.
2. Database names follow `.claude/rules/db-naming.md`.
3. The app runs fully offline on a LAN server: no CDN assets, no external auth
   providers, no network calls at runtime.
4. Before writing any query, migration or table change, read
   `src/lib/server/db/schema/index.ts` fresh. Never work from a remembered copy.
5. Permission and role work follows `.claude/skills/rbac-design/SKILL.md`. After
   any change to `PERMISSION_DEFS`, run `npm run sync-permissions`, because the
   keys are rows in the database and a new key does nothing until it is written.
6. Lists with an active/inactive flag follow `.claude/skills/active-inactive-lists/`.
   On-screen messages follow `.claude/skills/ui-messages/`.

## Database changes

1. Schema changes reach the database through `drizzle-kit push`, and only after
   asking the owner (see CLAUDE.md, Rules).
2. `drizzle-kit push` empties a table before it adds a `NOT NULL` rule to a column.
   Changes to existing tables are therefore applied as plain `ALTER TABLE` SQL. The
   full story is Topic 9 in `.claude/docs/features/employee-and-user-separation.md`.

## Git

1. Before any commit, merge or branch switch, read
   `.claude/skills/git-feature-flow/SKILL.md`. Never improvise the git steps.
2. Commit messages follow `.claude/skills/commit-message/SKILL.md`: a conventional
   prefix, a lowercase first letter after it, and new (untracked) files are `feat:`,
   not `refactor:`.
3. After switching branches, restart `npm run dev`. The dev server reloads only some
   of the rewritten files, and a component can end up with two copies of the same
   context file (seen on 15 October 2026 as a Stepper error that a refresh did not fix).

## Graphify

1. Use it for "how does X connect", "what uses X" and "what breaks if X changes",
   before a broad grep:
   - `graphify query "<question>"`: broad context around a question.
   - `graphify path "A" "B"`: how two things are linked.
   - `graphify explain "X"`: one node and its neighbours.
   - `graphify affected "X"`: what is impacted if X changes.
   - `graphify-out/GRAPH_REPORT.md`: the hubs and clusters.
2. Git hooks rebuild the code part of the graph in the background after every
   commit and every branch switch (log: `~/.cache/graphify-rebuild.log`). A merge
   triggers neither, so after `git merge` run `graphify update .`; it re-reads code
   only and needs no LLM. Changed docs need `/graphify . --update`, which does use
   tokens. If in doubt, compare the date at the top of `GRAPH_REPORT.md` with
   `git log -1`.
3. Edges tagged `INFERRED` or `AMBIGUOUS` are guesses. Verify them in the code before
   relying on them. `EXTRACTED` edges were found in the source.
4. After a semantic extraction (`/graphify . --update`), make sure every node and edge
   that came from a `.md` file carries `"_origin": "semantic"`. Graphify treats a doc
   node with a line-number `source_location` as code, and the hook's code-only rebuild
   then deletes it (91 doc nodes were lost this way on 19 October 2026).
5. `.graphifyignore` keeps the skills, `cards/`, `_meta/` and `tmp/` out of the graph.
   The graph is for code and the feature documents.

## Cards

1. One card per module in `cards/`, made from `_meta/templates/card.md`. A card stays
   under about 25 lines. It points to code and documents; it does not copy them.
2. Status words: `active` (being worked on now), `paused` (left for later),
   `blocked` (waiting for something outside this module), `done`, `not-started`,
   `unknown` (could not be told from the code, git or notes; ask the owner).
3. Never invent a status. If it cannot be told, write `unknown` and ask.

## Habits

1. New module: copy the card template. Add nothing to CLAUDE.md; it already points
   to `cards/`.
2. End of a session, a merged feature branch, or a closed open item: update the
   card's `status`, `next`, `updated` and its Open list, without being asked, and
   say which cards changed.
3. New decision: put it in the feature document's topic, or in a short new file in
   `.claude/docs/decisions/`, and link it from the card.
4. One home per fact. If a fact already lives somewhere, link to it.
5. Tempted to add a paragraph to CLAUDE.md? Put it in a file instead, and add at
   most one pointer line.
6. Retired or replaced content goes to `tmp/archive/`, never deleted.
