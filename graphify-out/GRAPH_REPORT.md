# Graph Report - ems  (2026-08-25)

## Corpus Check
- 64 files · ~160,370 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1045 nodes · 1993 edges · 97 communities (67 shown, 30 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.85)
- Token cost: 164,130 input · 0 output

## Community Hubs (Navigation)
- Auth Guard and Password Hashing
- Role Kinds and Permission Model
- Org Structure and Employee Context
- Employee and User Separation
- shadcn-svelte Skill Docs
- Database Naming and Super-Admin Rules
- Sidebar Component Family
- Table Columns and Faceted Filters
- TypeScript Config
- Employee Table Rows and Cells
- Admin Bootstrap and Role Templates
- Employee Field Labels and Enums
- Permission Tree and Picker
- App Sidebars and Nav User Menu
- App Types and Drizzle Row Types
- Tooltip and Date Formatting
- shadcn Components Config
- Toolbars and Row Action Menus
- Sidebar State and Constants
- Error State Presets
- Form Field Primitives
- Route Access Guards
- Dev Dependencies
- Add and Edit Dialogs
- Sheet Component Family
- Add and Edit User Dialog
- Commit Message Rules
- Permission Sync and Implications
- Permission Key Shape Decisions
- Roles Page Server Actions
- Project Scope and Environmental Mandate
- Toasts, Theme and Root Layout
- Package Scripts
- Data Table Wiring
- Runtime Dependencies
- Sidebar State and Mobile Detection
- Facet Counting Helpers
- Separator and List Pages
- Agency Logo and Nav Header
- Bagong Pilipinas Branding
- App Error and Route Progress
- Package Manifest Fields
- Signatory Roster and Conflicts
- Role Editor Auto-Tick Expansion
- Global Permission Context
- Session Data Loading
- shadcn-svelte Logo (Claude)
- Geist Font Package
- Internationalized Date Package
- Lucide Icon Package
- Bits UI Package
- Svelte Check Package
- Svelte Sonner Package
- Node Adapter Package
- SvelteKit Package
- Tailwind Merge Package
- Tailwind Variants Package
- Tailwind Vite Plugin
- Tailwind Animate Package
- Node Type Definitions
- Vite Package
- shadcn-svelte Logo (Agents)
- shadcn-svelte Small Logo (Agents)
- shadcn-svelte Logo (Claude Assets)
- SvelteKit App Shell
- DENR Agency Logo
- DENR Seal Favicon
- Robots Crawl Policy

