# Graph Report - ems  (2026-08-21)

## Corpus Check
- 267 files · ~79,434 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 577 nodes · 1022 edges · 40 communities (31 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.92)
- Token cost: 0 input · 284,830 output

## Community Hubs (Navigation)
- RBAC & Session Context
- Auth & Database Schema
- Frontend Build Dependencies
- Admin UI Dialogs & Alerts
- shadcn-svelte Skill Docs
- Admin Scripts & Permissions
- Sidebar Component & Utils
- Package Manifest
- Dialog & Sheet Components
- Sidebar State Management
- Breadcrumb & Separator UI
- shadcn-svelte Config
- TypeScript Config
- Claude Skill Logo (.claude)
- shadcn-svelte Logo (.agents)
- shadcn-svelte Small Logo (.agents)
- shadcn-svelte Logo (.claude)
- Agency Logo Asset
- Favicon Asset
- Robots.txt Crawl Policy

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `OrgUnitContext` - 10 edges
3. `scripts` - 9 edges
4. `SKILL.md — shadcn-svelte skill overview (.agents)` - 9 edges
5. `cli.md — CLI reference (.agents)` - 9 edges
6. `SKILL.md — shadcn-svelte skill overview (.claude)` - 9 edges
7. `cli.md — CLI reference (.claude)` - 9 edges
8. `main()` - 8 edges
9. `verifyDbPassword()` - 8 edges
10. `main()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `SKILL.md — shadcn-svelte skill overview (.agents)` --semantically_similar_to--> `SKILL.md — shadcn-svelte skill overview (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/SKILL.md → .claude/skills/shadcn-svelte/SKILL.md
- `openai.yml — agent config (.agents)` --semantically_similar_to--> `openai.yml — agent config (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/agents/openai.yml → .claude/skills/shadcn-svelte/agents/openai.yml
- `cli.md — CLI reference (.agents)` --semantically_similar_to--> `cli.md — CLI reference (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/cli.md → .claude/skills/shadcn-svelte/cli.md
- `customization.md — theming guide (.agents)` --semantically_similar_to--> `customization.md — theming guide (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/customization.md → .claude/skills/shadcn-svelte/customization.md
- `rules/composition.md — composition rules (.agents)` --semantically_similar_to--> `rules/composition.md — composition rules (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/rules/composition.md → .claude/skills/shadcn-svelte/rules/composition.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview, concept_shadcn_svelte [INFERRED 0.85]

## Communities (40 total, 9 thin omitted)

### Community 0 - "RBAC & Session Context"
Cohesion: 0.05
Nodes (36): App, Locals, PageData, can(), canAll(), canAny(), canModule(), createAccess() (+28 more)

### Community 1 - "Auth & Database Schema"
Cohesion: 0.08
Nodes (33): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, hashPassword(), scryptAsync, verifyPassword(), buildLoginRedirect() (+25 more)

### Community 2 - "Frontend Build Dependencies"
Cohesion: 0.04
Nodes (47): clsx, drizzle-kit, @fontsource-variable/geist, @internationalized/date, @lucide/svelte, devDependencies, bits-ui, clsx (+39 more)

### Community 4 - "Admin UI Dialogs & Alerts"
Cohesion: 0.06
Nodes (3): sidebar, isValid, ./$types

### Community 5 - "shadcn-svelte Skill Docs"
Cohesion: 0.08
Nodes (41): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+33 more)

### Community 6 - "Admin Scripts & Permissions"
Cohesion: 0.12
Nodes (26): __dirname, main(), bailIfCancelled(), connectToDatabase(), verifyDbPassword(), VerifyMessages, loadEnv(), requireEnv() (+18 more)

### Community 7 - "Sidebar Component & Utils"
Cohesion: 0.10
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 8 - "Package Manifest"
Cohesion: 0.08
Nodes (23): @clack/prompts, drizzle-orm, mysql2, dependencies, @clack/prompts, drizzle-orm, mode-watcher, mysql2 (+15 more)

### Community 11 - "Sidebar State Management"
Cohesion: 0.11
Nodes (11): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarState (+3 more)

### Community 13 - "shadcn-svelte Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.12
Nodes (15): node, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution (+7 more)

## Knowledge Gaps
- **125 isolated node(s):** `$schema`, `css`, `baseColor`, `components`, `utils` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Frontend Build Dependencies` to `Package Manifest`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `css`, `baseColor` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `RBAC & Session Context` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._
- **Should `Auth & Database Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.07966457023060797 - nodes in this community are weakly interconnected._
- **Should `Frontend Build Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `App Sidebar Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.048484848484848485 - nodes in this community are weakly interconnected._
- **Should `Admin UI Dialogs & Alerts` be split into smaller, more focused modules?**
  _Cohesion score 0.0627177700348432 - nodes in this community are weakly interconnected._