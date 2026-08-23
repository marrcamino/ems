# Graph Report - ems  (2026-08-21)

## Corpus Check
- 27 files · ~87,126 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 696 nodes · 1198 edges · 70 communities (41 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth, Session & DB Schema
- RBAC Permissions & Role Templates
- Package Config & CLAUDE.md Refs
- Types & Org Structure Context
- shadcn-svelte Skill Docs
- TypeScript Configs
- Error State UI
- Table & Empty State UI
- Dialog & Sheet UI
- Sidebar Context & Mobile Hook
- CLI Scripts Lib (db, password, env)
- components.json Config
- Field UI Components
- Svelte Ecosystem Deps
- Project README & Compliance Refs
- CLAUDE.md RBAC Design Notes
- Role Actions & Password Change UI
- Roles Table Columns
- Admin Layout & Delete Dialogs
- Roles Context State
- CLAUDE.md Routing Guard Notes
- CLAUDE.md Auth Notes
- CLAUDE.md DB Env Notes
- CLAUDE.md Type Inference Notes
- shadcn-svelte Logo Asset
- clsx Dependency
- drizzle-kit Dependency
- Fontsource Geist Dependency
- internationalized-date Dependency
- bits-ui Dependency
- svelte-sonner Dependency
- adapter-node Dependency
- vite-plugin-svelte Dependency
- tailwind-merge Dependency
- tailwindcss-forms Dependency
- tailwindcss-typography Dependency
- tailwindcss-vite Dependency
- tw-animate-css Dependency
- types/node Dependency
- vite Dependency
- shadcn-svelte Logo Asset (.agents)
- shadcn-svelte Small Logo (.agents)
- shadcn-svelte Logo Asset (.claude)
- Agency Logo Asset
- Favicon Asset
- robots.txt Policy

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `OrgUnitContext` - 10 edges
3. `scripts` - 10 edges
4. `compilerOptions` - 10 edges
5. `cli.md — CLI reference (.agents)` - 9 edges
6. `SKILL.md — shadcn-svelte skill overview (.agents)` - 9 edges
7. `cli.md — CLI reference (.claude)` - 9 edges
8. `SKILL.md — shadcn-svelte skill overview (.claude)` - 9 edges
9. `main()` - 8 edges
10. `can()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `EMS Project README` --references--> `typescript`  [EXTRACTED]
  README.md → package.json
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
- **Admin provisioning CLI script pattern** — claude_create_admin_ts, claude_role_templates, claude_scripts_lib, clack_prompts [EXTRACTED 1.00]
- **RBAC permission enforcement flow** — claude_permissionkey_type, claude_access_ts, claude_locals_permissions, claude_validatesessiontoken [EXTRACTED 1.00]
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Client-nav routing guard flow** — claude_layout_server_ts, claude_hooks_server_ts, claude_role_routing_exempt, claude_event_route_id_check [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview [INFERRED 0.85]

## Communities (70 total, 29 thin omitted)

### Community 0 - "Auth, Session & DB Schema"
Cohesion: 0.07
Nodes (36): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, hashPassword(), scryptAsync, verifyPassword(), buildLoginRedirect() (+28 more)

### Community 1 - "RBAC Permissions & Role Templates"
Cohesion: 0.06
Nodes (35): __dirname, __dirname, main(), can(), canAll(), canAny(), canModule(), createAccess() (+27 more)

### Community 2 - "Package Config & CLAUDE.md Refs"
Cohesion: 0.04
Nodes (44): @clack/prompts, adapter-node, AnyMySqlColumn (circular FK imports), conventions.md, create-admin.ts, drizzle-kit (push/generate), makeContext utility, Org Hierarchy (Office → Division → Section → Unit) (+36 more)

### Community 3 - "Types & Org Structure Context"
Cohesion: 0.07
Nodes (22): App, Error, Locals, PageData, NewOrgUnit, NewPermission, NewRole, NewRolePermission (+14 more)

### Community 4 - "shadcn-svelte Skill Docs"
Cohesion: 0.12
Nodes (32): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+24 more)

### Community 5 - "TypeScript Configs"
Cohesion: 0.07
Nodes (27): node, ./.svelte-kit/tsconfig.json, **/*.ts, compilerOptions, esModuleInterop, module, moduleResolution, noEmit (+19 more)

### Community 6 - "Error State UI"
Cohesion: 0.08
Nodes (10): body, hasDetails, heading, Icon, isServerError, open, preset, presets (+2 more)

### Community 8 - "Table & Empty State UI"
Cohesion: 0.12
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 10 - "Sidebar Context & Mobile Hook"
Cohesion: 0.10
Nodes (11): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarState (+3 more)

### Community 11 - "CLI Scripts Lib (db, password, env)"
Cohesion: 0.21
Nodes (14): bailIfCancelled(), connectToDatabase(), verifyDbPassword(), VerifyMessages, loadEnv(), requireEnv(), generatePassword(), hashPassword() (+6 more)

### Community 14 - "components.json Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 21 - "Svelte Ecosystem Deps"
Cohesion: 0.18
Nodes (11): @lucide/svelte, devDependencies, @lucide/svelte, svelte, svelte-check, @sveltejs/kit, tailwind-variants, svelte (+3 more)

### Community 22 - "Project README & Compliance Refs"
Cohesion: 0.22
Nodes (10): DENR-PENRO Dinagat Islands, ISO 14001:2015, RA 9003 (Ecological Solid Waste Management Act), shadcn-svelte, tailwindcss, typescript, EMS Project README, shadcn-svelte (+2 more)

### Community 23 - "CLAUDE.md RBAC Design Notes"
Cohesion: 0.25
Nodes (9): src/lib/rbac/access.ts (can, canAll, canAny, canModule, createAccess), Dev Preferences (iterative, debug-driven), locals.permissions (Set<string>), Pattern A: tiered/OR permissions, Pattern B: AND-gate permissions, PermissionKey type, src/lib/server/permissions.ts, RBAC_design___locked_decisions.md (+1 more)

### Community 25 - "Roles Table Columns"
Cohesion: 0.25
Nodes (7): Role, makeContext(), columns, features, helper, RoleRow, { set: setRolesContext, get: getRolesContext }

### Community 33 - "CLAUDE.md Routing Guard Notes"
Cohesion: 0.50
Nodes (4): event.route.id !== null check, hooks.server.ts guard, +layout.server.ts (void url.pathname), ROLE_ROUTING_EXEMPT

### Community 35 - "CLAUDE.md Auth Notes"
Cohesion: 0.67
Nodes (3): must_change_password flag, node:crypto (createHash, randomBytes, scryptAsync), Session-based auth

## Ambiguous Edges - Review These
- `Dev Preferences (iterative, debug-driven)` → `Pattern A: tiered/OR permissions`  [AMBIGUOUS]
  CLAUDE.md · relation: rationale_for
- `ROLE_TEMPLATES` → `Svelte 5 runes ($state, $derived)`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **173 isolated node(s):** `WithElementRef`, `WithoutChild`, `WithoutChildren`, `VerifyMessages`, `SuperAdmin` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Dev Preferences (iterative, debug-driven)` and `Pattern A: tiered/OR permissions`?**
  _Edge tagged AMBIGUOUS (relation: rationale_for) - confidence is low._
- **What is the exact relationship between `ROLE_TEMPLATES` and `Svelte 5 runes ($state, $derived)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `devDependencies` connect `Svelte Ecosystem Deps` to `Package Config & CLAUDE.md Refs`, `clsx Dependency`, `drizzle-kit Dependency`, `Fontsource Geist Dependency`, `internationalized-date Dependency`, `bits-ui Dependency`, `svelte-sonner Dependency`, `adapter-node Dependency`, `vite-plugin-svelte Dependency`, `tailwind-merge Dependency`, `tailwindcss-forms Dependency`, `tailwindcss-typography Dependency`, `tailwindcss-vite Dependency`, `tw-animate-css Dependency`, `types/node Dependency`, `vite Dependency`, `Project README & Compliance Refs`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **What connects `WithElementRef`, `WithoutChild`, `WithoutChildren` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth, Session & DB Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.06662770309760374 - nodes in this community are weakly interconnected._
- **Should `RBAC Permissions & Role Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.061683599419448475 - nodes in this community are weakly interconnected._
- **Should `Package Config & CLAUDE.md Refs` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._