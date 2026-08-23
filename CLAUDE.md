# EMS Project — Claude Context

Never access, search, or modify files outside the project directory.

Stack: SvelteKit + TypeScript (Svelte 5 runes), Tailwind, shadcn-svelte,
Drizzle ORM + MySQL 8.4, adapter-node. Fully offline on a LAN server —
no CDN assets, no external auth providers, no network calls at runtime.

## Conventions

- Files and Svelte components: `kebab-case`.
- Commits: conventional prefix, lowercase first letter after the prefix.
- Untracked/new files are `feat:`, not `refactor:`.

## Read only when relevant

- `src/lib/server/db/schema/index.ts` — before writing any query, migration,
  or table change. Read it fresh; never work from a remembered copy.
- `.claude/docs/project-brief.md` — only for questions about scope, users,
  deployment, or an item listed as still open.
