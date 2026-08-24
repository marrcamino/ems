# Graph Report - ems  (2026-08-24)

## Corpus Check
- 31 files · ~108,232 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 899 nodes · 1676 edges · 91 communities (62 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth, Session and Route Guards
- Dialog and Table Primitives
- Badge, Tooltip and Role Cells
- Sidebar Shell
- shadcn-svelte Skill Docs
- TypeScript Configuration
- Empty State and Field Primitives
- Runtime Dependencies
- Permission Tree and Picker
- Role Templates and Admin Bootstrap
- Component Registry Config
- Admin Command-Line Scripts
- Roles Page Context
- Users Page Context
- Error State Component
- Access Checks and Staff Loaders
- Permission Definitions and Sync
- Sheet Primitives
- Roles Filter State
- Project Rules and Conventions
- Roles Table Columns
- Commit Message Rules
- Super-Admin Safeguards
- Database Row Types
- Org Unit Context
- Build and Tooling Dependencies
- Roles Page Server Actions
- Permission Sync Rules
- Sidebar State and Mobile Hook
- Org Structure Tree Building
- Agency Project Overview
- Staff Sidebar and Active Path
- RBAC Role Model Decisions
- App Error and Route Progress
- App Type Declarations
- Session Data Loaders
- Permission Key Shape Rules
- Permission Expansion Rules
- Global Permission Context
- shadcn-svelte Logo Asset
- clsx Dependency
- drizzle-kit Dependency
- Geist Font Dependency
- Internationalized Date Dependency
- bits-ui Dependency
- Svelte Dependency
- svelte-check Dependency
- svelte-sonner Dependency
- Vite Svelte Plugin Dependency
- tailwind-merge Dependency
- tailwind-variants Dependency
- Tailwind Typography Dependency
- Tailwind Vite Plugin Dependency
- tw-animate-css Dependency
- Node Types Dependency
- Vite Dependency
- shadcn-svelte Logo Asset
- shadcn-svelte Small Logo Asset
- shadcn-svelte Logo Asset
- SvelteKit App Shell
- DENR Agency Logo
- DENR Seal Favicon
- Robots Crawl Policy

## God Nodes (most connected - your core abstractions)
1. `UsersContext` - 15 edges
2. `can()` - 12 edges
3. `compilerOptions` - 12 edges
4. `PermissionKey` - 11 edges
5. `RolesContext` - 11 edges
6. `OrgUnitContext` - 10 edges
7. `roleKindOf()` - 10 edges
8. `compilerOptions` - 10 edges
9. `scripts` - 10 edges
10. `RoleKind` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Mandatory View Action Per Module` --references--> `PermissionKey`  [EXTRACTED]
  .claude/skills/rbac-design/SKILL.md → src/lib/server/permissions.ts
- `Admin Role Kind` --references--> `RoleKind`  [EXTRACTED]
  .claude/skills/rbac-design/SKILL.md → src/lib/rbac/permission-tree.ts
- `Staff Role Kind` --references--> `RoleKind`  [EXTRACTED]
  .claude/skills/rbac-design/SKILL.md → src/lib/rbac/permission-tree.ts
- `Expand Permissions Walks the Whole Chain` --references--> `expandPermissions()`  [EXTRACTED]
  .claude/skills/rbac-design/SKILL.md → src/lib/server/permissions.ts
- `Keys Built Forward, Never Split Apart` --rationale_for--> `buildPermissions()`  [INFERRED]
  .claude/skills/rbac-design/SKILL.md → src/lib/server/permissions.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Commit Staging Scope Selection** — _claude_skills_commit_message_skill_staging_scope, _claude_skills_commit_message_skill_commit_staged_files, _claude_skills_commit_message_skill_commit_primary_changes, _claude_skills_commit_message_skill_commit_this [EXTRACTED 1.00]
- **Permission Key Derivation Chain** — _claude_skills_rbac_design_skill_permission_key_shape, _claude_skills_rbac_design_skill_keys_built_forward, _claude_skills_rbac_design_skill_one_submodule_level, _claude_skills_rbac_design_skill_mandatory_view_action, src_lib_server_permissions_permission_defs, src_lib_server_permissions_buildpermissions [EXTRACTED 1.00]
- **Super-Admin Bootstrap and Sync Path** — _claude_skills_rbac_design_skill_bootstrap_create_admin, _claude_skills_rbac_design_skill_permission_sync, _claude_skills_rbac_design_skill_super_admin_backfill, _claude_skills_rbac_design_skill_super_admin_template, scripts_create_admin_main, scripts_sync_permissions_main [EXTRACTED 1.00]
- **Super-Admin Protection Rules** — _claude_skills_rbac_design_skill_frozen_super_admin, _claude_skills_rbac_design_skill_one_holder_only, _claude_skills_rbac_design_skill_never_zero_holders, _claude_skills_rbac_design_skill_no_self_role_change, _claude_skills_rbac_design_skill_only_super_admin_assigns, _claude_skills_rbac_design_skill_no_is_protected_column [EXTRACTED 1.00]
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview [INFERRED 0.85]

## Communities (91 total, 29 thin omitted)

### Community 0 - "Auth, Session and Route Guards"
Cohesion: 0.05
Nodes (45): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, generateTemporaryPassword(), hashPassword(), pick(), scryptAsync (+37 more)

### Community 1 - "Dialog and Table Primitives"
Cohesion: 0.06
Nodes (22): children(), columnFilters, facets, matched, table, adminRoles, canSubmit, editingSuperAdminUser (+14 more)

### Community 2 - "Badge, Tooltip and Role Cells"
Cohesion: 0.06
Nodes (31): createColumns(), features, filterFn_isOneOf(), helper, HIDDEN_COLUMNS, isTemporarilyLocked(), RoleOption, { set: setUsersContext, get: getUsersContext } (+23 more)

### Community 3 - "Sidebar Shell"
Cohesion: 0.07
Nodes (9): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarStateProps (+1 more)

### Community 5 - "shadcn-svelte Skill Docs"
Cohesion: 0.11
Nodes (33): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+25 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (27): node, ./.svelte-kit/tsconfig.json, **/*.ts, compilerOptions, esModuleInterop, module, moduleResolution, noEmit (+19 more)

### Community 8 - "Empty State and Field Primitives"
Cohesion: 0.11
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 9 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (25): @clack/prompts, drizzle-orm, mysql2, dependencies, @clack/prompts, drizzle-orm, mode-watcher, mysql2 (+17 more)

### Community 10 - "Permission Tree and Picker"
Cohesion: 0.14
Nodes (18): addViewKeysAbove(), ADMIN_MODULE, DraftGroup, grantedAreaLabels(), grantsChanges(), GROUP_LABELS, groupLabel(), GroupState (+10 more)

### Community 11 - "Role Templates and Admin Bootstrap"
Cohesion: 0.14
Nodes (16): Admin Template, Bootstrap via create-admin, Roles Page Keys Hidden From the Editor, Role Templates, Super Admin Template, __dirname, main(), RESTRICTED_PERMISSION_KEYS (+8 more)

### Community 13 - "Component Registry Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 14 - "Admin Command-Line Scripts"
Cohesion: 0.19
Nodes (7): bailIfCancelled(), connectToDatabase(), verifyDbPassword(), VerifyMessages, requireEnv(), safeEqual(), __dirname

### Community 15 - "Roles Page Context"
Cohesion: 0.17
Nodes (7): RoleKind, roleKindOf(), PermissionRow, RoleRow, RolesContext, RoleTemplateOption, { set: setRolesContext, get: getRolesContext }

### Community 17 - "Error State Component"
Cohesion: 0.14
Nodes (9): body, hasDetails, heading, Icon, isServerError, open, preset, presets (+1 more)

### Community 19 - "Access Checks and Staff Loaders"
Cohesion: 0.26
Nodes (6): can(), canAll(), canAny(), canModule(), createAccess(), { set: setGlobalContext, get: getGlobalContext }

### Community 20 - "Permission Definitions and Sync"
Cohesion: 0.17
Nodes (11): __dirname, ActionMap, built, KeysOfModule, ModuleDef, PermissionDefs, PermissionModule, PERMISSIONS (+3 more)

### Community 23 - "Roles Filter State"
Cohesion: 0.17
Nodes (10): ASSIGNMENT_OPTIONS, AUTHORITY_OPTIONS, CountedOption, FilterOption, KIND_OPTIONS, RoleFacets, RoleFilterId, RoleFilterState (+2 more)

### Community 24 - "Project Rules and Conventions"
Cohesion: 0.17
Nodes (12): Database Naming Rules, Primary and Foreign Key Naming, Snake Case Columns, Camel Case Fields, Soft Delete via Status Enum, Protection From a Live Condition, Not a Column, Open: Surfacing Role Contents Outside the Roles Page, RBAC Locked Decisions, Roles Editor Is Super-Admin Only (+4 more)

### Community 26 - "Roles Table Columns"
Cohesion: 0.29
Nodes (10): createColumns(), features, filterFn_isOneOf(), helper, HIDDEN_COLUMNS, buildRoleFacets(), roleAreaValues(), roleAssignmentValue() (+2 more)

### Community 27 - "Commit Message Rules"
Cohesion: 0.22
Nodes (11): Bullet Body, Commit Message Format, Commit Primary Changes Scope, Commit Staged Files Scope, Commit This Scope, Conventional Prefix Title, Default Body Ordering, Pre-Commit Format Check (+3 more)

### Community 28 - "Super-Admin Safeguards"
Cohesion: 0.22
Nodes (10): Never Zero Active Super-Admins, No User Changes Their Own Role, Exactly One Holder of the Restricted Key, Only a Super-Admin Assigns Super-Admin, Super-Admin Role, CRITICAL_PERMISSION_KEY, findSuperAdminRolePk(), getActiveSuperAdmins() (+2 more)

### Community 29 - "Database Row Types"
Cohesion: 0.18
Nodes (10): NewOrgUnit, NewPermission, NewRole, NewRolePermission, NewSession, NewUser, Permission, Role (+2 more)

### Community 30 - "Org Unit Context"
Cohesion: 0.27
Nodes (3): OrgUnit, nextLevel(), OrgUnitContext

### Community 31 - "Build and Tooling Dependencies"
Cohesion: 0.20
Nodes (10): @lucide/svelte, devDependencies, @lucide/svelte, shadcn-svelte, @sveltejs/adapter-node, @sveltejs/kit, @tailwindcss/forms, @sveltejs/adapter-node (+2 more)

### Community 32 - "Roles Page Server Actions"
Cohesion: 0.27
Nodes (7): keysForKind(), actions, getSuperAdminRolePk(), load(), readRoleForm(), restrictedKeys, setRolePermissions()

### Community 33 - "Permission Sync Rules"
Cohesion: 0.22
Nodes (9): Expand Permissions Walks the Whole Chain, Frozen Super-Admin Role, Implied Permissions, Open: Orphan Cleanup, Orphan Keys Reported, Never Deleted, Permission Sync, Super-Admin Backfill, main() (+1 more)

### Community 35 - "Org Structure Tree Building"
Cohesion: 0.22
Nodes (7): User, makeContext(), AssignedUser, LEVEL_ORDER, NonOfficeOrgUnit, { set: setOrgUnitContext, get: getOrgUnitContext }, TreeNode

### Community 37 - "Agency Project Overview"
Cohesion: 0.25
Nodes (8): DENR-PENRO Dinagat Islands, ISO 14001:2015, RA 9003 (Ecological Solid Waste Management Act), tailwindcss, typescript, EMS Project README, tailwindcss, typescript

### Community 38 - "Staff Sidebar and Active Path"
Cohesion: 0.32
Nodes (4): gblCtx, visibleNavMain, isActivePath(), stripTrailingSlash()

### Community 39 - "RBAC Role Model Decisions"
Cohesion: 0.40
Nodes (6): Admin Role Kind, Mirrored Admin and Staff Data Routes, Open: Staff Module Actions Beyond View, Check Permission Keys, Never Role Names, Staff Role Kind, User to Role to Permission Model

### Community 41 - "App Type Declarations"
Cohesion: 0.33
Nodes (5): App, Error, Locals, PageData, SessionUser

### Community 42 - "Session Data Loaders"
Cohesion: 0.60
Nodes (3): getSessionData(), load(), load()

### Community 43 - "Permission Key Shape Rules"
Cohesion: 0.40
Nodes (5): Keys Built Forward, Never Split Apart, Mandatory View Action Per Module, One Level of Submodules, Permission Key Shape, buildPermissions()

### Community 44 - "Permission Expansion Rules"
Cohesion: 0.40
Nodes (4): Role Editor Auto-Tick, Server-Side Expansion Before Writing, buildPermissionTree(), draft()

## Knowledge Gaps
- **206 isolated node(s):** `RoleTemplateName`, `VerifyMessages`, `Getter`, `SidebarStateProps`, `ActionMap` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Build and Tooling Dependencies` to `Agency Project Overview`, `Runtime Dependencies`, `clsx Dependency`, `drizzle-kit Dependency`, `Geist Font Dependency`, `Internationalized Date Dependency`, `bits-ui Dependency`, `Svelte Dependency`, `svelte-check Dependency`, `svelte-sonner Dependency`, `Vite Svelte Plugin Dependency`, `tailwind-merge Dependency`, `tailwind-variants Dependency`, `Tailwind Typography Dependency`, `Tailwind Vite Plugin Dependency`, `tw-animate-css Dependency`, `Node Types Dependency`, `Vite Dependency`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `RoleTemplateName`, `VerifyMessages`, `Getter` to the rest of the system?**
  _206 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth, Session and Route Guards` be split into smaller, more focused modules?**
  _Cohesion score 0.05117117117117117 - nodes in this community are weakly interconnected._
- **Should `Dialog and Table Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.06103286384976526 - nodes in this community are weakly interconnected._
- **Should `Badge, Tooltip and Role Cells` be split into smaller, more focused modules?**
  _Cohesion score 0.05928614640048397 - nodes in this community are weakly interconnected._
- **Should `Sidebar Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06543385490753911 - nodes in this community are weakly interconnected._
- **Should `Dropdown Menu and Checkbox` be split into smaller, more focused modules?**
  _Cohesion score 0.06722689075630252 - nodes in this community are weakly interconnected._