## God Nodes (most connected - your core abstractions)
1. `UsersContext` - 19 edges
2. `can()` - 12 edges
3. `compilerOptions` - 12 edges
4. `roleKindOf()` - 12 edges
5. `OrgUnit` - 12 edges
6. `RolesContext` - 11 edges
7. `PermissionKey` - 11 edges
8. `compilerOptions` - 10 edges
9. `scripts` - 10 edges
10. `RoleKind` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Exactly One Holder of the Restricted Key` --references--> `SUPER_ADMIN_KEY`  [INFERRED]
  .claude/skills/rbac-design/SKILL.md → src/lib/rbac/permission-tree.ts
- `Mandatory View Action Per Module` --references--> `PermissionKey`  [EXTRACTED]
  .claude/skills/rbac-design/SKILL.md → src/lib/server/permissions.ts
- `Super Admin Template` --references--> `ALL_ADMIN_PERMISSIONS`  [INFERRED]
  .claude/skills/rbac-design/SKILL.md → src/lib/server/role-templates.ts
- `EMS Project README` --references--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `EMS Project README` --references--> `typescript`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The employee/user split - tables, link, and status naming** — _claude_docs_features_employee_and_user_separation_employee_table, _claude_docs_features_employee_and_user_separation_user_table, _claude_docs_features_employee_and_user_separation_employee_fk_link, _claude_docs_features_employee_and_user_separation_role_fk_stays_on_user, _claude_docs_features_employee_and_user_separation_status_word_disambiguation [EXTRACTED 1.00]
- **Sign-in refusal for a person who has left** — _claude_docs_features_employee_and_user_separation_signin_refuses_separated, _claude_docs_features_employee_and_user_separation_session_employee_join, _claude_docs_features_employee_and_user_separation_end_sessions_for_employee, _claude_docs_features_employee_and_user_separation_employment_status, _claude_docs_features_employee_and_user_separation_users_page [EXTRACTED 1.00]
- **Keeping a signatory's printed name correct over time** — _claude_docs_features_signatory_history_row, _claude_docs_features_signatory_reference_not_stored_text, _claude_docs_features_signatory_typed_position_title, _claude_docs_features_signatory_multiple_rows_per_person, _claude_docs_features_signatory_oic_no_feature [EXTRACTED 1.00]
- **Agency Branding Asset Set (seal artwork, theme variant policy, offline bundling)** — src_lib_assets_agency_logo_dark, src_lib_assets_agency_logo_dark_denr_seal, src_lib_assets_agency_logo_dark_theme_aware_branding, src_lib_assets_agency_logo_dark_offline_bundled_assets [INFERRED 0.75]
- **Visual Composition of the Bagong Pilipinas Emblem** — src_lib_assets_bagong_pilipinas_logo_philippine_flag_motif, src_lib_assets_bagong_pilipinas_logo_development_iconography, src_lib_assets_bagong_pilipinas_logo_wordmark, src_lib_assets_bagong_pilipinas_logo_bagong_pilipinas_campaign [INFERRED 0.85]
- **Commit Staging Scope Selection** — _claude_skills_commit_message_skill_staging_scope, _claude_skills_commit_message_skill_commit_staged_files, _claude_skills_commit_message_skill_commit_primary_changes, _claude_skills_commit_message_skill_commit_this [EXTRACTED 1.00]
- **Permission Key Derivation Chain** — _claude_skills_rbac_design_skill_permission_key_shape, _claude_skills_rbac_design_skill_keys_built_forward, _claude_skills_rbac_design_skill_one_submodule_level, _claude_skills_rbac_design_skill_mandatory_view_action, src_lib_server_permissions_permission_defs, src_lib_server_permissions_buildpermissions [EXTRACTED 1.00]
- **Super-Admin Bootstrap and Sync Path** — _claude_skills_rbac_design_skill_bootstrap_create_admin, _claude_skills_rbac_design_skill_permission_sync, _claude_skills_rbac_design_skill_super_admin_backfill, _claude_skills_rbac_design_skill_super_admin_template, scripts_create_admin_main, scripts_sync_permissions_main [EXTRACTED 1.00]
- **Super-Admin Protection Rules** — _claude_skills_rbac_design_skill_frozen_super_admin, _claude_skills_rbac_design_skill_one_holder_only, _claude_skills_rbac_design_skill_never_zero_holders, _claude_skills_rbac_design_skill_no_self_role_change, _claude_skills_rbac_design_skill_only_super_admin_assigns, _claude_skills_rbac_design_skill_no_is_protected_column [EXTRACTED 1.00]
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview [INFERRED 0.85]

## Communities (97 total, 30 thin omitted)

### Community 0 - "Auth Guard and Password Hashing"
Cohesion: 0.05
Nodes (43): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, generateTemporaryPassword(), hashPassword(), pick(), scryptAsync (+35 more)

### Community 1 - "Role Kinds and Permission Model"
Cohesion: 0.06
Nodes (33): Admin Role Kind, Mirrored Admin and Staff Data Routes, Open: Staff Module Actions Beyond View, Check Permission Keys, Never Role Names, Staff Role Kind, User to Role to Permission Model, RoleKind, Role (+25 more)

### Community 2 - "Org Structure and Employee Context"
Cohesion: 0.06
Nodes (11): OrgUnit, EmployeesContext, AssignedEmployee, LEVEL_ORDER, nextLevel(), NonOfficeOrgUnit, OrgUnitContext, { set: setOrgUnitContext, get: getOrgUnitContext } (+3 more)

### Community 3 - "Employee and User Separation"
Cohesion: 0.07
Nodes (43): account_status (renamed from status), create-admin.ts two-insert bootstrap, employee_fk link on user, admin:view_employees and admin:manage_employees, employee table, Employees page (/admin/employees), employment_status (active / separated), endSessionsForEmployee (+35 more)

### Community 5 - "shadcn-svelte Skill Docs"
Cohesion: 0.11
Nodes (34): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+26 more)

### Community 6 - "Database Naming and Super-Admin Rules"
Cohesion: 0.08
Nodes (22): Database Naming Rules, Primary and Foreign Key Naming, Snake Case Columns, Camel Case Fields, Soft Delete via Status Enum, Frozen Super-Admin Role, Never Zero Active Super-Admins, Protection From a Live Condition, Not a Column, No User Changes Their Own Role (+14 more)

### Community 7 - "Sidebar Component Family"
Cohesion: 0.10
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 8 - "Table Columns and Faceted Filters"
Cohesion: 0.11
Nodes (26): roleKindOf(), PermissionRow, filterFn_isOneOf(), createColumns(), features, helper, HIDDEN_COLUMNS, EmployeeOption (+18 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.07
Nodes (27): node, ./.svelte-kit/tsconfig.json, **/*.ts, compilerOptions, esModuleInterop, module, moduleResolution, noEmit (+19 more)

### Community 10 - "Employee Table Rows and Cells"
Cohesion: 0.11
Nodes (21): Employee, fullName(), columns, features, helper, HIDDEN_COLUMNS, EmployeeRow, hasLogin() (+13 more)

### Community 11 - "Admin Bootstrap and Role Templates"
Cohesion: 0.10
Nodes (23): Admin Template, Bootstrap via create-admin, Role Templates, Super Admin Template, __dirname, main(), ActionMap, built (+15 more)

### Community 12 - "Employee Field Labels and Enums"
Cohesion: 0.10
Nodes (20): CIVIL_STATUS_LABELS, CIVIL_STATUS_VALUES, EMPLOYMENT_STATUS_LABELS, NOT_ANSWERED, SEX_LABELS, SEX_VALUES, TENURE_STATUS_LABELS, TENURE_STATUS_SHORT (+12 more)

### Community 13 - "Permission Tree and Picker"
Cohesion: 0.13
Nodes (19): addViewKeysAbove(), ADMIN_MODULE, DraftGroup, grantedAreaLabels(), grantsChanges(), GROUP_LABELS, groupLabel(), GroupState (+11 more)

### Community 15 - "App Sidebars and Nav User Menu"
Cohesion: 0.15
Nodes (5): gblCtx, visibleNavMain, isActivePath(), stripTrailingSlash(), { set: setGlobalContext, get: getGlobalContext }

### Community 16 - "App Types and Drizzle Row Types"
Cohesion: 0.12
Nodes (16): App, Error, Locals, PageData, NewEmployee, NewOrgUnit, NewPermission, NewRole (+8 more)

### Community 17 - "Tooltip and Date Formatting"
Cohesion: 0.13
Nodes (4): DATE_ONLY, DATE_TIME, formatDate(), formatWhen()

### Community 19 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 21 - "Sidebar State and Constants"
Cohesion: 0.15
Nodes (9): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarStateProps (+1 more)

### Community 23 - "Error State Presets"
Cohesion: 0.14
Nodes (9): body, hasDetails, heading, Icon, isServerError, open, preset, presets (+1 more)

### Community 27 - "Route Access Guards"
Cohesion: 0.24
Nodes (6): can(), canAll(), canAny(), canModule(), createAccess(), load()

### Community 28 - "Dev Dependencies"
Cohesion: 0.15
Nodes (13): clsx, drizzle-kit, devDependencies, clsx, drizzle-kit, svelte, @sveltejs/vite-plugin-svelte, @tailwindcss/forms (+5 more)

### Community 29 - "Add and Edit Dialogs"
Cohesion: 0.18
Nodes (3): canSubmit, selectedSection, today

### Community 32 - "Add and Edit User Dialog"
Cohesion: 0.17
Nodes (11): adminRoles, canSubmit, editingSuperAdminUser, passwordProblem, peopleOptions, personHasLeft, roleLocked, selectedRole (+3 more)

### Community 33 - "Commit Message Rules"
Cohesion: 0.22
Nodes (11): Bullet Body, Commit Message Format, Commit Primary Changes Scope, Commit Staged Files Scope, Commit This Scope, Conventional Prefix Title, Default Body Ordering, Pre-Commit Format Check (+3 more)

### Community 34 - "Permission Sync and Implications"
Cohesion: 0.22
Nodes (10): Expand Permissions Walks the Whole Chain, Implied Permissions, Open: Orphan Cleanup, Orphan Keys Reported, Never Deleted, Permission Sync, __dirname, main(), expandPermissions() (+2 more)

### Community 35 - "Permission Key Shape Decisions"
Cohesion: 0.18
Nodes (11): Roles Page Keys Hidden From the Editor, Keys Built Forward, Never Split Apart, Mandatory View Action Per Module, One Level of Submodules, Open: Surfacing Role Contents Outside the Roles Page, Permission Key Shape, RBAC Locked Decisions, Roles Editor Is Super-Admin Only (+3 more)

### Community 36 - "Roles Page Server Actions"
Cohesion: 0.24
Nodes (8): Exactly One Holder of the Restricted Key, keysForKind(), SUPER_ADMIN_KEY, actions, getSuperAdminRolePk(), load(), readRoleForm(), restrictedKeys

### Community 37 - "Project Scope and Environmental Mandate"
Cohesion: 0.22
Nodes (10): light HR flavour, not a personnel system, EMS (Environmental Management System), DENR-PENRO Dinagat Islands, ISO 14001:2015, RA 9003 (Ecological Solid Waste Management Act), tailwindcss, typescript, EMS Project README (+2 more)

### Community 39 - "Package Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, check:watch, create-admin, dev, prepare, preview (+2 more)

### Community 41 - "Data Table Wiring"
Cohesion: 0.24
Nodes (5): globalFilter(), columnFilters, facets, matched, table

### Community 42 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): @clack/prompts, drizzle-orm, mysql2, dependencies, @clack/prompts, drizzle-orm, mysql2, @tanstack/svelte-table (+1 more)

### Community 44 - "Facet Counting Helpers"
Cohesion: 0.31
Nodes (7): CountedOption, FilterOption, optionsFromValues(), tally(), withCounts(), EmployeeFacets, UserFacets

### Community 45 - "Separator and List Pages"
Cohesion: 0.25
Nodes (4): columnFilters, facets, matched, table

### Community 46 - "Agency Logo and Nav Header"
Cohesion: 0.38
Nodes (6): Agency Logo (Dark Variant), DENR Official Seal (Department of Environment and Natural Resources, 1987), Government Agency Identity of the EMS Deployment, Offline Bundled Asset Policy (No CDN), Seal Iconography: Stylized Tree, Blue Sky, Green Terraced Land, Theme-Aware Branding Asset Pair

### Community 47 - "Bagong Pilipinas Branding"
Cohesion: 0.48
Nodes (7): Bagong Pilipinas Logo Asset, Bagong Pilipinas Campaign Identity, Development Iconography Line Art (Wind Turbines, Solar Panels, Satellite, Cityscape, Circuitry, Heritage Buildings), Official Government Agency Visual Identity, Offline-Bundled Government Branding Asset, Philippine Flag Motif (Eight-Rayed Sun and Three Stars), BAGONG PILIPINAS Wordmark

### Community 49 - "Package Manifest Fields"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 50 - "Signatory Roster and Conflicts"
Cohesion: 0.40
Nodes (5): signatory conflict checker, signing happens both on paper and in the system, signatory roster, signing line / slot, approvers may approve their own submissions

### Community 51 - "Role Editor Auto-Tick Expansion"
Cohesion: 0.40
Nodes (4): Role Editor Auto-Tick, Server-Side Expansion Before Writing, buildPermissionTree(), draft()

## Ambiguous Edges - Review These
- `two admin screens instead of one` → `one role per user, no per-user overrides`  [AMBIGUOUS]
  .claude/docs/features/employee-and-user-separation.md · relation: conceptually_related_to

## Knowledge Gaps
- **230 isolated node(s):** `RoleTemplateName`, `VerifyMessages`, `RoleFacets`, `RoleFilterId`, `RoleFilterState` (+225 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `two admin screens instead of one` and `one role per user, no per-user overrides`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest Fields`, `Toasts, Theme and Root Layout`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `mode-watcher` connect `Toasts, Theme and Root Layout` to `Runtime Dependencies`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Tailwind Merge Package`, `Tailwind Variants Package`, `Tailwind Vite Plugin`, `Tailwind Animate Package`, `Node Type Definitions`, `shadcn-svelte Skill Docs`, `Project Scope and Environmental Mandate`, `Vite Package`, `Package Manifest Fields`, `Geist Font Package`, `Internationalized Date Package`, `Lucide Icon Package`, `Bits UI Package`, `Svelte Check Package`, `Svelte Sonner Package`, `Node Adapter Package`, `SvelteKit Package`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **What connects `RoleTemplateName`, `VerifyMessages`, `RoleFacets` to the rest of the system?**
  _230 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Guard and Password Hashing` be split into smaller, more focused modules?**
  _Cohesion score 0.05189189189189189 - nodes in this community are weakly interconnected._
- **Should `Role Kinds and Permission Model` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._