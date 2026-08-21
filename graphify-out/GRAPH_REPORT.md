# Graph Report - ems  (2026-08-21)

## Corpus Check
- 7 files · ~82,507 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 596 nodes · 1045 edges · 61 communities (35 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth Guards & Session
- RBAC & App Types
- shadcn-svelte Skill Docs
- Avatar & Breadcrumb Primitives
- Error State & App Runtime
- Runtime Dependencies
- Admin CLI Scripts
- Dialog Primitives
- Sidebar Context & Constants
- Breadcrumb Header Chrome
- shadcn Component Config
- TypeScript Config
- Org Unit Types & Badges
- Dev Dependencies
- EMS Project Overview
- Org Unit Context Store
- Admin Shell & Password Form
- shadcn Skill Assets
- drizzle-kit Dependency
- Geist Font Dependency
- Internationalized Date Dep
- Lucide Svelte Dependency
- svelte-check Dependency
- svelte-sonner Dependency
- Node Adapter Dependency
- SvelteKit Dependency
- Vite Svelte Plugin Dep
- tailwind-variants Dependency
- Tailwind Forms Plugin
- Tailwind Typography Plugin
- Tailwind Vite Plugin
- tw-animate-css Dependency
- Node Types Dependency
- Vite Dependency
- shadcn Logo Asset
- shadcn Small Logo Asset
- shadcn Logo (Claude Skill)
- DENR Agency Logo
- DENR Favicon
- Robots Policy

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `OrgUnitContext` - 10 edges
3. `scripts` - 9 edges
4. `cli.md — CLI reference (.agents)` - 9 edges
5. `SKILL.md — shadcn-svelte skill overview (.agents)` - 9 edges
6. `cli.md — CLI reference (.claude)` - 9 edges
7. `SKILL.md — shadcn-svelte skill overview (.claude)` - 9 edges
8. `main()` - 8 edges
9. `verifyDbPassword()` - 8 edges
10. `main()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `EMS Project README` --references--> `shadcn-svelte`  [EXTRACTED]
  README.md → package.json
- `EMS Project README` --references--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `EMS Project README` --references--> `typescript`  [EXTRACTED]
  README.md → package.json
- `openai.yml — agent config (.agents)` --semantically_similar_to--> `openai.yml — agent config (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/agents/openai.yml → .claude/skills/shadcn-svelte/agents/openai.yml
- `cli.md — CLI reference (.agents)` --semantically_similar_to--> `cli.md — CLI reference (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/cli.md → .claude/skills/shadcn-svelte/cli.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview [INFERRED 0.85]

## Communities (61 total, 26 thin omitted)

### Community 0 - "Auth Guards & Session"
Cohesion: 0.07
Nodes (36): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, hashPassword(), scryptAsync, verifyPassword(), buildLoginRedirect() (+28 more)

### Community 1 - "RBAC & App Types"
Cohesion: 0.06
Nodes (35): App, Error, Locals, PageData, can(), canAll(), canAny(), canModule() (+27 more)

### Community 3 - "shadcn-svelte Skill Docs"
Cohesion: 0.11
Nodes (33): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+25 more)

### Community 4 - "Avatar & Breadcrumb Primitives"
Cohesion: 0.10
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 5 - "Error State & App Runtime"
Cohesion: 0.07
Nodes (10): body, hasDetails, heading, Icon, isServerError, open, preset, presets (+2 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (23): @clack/prompts, drizzle-orm, mysql2, dependencies, @clack/prompts, drizzle-orm, mode-watcher, mysql2 (+15 more)

### Community 8 - "Admin CLI Scripts"
Cohesion: 0.22
Nodes (16): __dirname, main(), bailIfCancelled(), connectToDatabase(), verifyDbPassword(), VerifyMessages, loadEnv(), requireEnv() (+8 more)

### Community 10 - "Sidebar Context & Constants"
Cohesion: 0.11
Nodes (11): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarState (+3 more)

### Community 13 - "shadcn Component Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.12
Nodes (15): node, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution (+7 more)

### Community 15 - "Org Unit Types & Badges"
Cohesion: 0.17
Nodes (7): User, makeContext(), AssignedUser, LEVEL_ORDER, NonOfficeOrgUnit, { set: setOrgUnitContext, get: getOrgUnitContext }, TreeNode

### Community 18 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): clsx, devDependencies, bits-ui, clsx, shadcn-svelte, svelte, tailwind-merge, bits-ui (+2 more)

### Community 19 - "EMS Project Overview"
Cohesion: 0.20
Nodes (10): DENR-PENRO Dinagat Islands, ISO 14001:2015, RA 9003 (Ecological Solid Waste Management Act), SvelteKit, tailwindcss, typescript, EMS Project README, app.html — SvelteKit app shell (+2 more)

### Community 22 - "Admin Shell & Password Form"
Cohesion: 0.25
Nodes (3): sidebar, isValid, ./$types

## Knowledge Gaps
- **133 isolated node(s):** `NewOrgUnit`, `NewPermission`, `NewRole`, `NewRolePermission`, `NewSession` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Internationalized Date Dep`, `Lucide Svelte Dependency`, `svelte-check Dependency`, `svelte-sonner Dependency`, `Node Adapter Dependency`, `SvelteKit Dependency`, `Vite Svelte Plugin Dep`, `Runtime Dependencies`, `tailwind-variants Dependency`, `Tailwind Forms Plugin`, `Tailwind Typography Plugin`, `Tailwind Vite Plugin`, `tw-animate-css Dependency`, `Node Types Dependency`, `Vite Dependency`, `EMS Project Overview`, `drizzle-kit Dependency`, `Geist Font Dependency`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `shadcn-svelte` connect `shadcn-svelte Skill Docs` to `Dev Dependencies`, `EMS Project Overview`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `OrgUnitContext` connect `Org Unit Context Store` to `Org Unit Types & Badges`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `NewOrgUnit`, `NewPermission`, `NewRole` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Guards & Session` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `RBAC & App Types` be split into smaller, more focused modules?**
  _Cohesion score 0.06207482993197279 - nodes in this community are weakly interconnected._
- **Should `Icons & Menu Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.06116642958748222 - nodes in this community are weakly interconnected._