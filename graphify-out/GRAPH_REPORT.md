# Graph Report - ems  (2026-09-10)

## Corpus Check
- 44 files · ~240,910 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1442 nodes · 2801 edges · 126 communities (88 shown, 38 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 120 edges (avg confidence: 0.85)
- Token cost: 106,683 input · 0 output

## Community Hubs (Navigation)
- Employee, Signatory, RBAC Docs
- Permission Picker Tree
- Employee Table and Cells
- Navigation and Avatar Menu
- Sidebar Constants and Parts
- Setup and Bootstrap Scripts
- shadcn-svelte Skill Docs
- Runtime Dependencies
- Auth Hooks and Redirects
- Password Hashing and Strength
- Employee History Versioning
- Employee Page Actions and Duplicates
- Employee and User Separation
- Access Checks and Session Data
- Table Toolbar and Filters UI
- Config Table and Org Unit Guard
- Web Animation Skill
- Animation Skill Core Rules
- Breadcrumbs and Header
- Scripts TypeScript Config
- Form Fields and Employee Dialogs
- Shared Type Definitions
- Data Table Pages
- shadcn Components Config
- Dialog and Sheet Open Timing
- Database Connection and Fuel Assets
- Database Schema Tables
- Faceted Filter Helpers
- Animation Never-Ship Rules
- Root TypeScript Config
- Permission Sync and Expansion
- Tooltip and Badge
- Org Structure Context
- Duplicate Employee Check
- Users Context Methods
- Gesture and Sheet Recipes
- Animation Utility Functions
- Org Chart Layout
- Expo Press and Build Sequence
- Error State Screens
- Dialog Footer and Field Parts
- User Row Types and Cells
- Easing Tokens and Curves
- Roles Context and Types
- Employees Context Methods
- Flowchart Diagram Skill
- Admin Sidebar and Theme
- Permission Definitions
- Users Table Columns
- Add and Edit User Dialog
- Scroll and Tab Indicator Recipes
- Commit Message Format
- Org Unit Context Methods
- Project README and App Shell
- Sidebar Mobile State
- Expo Runtime and Haptics
- Animation Audit Workflow
- Dev Dependencies
- Admin Navigation Items
- Role Templates and Restricted Keys
- Toast Recipes and Durations
- Flowchart Validator Script
- Staff Sidebar and Active Path
- DENR Agency Seal Assets
- Bagong Pilipinas Logo
- Org Structure Columns and Cells
- User Date Formatting
- Git Feature Flow
- App Error and Route Progress
- App Type Declarations
- Global Permission Context
- Spring Configurations
- Review Verdict and Findings
- Employee Permission Keys
- Database Naming Rules
- Swimlanes and Edge Parenting
- WAAPI and Tool Ladder
- Offline LAN Deployment
- ISO Compliance and Tracked Areas
- Draw.io Routing Geometry
- shadcn-svelte Logo (small)
- clsx Package
- drizzle-kit Package
- Geist Font Package
- Internationalized Date
- Lucide Svelte Package
- Svelte Package
- Svelte Sonner Package
- Adapter Node
- SvelteKit Package
- Vite Plugin Svelte
- Tailwind Variants Package
- Tailwind Forms Plugin
- Tailwind Typography Plugin
- TW Animate CSS
- Node Type Definitions
- Vite Package
- Named Purpose Gate
- Fuel Approval Step
- One Role Per User
- shadcn-svelte Logo
- shadcn-svelte Logo Asset
- shadcn-svelte Logo (.claude)
- DENR Agency Logo
- DENR Seal Favicon
- Robots Crawl Policy

## God Nodes (most connected - your core abstractions)
1. `can()` - 24 edges
2. `UsersContext` - 19 edges
3. `Animation Standards Reference` - 18 edges
4. `EmployeesContext` - 15 edges
5. `db` - 15 edges
6. `main()` - 14 edges
7. `OrgUnit` - 14 edges
8. `user` - 13 edges
9. `PermissionKey` - 13 edges
10. `roleKindOf()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Finding severity scale (HIGH / MEDIUM / LOW)` --semantically_similar_to--> `Aggressive escalation triggers`  [INFERRED] [semantically similar]
  .agents/skills/improve-animations/SKILL.md → .claude/skills/review-animations/SKILL.md
- `Expo Never Ship table` --semantically_similar_to--> `Aggressive escalation triggers`  [INFERRED] [semantically similar]
  .agents/skills/animate-expo/SKILL.md → .claude/skills/review-animations/SKILL.md
- `openai.yml — agent config (.agents)` --semantically_similar_to--> `openai.yml — agent config (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/agents/openai.yml → .claude/skills/shadcn-svelte/agents/openai.yml
- `cli.md — CLI reference (.agents)` --semantically_similar_to--> `cli.md — CLI reference (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/cli.md → .claude/skills/shadcn-svelte/cli.md
- `customization.md — theming guide (.agents)` --semantically_similar_to--> `customization.md — theming guide (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/shadcn-svelte/customization.md → .claude/skills/shadcn-svelte/customization.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The four animation skills share one craft bar** — _claude_skills_animate_skill_build_sequence, _claude_skills_animate_expo_skill_build_sequence, _claude_skills_review_animations_skill_ten_standards, _claude_skills_improve_animations_skill_audit_then_plan, _claude_skills_review_animations_skill_emil_kowalski_philosophy [EXTRACTED 1.00]
- **The four animation skills form one build-review-audit toolchain** — _agents_skills_animate_skill_animate, _agents_skills_animate_expo_skill_animate_expo, _agents_skills_review_animations_skill_review_animations, _agents_skills_improve_animations_skill_improve_animations [EXTRACTED 1.00]
- **Commit Staging Scope Selection** — _claude_skills_commit_message_skill_staging_scope, _claude_skills_commit_message_skill_commit_staged_files, _claude_skills_commit_message_skill_commit_primary_changes, _claude_skills_commit_message_skill_commit_this [EXTRACTED 1.00]
- **Employee history write path kept in one transaction** — _claude_docs_features_employee_and_user_separation_employee_table, _claude_docs_features_employee_and_user_separation_employee_history, _claude_docs_features_employee_and_user_separation_version_date_rules, _claude_docs_features_employee_and_user_separation_position_short_form, _claude_docs_features_signatory_employee_history_correction [EXTRACTED 1.00]
- **Agency Branding Asset Set (seal artwork, theme variant policy, offline bundling)** — src_lib_assets_agency_logo_dark, src_lib_assets_agency_logo_dark_denr_seal, src_lib_assets_agency_logo_dark_theme_aware_branding, src_lib_assets_agency_logo_dark_offline_bundled_assets [INFERRED 0.75]
- **shadcn-svelte Skill Package (.agents)** — _agents_skills_shadcn_svelte_skill_overview, _agents_skills_shadcn_svelte_agents_openai_agent_config, _agents_skills_shadcn_svelte_cli_reference, _agents_skills_shadcn_svelte_customization_theming_guide, _agents_skills_shadcn_svelte_rules_composition_rules, _agents_skills_shadcn_svelte_rules_forms_rules, _agents_skills_shadcn_svelte_rules_icons_rules, _agents_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Visual Composition of the Bagong Pilipinas Emblem** — src_lib_assets_bagong_pilipinas_logo_philippine_flag_motif, src_lib_assets_bagong_pilipinas_logo_development_iconography, src_lib_assets_bagong_pilipinas_logo_wordmark, src_lib_assets_bagong_pilipinas_logo_bagong_pilipinas_campaign [INFERRED 0.85]
- **shadcn-svelte Skill Package (.claude)** — _claude_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_agents_openai_agent_config, _claude_skills_shadcn_svelte_cli_reference, _claude_skills_shadcn_svelte_customization_theming_guide, _claude_skills_shadcn_svelte_rules_composition_rules, _claude_skills_shadcn_svelte_rules_forms_rules, _claude_skills_shadcn_svelte_rules_icons_rules, _claude_skills_shadcn_svelte_rules_styling_rules [INFERRED 0.85]
- **Velocity-projected dismissal with boundary friction** — _agents_skills_animate_expo_recipes_project, _agents_skills_animate_expo_recipes_rubberband, _agents_skills_animate_expo_recipes_bottom_sheet_drag_dismiss, _agents_skills_animate_expo_recipes_swipe_to_delete_row, _agents_skills_animate_recipes_drag_to_dismiss, _agents_skills_review_animations_standards_gestures_drag [INFERRED 0.85]
- **Duplicated shadcn-svelte Skill Installation** — _agents_skills_shadcn_svelte_skill_overview, _claude_skills_shadcn_svelte_skill_overview, shadcn_svelte [INFERRED 0.85]
- **The same three bezier curves are canonical across every animation document** — _agents_skills_animate_skill_easing_tokens, _agents_skills_animate_expo_skill_easing_curve_tokens, _agents_skills_improve_animations_audit_easing_and_duration, _agents_skills_review_animations_standards_easing [INFERRED 0.95]
- **Preparing and printing a fuel document's signature blocks** — _claude_docs_features_signatory_fuel_report, _claude_docs_features_signatory_withdrawal_slip, _claude_docs_features_signatory_driver_trip_ticket, _claude_docs_features_signatory_ris, _claude_docs_features_signatory_signature_block, _claude_docs_features_signatory_filed_date_rule, _claude_docs_features_signatory_employee_history [EXTRACTED 1.00]
- **Two kinds of name or title edit, and who is accountable for each** — _claude_docs_features_signatory_employee_history, _claude_docs_features_signatory_employee_history_correction, _claude_docs_features_signatory_add_change_dialog, _claude_docs_features_signatory_correct_entry_dialog, _claude_docs_features_signatory_document_reference [EXTRACTED 1.00]
- **The mechanisms that keep exactly one unweakenable super-admin role** — _claude_skills_rbac_design_skill_super_admin_role, _claude_skills_rbac_design_skill_roles_page_restriction, _claude_skills_rbac_design_skill_create_admin, _claude_skills_rbac_design_skill_sync_permissions, _claude_skills_rbac_design_skill_role_templates, _claude_skills_rbac_design_skill_no_self_role_change [EXTRACTED 1.00]

## Communities (126 total, 38 thin omitted)

### Community 0 - "Employee, Signatory, RBAC Docs"
Cohesion: 0.05
Nodes (62): Add name or position change dialog, Correct this entry dialog, Correcting an entry versus recording a change, Name and position history sheet, Add name or position change dialog, Signature blocks are fixed in the code, Caption, Config table (+54 more)

### Community 1 - "Permission Picker Tree"
Cohesion: 0.06
Nodes (43): addViewKeysAbove(), ADMIN_MODULE, buildPermissionTree(), draft(), DraftGroup, grantedAreaLabels(), grantsChanges(), GROUP_LABELS (+35 more)

### Community 2 - "Employee Table and Cells"
Cohesion: 0.08
Nodes (29): columns, features, helper, HIDDEN_COLUMNS, BringBackChange, EmployeeRow, hasLogin(), HistoryEntry (+21 more)

### Community 4 - "Navigation and Avatar Menu"
Cohesion: 0.08
Nodes (3): WithElementRef, WithoutChild, WithoutChildren

### Community 5 - "Sidebar Constants and Parts"
Cohesion: 0.07
Nodes (9): SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE, Getter, SidebarStateProps (+1 more)

### Community 6 - "Setup and Bootstrap Scripts"
Cohesion: 0.15
Nodes (28): __dirname, EmployeeRow, main(), askBirthDate(), askOptionalText(), askRequiredText(), __dirname, main() (+20 more)

### Community 7 - "shadcn-svelte Skill Docs"
Cohesion: 0.11
Nodes (34): openai.yml — agent config (.agents), cli.md — CLI reference (.agents), customization.md — theming guide (.agents), rules/composition.md — composition rules (.agents), rules/forms.md — forms rules (.agents), rules/icons.md — icon rules (.agents), rules/styling.md — styling rules (.agents), SKILL.md — shadcn-svelte skill overview (.agents) (+26 more)

### Community 8 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (31): @clack/prompts, @dagrejs/dagre, drizzle-orm, mode-watcher, mysql2, dependencies, @clack/prompts, @dagrejs/dagre (+23 more)

### Community 9 - "Auth Hooks and Redirects"
Cohesion: 0.14
Nodes (22): clearAuthLocals(), guardOrResolve(), handle(), ROLE_ROUTING_EXEMPT, buildLoginRedirect(), getAlreadyLoggedInRedirect(), getDefaultLandingRoute(), getSafeRedirectTarget() (+14 more)

### Community 10 - "Password Hashing and Strength"
Cohesion: 0.11
Nodes (14): generateTemporaryPassword(), hashPassword(), pick(), scryptAsync, verifyPassword(), getPasswordStrengthError(), actions, getSuperAdminRolePk() (+6 more)

### Community 12 - "Employee History Versioning"
Cohesion: 0.18
Nodes (23): employeeHistoryCorrection, addEmployeeVersion(), changedFields(), closeVersion(), correctEmployeeVersion(), createEmployee(), dayBefore(), EmployeeWriteValues (+15 more)

### Community 13 - "Employee Page Actions and Duplicates"
Cohesion: 0.12
Nodes (18): countDocumentsUsingOpenVersions(), alreadyEmployedMessage(), formatBirthDate(), nameWithBirthDate(), wouldDuplicateMessage(), actions, EmployeeInput, employeeRowColumns (+10 more)

### Community 14 - "Employee and User Separation"
Cohesion: 0.11
Nodes (23): backfill-employee-history script (2000-01-01 start), Birth date as the identity anchor, create-admin.ts asks instead of inventing a person, drizzle-kit push is unsafe on this project, Duplicate employee check, employee_history table (versions), employee table, Employee and user full separation (+15 more)

### Community 15 - "Access Checks and Session Data"
Cohesion: 0.17
Nodes (13): can(), canAll(), canAny(), canModule(), createAccess(), countDocumentsUsingVersions(), getSessionData(), GET() (+5 more)

### Community 16 - "Table Toolbar and Filters UI"
Cohesion: 0.19
Nodes (3): ./$types, isValid, ./$types

### Community 17 - "Config Table and Org Unit Guard"
Cohesion: 0.16
Nodes (15): ConfigRecord, getConfigRecord(), getConfigValue(), getConfigValues(), parseConfigValue(), config, CONFIG_KEYS, CONFIG_PARSERS (+7 more)

### Community 18 - "Web Animation Skill"
Cohesion: 0.15
Nodes (20): Masking a crossfade that won't settle with blur, animate skill, Should this animate at all? (frequency gate), pick-ui-library escalation for components, Animation Audit Playbook, Audit category 7 — Cohesion & tokens, Audit category 2 — Easing & duration, Audit category 8 — Missed opportunities (+12 more)

### Community 19 - "Animation Skill Core Rules"
Cohesion: 0.13
Nodes (20): Expo animation recipes, Expo animation build sequence, Haptics rules, Press, not hover, Spring when a finger was involved, Two runtimes — RN runtime and UI runtime, Keep motion off the JS thread, Web animation recipes (+12 more)

### Community 22 - "Scripts TypeScript Config"
Cohesion: 0.11
Nodes (18): ../src/lib, ../src/routes, **/*.ts, compilerOptions, esModuleInterop, module, moduleResolution, noEmit (+10 more)

### Community 23 - "Form Fields and Employee Dialogs"
Cohesion: 0.20
Nodes (4): canSubmit, selectedSection, today, ../$types

### Community 24 - "Shared Type Definitions"
Cohesion: 0.11
Nodes (16): AssetType, Config, NewAssetType, NewConfig, NewEmployee, NewOrgUnit, NewPermission, NewRole (+8 more)

### Community 25 - "Data Table Pages"
Cohesion: 0.14
Nodes (8): columnFilters, facets, matched, table, columnFilters, facets, matched, table

### Community 26 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 27 - "Dialog and Sheet Open Timing"
Cohesion: 0.15
Nodes (3): OPEN_COMPLETE_KEY, watchOpenComplete(), WithoutChildrenOrChild

### Community 28 - "Database Connection and Fuel Assets"
Cohesion: 0.15
Nodes (6): db, poolConnection, assetType, actions, METER_TYPES, MeterType

### Community 29 - "Database Schema Tables"
Cohesion: 0.27
Nodes (7): employee, employeeHistory, orgUnit, permission, rolePermission, role, user

### Community 30 - "Faceted Filter Helpers"
Cohesion: 0.18
Nodes (13): CountedOption, FilterOption, optionsFromValues(), tally(), withCounts(), EmployeeFacets, KIND_OPTIONS, NO_SECTION_LABEL (+5 more)

### Community 31 - "Animation Never-Ship Rules"
Cohesion: 0.13
Nodes (16): Never ease-in on UI (Expo), Never scale(0) entrance (Expo), Expo Never Ship table, Feel is judged on a release build on the slowest device, Dropdown / popover / menu / select recipe, Modal recipe (centered, exempt origin), Tooltip recipe with instant neighbours, Motion full transform string over x/y/scale shorthands (+8 more)

### Community 32 - "Root TypeScript Config"
Cohesion: 0.12
Nodes (15): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+7 more)

### Community 33 - "Permission Sync and Expansion"
Cohesion: 0.18
Nodes (12): __dirname, main(), keysForKind(), SUPER_ADMIN_KEY, expandPermissions(), PERMISSIONS, actions, getSuperAdminRolePk() (+4 more)

### Community 35 - "Org Structure Context"
Cohesion: 0.16
Nodes (7): Employee, AssignedEmployee, LEVEL_ORDER, NonOfficeOrgUnit, OrgUnitView, { set: setOrgUnitContext, get: getOrgUnitContext }, { set: setGlobalContext, get: getGlobalContext }

### Community 36 - "Duplicate Employee Check"
Cohesion: 0.17
Nodes (14): ctx, editing, matched, CandidatePerson, ComparablePerson, compare(), describePerson(), DuplicateKind (+6 more)

### Community 38 - "Gesture and Sheet Recipes"
Cohesion: 0.16
Nodes (15): Bottom sheet you can drag to dismiss, Gesture Handler v3 hook migration, List entrances and the virtualized-list trap, project() momentum projection worklet, rubberband() boundary resistance worklet, Screen transitions with Expo Router native stack, Swipe to delete a row, Velocity handoff from gesture to spring (+7 more)

### Community 40 - "Animation Utility Functions"
Cohesion: 0.17
Nodes (12): autoHeight(), AutoHeightOptions, contentIn(), ContentInParams, DURATION, EASE_IN_OUT_CSS, EASE_OUT_CSS, easeInOut (+4 more)

### Community 41 - "Org Chart Layout"
Cohesion: 0.16
Nodes (10): DropState, NODE_HEIGHT, NODE_WIDTH, OrgNode, OrgNodeData, nextLevel(), moveRejectionReason(), PARENT_LEVEL (+2 more)

### Community 42 - "Expo Press and Build Sequence"
Cohesion: 0.18
Nodes (14): Keyboard-synced UI, PressableScale press feedback recipe, 120fps via CADisableMinimumFrameDurationOnPhone, Expo Build Sequence (9 ordered steps), Keep motion off the JS thread, There is no hover on mobile, Press, not hover (press-in feedback, press-out commit), Name the purpose in one word (+6 more)

### Community 43 - "Error State Screens"
Cohesion: 0.14
Nodes (9): body, hasDetails, heading, Icon, isServerError, open, preset, presets (+1 more)

### Community 45 - "User Row Types and Cells"
Cohesion: 0.14
Nodes (10): Role, User, fullName(), EmployeeOption, isTemporarilyLocked(), RoleOption, { set: setUsersContext, get: getUsersContext }, SuperAdminImpact (+2 more)

### Community 46 - "Easing Tokens and Curves"
Cohesion: 0.15
Nodes (13): Expo Animation Recipes, animate-expo skill, EASE_OUT / EASE_IN_OUT / EASE_SHEET bezier constants, Animation Recipes (web), --ease-out / --ease-in-out / --ease-drawer tokens, Extend the codebase's tokens, don't fork them, Never ease-in on UI (web), Plan boundaries and drift stop-rule (+5 more)

### Community 47 - "Roles Context and Types"
Cohesion: 0.17
Nodes (5): RoleKind, roleKindOf(), PermissionRow, RolesContext, RoleTemplateOption

### Community 49 - "Flowchart Diagram Skill"
Cohesion: 0.18
Nodes (12): Writing .drawio XML by hand, Things that silently break, A worked critique of a failed diagram, Hunt the branches the prose forgot, check_flowchart.py validator, One cylinder = one table, one operation, one point in the flow, Every decision exit carries a label, Check it is actually a flowchart (+4 more)

### Community 50 - "Admin Sidebar and Theme"
Cohesion: 0.17
Nodes (3): isActive, pages, ./types

### Community 51 - "Permission Definitions"
Cohesion: 0.17
Nodes (10): ActionMap, built, KeysOfModule, ModuleDef, PERMISSION_IMPLIES, PermissionDefs, PermissionModule, IMPORTANT: keys are generate-only. `_` is both the separator here and a (+2 more)

### Community 52 - "Users Table Columns"
Cohesion: 0.32
Nodes (11): filterFn_isOneOf(), createColumns(), features, helper, HIDDEN_COLUMNS, buildUserFacets(), userKindValue(), userRoleValue() (+3 more)

### Community 53 - "Add and Edit User Dialog"
Cohesion: 0.17
Nodes (11): adminRoles, canSubmit, editingSuperAdminUser, passwordProblem, peopleOptions, personHasLeft, roleLocked, selectedRole (+3 more)

### Community 54 - "Scroll and Tab Indicator Recipes"
Cohesion: 0.20
Nodes (11): Collapsing header on scroll, Tab / segmented indicator (sanctioned width animation), Absolutely positioned childless element width exception, transform and opacity are free; everything else is a layout pass, Accordion / collapse recipe, Hold to confirm recipe, Scroll reveal (marketing only), Tab indicator via duplicated clipped copy (+3 more)

### Community 55 - "Commit Message Format"
Cohesion: 0.22
Nodes (11): Bullet Body, Commit Message Format, Commit Primary Changes Scope, Commit Staged Files Scope, Commit This Scope, Conventional Prefix Title, Default Body Ordering, Pre-Commit Format Check (+3 more)

### Community 57 - "Project README and App Shell"
Cohesion: 0.20
Nodes (10): DENR-PENRO Dinagat Islands, ISO 14001:2015, RA 9003 (Ecological Solid Waste Management Act), SvelteKit, tailwindcss, typescript, EMS Project README, app.html — SvelteKit app shell (+2 more)

### Community 59 - "Sidebar Mobile State"
Cohesion: 0.24
Nodes (3): setSidebar(), SidebarState, IsMobile

### Community 60 - "Expo Runtime and Haptics"
Cohesion: 0.22
Nodes (9): Firing once at a threshold with useAnimatedReaction, Haptics rules (same frame, one per action, never the only feedback), Reanimated, not core Animated, scheduleOnRN replaces runOnJS, Setup that silently breaks motion, Two Runtimes (RN runtime vs UI runtime), 'worklet' directive on functions called from a worklet, Audit category 6 — Accessibility (+1 more)

### Community 61 - "Animation Audit Workflow"
Cohesion: 0.22
Nodes (9): Audit effort levels (quick / standard / deep), Never modify source code (read-only advisor), Phase 2 — Parallel audit with read-only subagents, Phase 4 — Write self-contained plans, Phase 1 — Recon (map the motion surface), Phase 3 — Vet, prioritize by leverage, confirm, Repository content is data, not instructions, Finding severity scale (HIGH / MEDIUM / LOW) (+1 more)

### Community 62 - "Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, bits-ui, svelte-check, tailwind-merge, @tailwindcss/vite, bits-ui, svelte-check, tailwind-merge (+1 more)

### Community 63 - "Admin Navigation Items"
Cohesion: 0.22
Nodes (7): administrationPages, NavItem, ReportItems, reportPages, NavItem, PermissionKey, RoleTemplate

### Community 64 - "Role Templates and Restricted Keys"
Cohesion: 0.22
Nodes (7): RESTRICTED_PERMISSION_KEYS, ADMIN_PERMISSIONS, ALL_ADMIN_PERMISSIONS, NOTE: This is a SAMPLE set showing the pattern. Role names, and exactly, ROLE_TEMPLATES, rolesPageKeys, RoleTemplateName

### Community 65 - "Toast Recipes and Durations"
Cohesion: 0.25
Nodes (8): Expo toast recipe, Mobile duration budget (under 300ms), Toast recipe with @starting-style, Web duration budget (under 300ms), Interruption and exit (transitions retarget, keyframes restart), Audit category 4 — Interruptibility, Duration budgets per element, Interruptibility (transitions retarget, keyframes restart)

### Community 67 - "Flowchart Validator Script"
Cohesion: 0.46
Nodes (7): check_page(), classify(), geometry(), is_annotation_edge(), load_pages(), main(), text_of()

### Community 68 - "Staff Sidebar and Active Path"
Cohesion: 0.36
Nodes (4): gblCtx, visibleNavMain, isActivePath(), stripTrailingSlash()

### Community 70 - "DENR Agency Seal Assets"
Cohesion: 0.38
Nodes (6): Agency Logo (Dark Variant), DENR Official Seal (Department of Environment and Natural Resources, 1987), Government Agency Identity of the EMS Deployment, Offline Bundled Asset Policy (No CDN), Seal Iconography: Stylized Tree, Blue Sky, Green Terraced Land, Theme-Aware Branding Asset Pair

### Community 71 - "Bagong Pilipinas Logo"
Cohesion: 0.48
Nodes (7): Bagong Pilipinas Logo Asset, Bagong Pilipinas Campaign Identity, Development Iconography Line Art (Wind Turbines, Solar Panels, Satellite, Cityscape, Circuitry, Heritage Buildings), Official Government Agency Visual Identity, Offline-Bundled Government Branding Asset, Philippine Flag Motif (Eight-Rayed Sun and Three Stars), BAGONG PILIPINAS Wordmark

### Community 72 - "Org Structure Columns and Cells"
Cohesion: 0.29
Nodes (4): columns, features, helper, TreeNode

### Community 73 - "User Date Formatting"
Cohesion: 0.33
Nodes (4): DATE_ONLY, DATE_TIME, formatDate(), formatWhen()

### Community 74 - "Git Feature Flow"
Cohesion: 0.33
Nodes (6): deciding where a change belongs, stop and report on merge conflicts, git feature flow, leave merged feature branches alive, merge asymmetry, never push

### Community 76 - "App Type Declarations"
Cohesion: 0.47
Nodes (5): App, Error, Locals, PageData, SessionUser

### Community 78 - "Spring Configurations"
Cohesion: 0.50
Nodes (4): The finger is on the element (gesture-first input), Apple two-parameter spring config (duration + dampingRatio), Apple-style spring config (duration 0.5, bounce 0.2), Springs (Apple-style and physics configs)

### Community 79 - "Review Verdict and Findings"
Cohesion: 0.50
Nodes (4): Invocation variants (plan / execute / reconcile), Default to flagging; approval is earned, Findings table output format, Verdict — block or approve

### Community 80 - "Employee Permission Keys"
Cohesion: 0.50
Nodes (4): admin:view_employees and admin:manage_employees, No separate admin:correct_employees key, for now, sync-permissions backfills the super-admin role, Two admin pages: Employees and Users

### Community 81 - "Database Naming Rules"
Cohesion: 0.50
Nodes (4): Database Naming Rules, Primary and Foreign Key Naming, Snake Case Columns, Camel Case Fields, Soft Delete via Status Enum

### Community 82 - "Swimlanes and Edge Parenting"
Cohesion: 0.67
Nodes (3): Keep every edge parented to the root, Child geometry is relative to the lane, Swimlanes for actor boundaries

## Ambiguous Edges - Review These
- `120fps via CADisableMinimumFrameDurationOnPhone` → `Audit category 5 — Performance`  [AMBIGUOUS]
  .agents/skills/animate-expo/SKILL.md · relation: conceptually_related_to
- `Haptics rules (same frame, one per action, never the only feedback)` → `Accessibility (reduced motion, hover gating)`  [AMBIGUOUS]
  .agents/skills/animate-expo/SKILL.md · relation: conceptually_related_to
- `Correcting an entry versus recording a change` → `Remedial preference hierarchy`  [AMBIGUOUS]
  .claude/docs/features/employee-and-user-separation.md · relation: semantically_similar_to
- `PERMISSION_DEFS` → `EMS project context (CLAUDE.md)`  [AMBIGUOUS]
  CLAUDE.md · relation: conceptually_related_to

## Knowledge Gaps
- **322 isolated node(s):** `EmployeeRow`, `VerifyMessages`, `SuperAdmin`, `RoleTemplateName`, `EmployeeWriteValues` (+317 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `120fps via CADisableMinimumFrameDurationOnPhone` and `Audit category 5 — Performance`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Haptics rules (same frame, one per action, never the only feedback)` and `Accessibility (reduced motion, hover gating)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Correcting an entry versus recording a change` and `Remedial preference hierarchy`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `PERMISSION_DEFS` and `EMS project context (CLAUDE.md)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `UsersContext` connect `Users Context Methods` to `Org Unit Context Methods`, `User Row Types and Cells`, `Roles Context and Types`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `OrgUnit` connect `Org Unit Context Methods` to `Employee Table and Cells`, `Org Structure Context`, `Users Context Methods`, `Org Chart Layout`, `User Row Types and Cells`, `Employees Context Methods`, `Shared Type Definitions`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `can()` connect `Access Checks and Session Data` to `Permission Sync and Expansion`, `Org Structure Context`, `Org Chart Layout`, `Password Hashing and Strength`, `Employee Page Actions and Duplicates`, `Config Table and Org Unit Guard`, `Database Connection and Fuel Assets`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._