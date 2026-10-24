import type { PermissionKey } from "$lib/server/permissions";
import {
  Building,
  FilePenLine,
  Fuel,
  House,
  IdCard,
  ShieldCheck,
  UsersRound,
} from "@lucide/svelte/icons";

export type NavPage = {
  name: string;
  url: string;
  // This should be `Component` after @lucide/svelte updates types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  /** The `view` key that opens the page. Left off for a page everyone opens. */
  permission?: PermissionKey;
  children?: NavPage[];
};

/**
 * One sidebar for everyone. Each page carries the key that gates it, so the
 * sidebar shows only what the signed-in person can actually open — the Roles
 * link, for one, would otherwise lead every role but the super-admin straight
 * to a 403. The layout is the one decided on 24 October 2026
 * (.claude/docs/decisions/2026-10-24-shared-work-pages-and-office-scoped-permissions.md).
 */
export const workPages = [
  {
    name: "Dashboard",
    url: "/",
    icon: House,
  },
  {
    name: "Fuel",
    url: "/fuel",
    icon: Fuel,
    permission: "fuel:view",
    children: [
      {
        name: "Assets",
        url: "/fuel/assets",
        permission: "assets:view",
      },
      {
        name: "Purchase Orders",
        url: "/fuel/purchase-orders",
        permission: "purchase_orders:view",
      },
    ],
  },
] satisfies NavPage[];

/** The pages for running the system, in the `(admin)` route group. */
export const adminPages = [
  {
    name: "Users",
    url: "/users",
    icon: UsersRound,
    permission: "users:view",
  },
  {
    name: "Employees",
    url: "/employees",
    icon: IdCard,
    permission: "employees:view",
  },
  {
    name: "Org Structure",
    url: "/org-structure",
    icon: Building,
    permission: "org_units:view",
  },
  {
    name: "Signatories",
    url: "/signatories",
    icon: FilePenLine,
    permission: "signatories:view",
  },
  {
    name: "Roles",
    url: "/roles",
    icon: ShieldCheck,
    permission: "roles:view",
  },
] satisfies NavPage[];
