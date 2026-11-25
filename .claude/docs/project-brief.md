# Project Brief: EMS (Environmental Management System)

## Client / Organization

DENR-PENRO Dinagat Islands (Department of Environment and Natural Resources — Provincial Environment and Natural Resources Office)

## Goal

Build an Environmental Management System (EMS) to track and monitor:

- Fuel consumption
- Electricity consumption
- Air travel of employees
- Water consumption
- Paper consumption
- ESWM (Ecological Solid Waste Management): the waste collected, for example the kilos of garbage collected in sacks at a cleanup drive

GHG (greenhouse gas) is not an area that anyone enters data into. It is a report built from fuel, electricity, and air travel (see "The process at a glance").

The system supports compliance with **ISO 14001:2015** (Environmental Management Systems standard).

## The process at a glance

This comes from the owner's flowchart of 25 November 2026. The flowchart gives the big picture of who enters which data and who receives it. It is not the design of the system: each feature's screens and steps are decided while it is built and recorded in its own doc in `.claude/docs/features/`, and they can differ from the flowchart. Fuel, for example, already has assets, control numbers, and form numbers that the flowchart does not show.

**Who enters the data**

1. **Fuel:** staff request fuel, and GSU checks and approves the requests. GSU also enters the vehicles and the fuel procured. Details: `.claude/docs/features/fuel-purchase-orders.md`.
2. **Electricity:** GSU enters the office's electricity use each month.
3. **Air travel:** the Finance office enters the employees' air travel.
4. **Paper:** each office enters its monthly paper use, and GSU enters the bond paper procured and reviews every office's figures together. Details: `.claude/docs/features/paper-consumption.md`.
5. **Water:** GSU enters the monthly water use.
6. **ESWM:** the ESWM Focal Person enters the waste collected each month.

**Who receives it**

7. **The GHG Focal Person** receives fuel, electricity, and air travel. They check the combined data, generate the GHG emission report, review and verify it, and print it.
8. **The EMS Focal Person** receives paper, water, and ESWM, and also the data that the GHG Focal Person checked. They check it all, generate the EMS report, review and verify it, and print it.

**Only fuel and paper pass through GSU first** (told by the owner, 25 November 2026). In fuel, GSU checks and approves each request; in paper, GSU receives each office's monthly report and reviews them together. Electricity, water, air travel, and ESWM are only entered and submitted, and go straight to their focal person: nobody receives them or marks them complete in between.

## Tech Stack

- **Framework:** SvelteKit
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn-svelte
- **Database:** MySQL (self-hosted, on-premise, same server as the app)
- **ORM:** Drizzle ORM

## Deployment

- Runs **fully offline** — no internet dependency for the app itself
- Server, switch, and core ICT infrastructure live in the ICT unit office
- Network from there is **mixed**: other offices (division/section) connect via a combination of wired LAN and WiFi access points — roughly **40% wired LAN, 60% WiFi**
- Accessible only within the office network — no remote/off-site access
- Implications:
  - Use `adapter-node` (not `adapter-auto`), no CDN-hosted assets/fonts/scripts, no OAuth/third-party login (session-based auth only)
  - **Do not assume wired-grade connection stability.** With ~60% of clients on WiFi, expect occasional drops/latency spikes — design session handling, form submissions, and loading states to fail gracefully and recover, not assume a rock-solid link

## Users & Scale

- ~5–10 concurrent users, <20 total users
- Single office (PENRO Dinagat Islands) — no multi-office/branch support needed for now
- Data expected to grow over years (structured records); file attachments/uploads not planned for now

Access is role-based — one role per user, no per-user overrides. Current roles are Admin, GSU (2+ staff, approves other roles' requests), and per-section Encoder/Focal roles (GHG Focal is one person today). Exact section-to-role mapping is **TBD**.

Approvers may approve their own submissions — this matches actual agency practice for GSU and is deliberate, not an oversight.

**Officers-in-charge.** When an officer is away, an officer-in-charge always takes over (told by the owner, 24 October 2026). EMS has no feature for it and none is wanted: nobody would keep such a setting up to date, and the office does not mind someone else using the absent officer's account. So a record of who did what names the account, which is not always the person at the keyboard.

**Fuel is the only feature with an approval step.** A staff member requests a fuel withdrawal slip and GSU approves it. The approval itself is physical — a GSU person signs the printed slip — and afterwards someone marks the slip as approved in the system. So the system records an approval that already happened on paper; it is not where the approving takes place. The other tracked areas (electricity, water, paper, ESWM, GHG) are recorded without anyone approving them.

Full RBAC design: see `.claude/skills/rbac-design/SKILL.md`; the decision behind its 24 October 2026 rules is `.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md`.
