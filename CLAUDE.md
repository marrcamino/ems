# EMS — Environmental Management System for DENR-PENRO Dinagat Islands

SvelteKit + TypeScript (Svelte 5 runes), Tailwind, shadcn-svelte, Drizzle ORM + MySQL 8.4, adapter-node; fully offline on a LAN server.
Run `npm run dev`. Check `npm run check`. Test `npm run test:e2e` (Playwright, `e2e/`).

## Where everything lives
| Area | Home |
|---|---|
| Module status | `cards/`: one card per module |
| Tasks to do and done | Linear, team `MPP`, project `EMS` |
| Rules, conventions, card format | `_meta/schema.md` |
| Code connections / dependencies | `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`) |
| Decisions & history | `.claude/docs/features/` (one per feature), `.claude/docs/decisions/` |
| Scope, users, deployment | `.claude/docs/project-brief.md` |
| Locked how-tos (RBAC, git, UI messages…) | `.claude/skills/` |
| Source | `src/` (DB schema in `src/lib/server/db/schema/`), `scripts/` |
| Retired content and backups | `tmp/archive/` |

## Routing
| Task | Go to |
|---|---|
| Status / next step of a module | `cards/<module>.md` first. Open more only if the card isn't enough. |
| How X connects, what uses X, what breaks if X changes | Graphify first (`graphify query "..."`, `graphify path "A" "B"`, `graphify explain "X"`, `graphify affected "X"`, or `GRAPH_REPORT.md`), **before** broad grep/search |
| Writing or changing code | `_meta/schema.md` + the module's card |
| Any query, migration or table change | read `src/lib/server/db/schema/index.ts` fresh first |
| Commit, merge or branch switch | `.claude/skills/git-feature-flow/SKILL.md` first |
| Recording a decision | the feature doc's topic, or a new file in `.claude/docs/decisions/`; link it from the card |
| End of a work session | update the card's `status`, `next`, `updated` |

## Rules
- Never access, search, or modify files outside the project directory.
- Never run `drizzle-kit push` unannounced: ask me to run it, or ask whether you should.
- When a reply covers more than one thing, number the items, so I can reply to one at a time.
- A scenario or example about how the office works uses only facts written in the feature doc. If the fact isn't there, ask me; don't assume.
- Keep this file short. New info goes in a card or `_meta/`, plus at most one line here.
- One home per fact: link, don't copy.
