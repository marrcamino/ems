- When reporting information to me, be concise and sacrifice grammar for the sake of concision.
- When a reply covers more than one thing — more than one fix, finding, suggestion, or option — number the items. Do not run them together in a paragraph. Prose is fine when there is genuinely only one point. The numbers let me reply to one item at a time and say which one I disagree with.

# EMS Project — Claude Context

Never access, search, or modify files outside the project directory.

Stack: SvelteKit + TypeScript (Svelte 5 runes), Tailwind, shadcn-svelte,
Drizzle ORM + MySQL 8.4, adapter-node. Fully offline on a LAN server —
no CDN assets, no external auth providers, no network calls at runtime.

## Conventions

- Files and Svelte components: `kebab-case`.
- Commits: conventional prefix, lowercase first letter after the prefix.
- Untracked/new files are `feat:`, not `refactor:`.

## Before acting

- Do not use the graphify knowledge graph unless I ask for it by name. A question about this codebase is an ordinary question: answer it by reading the files. This holds even though `graphify-out/` exists in this repo and the graphify skill invites you to use it.
- Schema changes reach the database through `drizzle-kit push`. When a change needs it, ask me — either ask me to run it, or ask whether you should run it yourself. Do not run it unannounced.

## Read only when relevant

- `src/lib/server/db/schema/index.ts` — before writing any query, migration, or table change. Read it fresh; never work from a remembered copy.
- `.claude/docs/project-brief.md` — only for questions about scope, users, deployment, or an item listed as still open.
- `.claude/docs/features/signatory.md` — before touching signatory tables, routes, or approval flow. Contains locked decisions and open questions.
- `.claude/skills/git-feature-flow/SKILL.md` — before any commit, merge, or branch switch. Defines where a change belongs and how feature work reaches main; never improvise the git steps.
