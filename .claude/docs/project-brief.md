# Project Brief: EMS (Environmental Management System)

## Client / Organization

DENR-PENRO Dinagat Islands (Department of Environment and Natural Resources — Provincial Environment and Natural Resources Office)

## Goal

Build an Environmental Management System (EMS) to track and monitor:

- Fuel consumption
- Electricity consumption
- Water consumption
- Paper consumption
- ESWM (Ecological Solid Waste Management) compliance
- GHG (Greenhouse Gas) compliance

The system supports compliance with **ISO 14001:2015** (Environmental Management Systems standard).

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

Full RBAC design: see `RBAC-design-locked-decisions.md`.
