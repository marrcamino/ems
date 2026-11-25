import type { PermissionKey } from "$lib/server/permissions";
import {
  Building,
  Droplets,
  FileDigit,
  StickyNotes,
  FilePenLine,
  FlaskConical,
  Fuel,
  House,
  IdCard,
  Plane,
  Plus,
  Recycle,
  ShieldCheck,
  Store,
  UsersRound,
  Zap,
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
  /**
   * A small button on the right of the page's row, for the page's most
   * common task. Shown to whoever can open the page and holds its key.
   */
  action?: {
    name: string;
    url: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    /** The key that the task needs, besides the page's own. */
    permission?: PermissionKey;
  };
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
    name: "Suppliers",
    url: "/suppliers",
    icon: Store,
    permission: "purchase_orders:view",
  },
  {
    name: "RIS Numbers",
    url: "/ris-numbers",
    icon: FileDigit,
    permission: "ris_numbers:view",
  },
  {
    name: "Fuel",
    url: "/fuel",
    icon: Fuel,
    permission: "fuel:view",
    action: {
      name: "New withdrawal",
      url: "/fuel?new=withdrawal",
      icon: Plus,
      permission: "fuel:record",
    },
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
  {
    name: "Paper",
    url: "/paper",
    icon: StickyNotes,
    permission: "paper:view",
    children: [
      {
        name: "Purchase Orders",
        url: "/paper/purchase-orders",
        permission: "purchase_orders:view",
      },
      {
        name: "Submitted Reports",
        url: "/paper/submitted",
        permission: "paper:receive",
      },
    ],
  },
  {
    name: "ESWM",
    url: "/eswm",
    icon: Recycle,
    permission: "eswm:view",
    children: [
      {
        name: "Summary",
        url: "/eswm/summary",
        permission: "eswm:view",
      },
    ],
  },
  {
    name: "Water",
    url: "/water",
    icon: Droplets,
    permission: "water:view",
    children: [
      {
        name: "Summary",
        url: "/water/summary",
        permission: "water:view",
      },
    ],
  },
  {
    name: "Electricity",
    url: "/electricity",
    icon: Zap,
    permission: "electricity:view",
    children: [
      {
        name: "Summary",
        url: "/electricity/summary",
        permission: "electricity:view",
      },
      {
        name: "Buildings",
        url: "/electricity/buildings",
        permission: "electricity:view",
      },
    ],
  },
  {
    name: "Air Travel",
    url: "/air-travel",
    icon: Plane,
    permission: "air_travel:view",
    children: [
      {
        name: "Summary",
        url: "/air-travel/summary",
        permission: "air_travel:view",
      },
      {
        name: "Routes",
        url: "/air-travel/routes",
        permission: "air_travel:view",
      },
    ],
  },
] satisfies NavPage[];

/** The pages for running the system, in the `(admin)` route group. */
export const adminPages = [
  {
    name: "Org Structure",
    url: "/org-structure",
    icon: Building,
    permission: "org_units:view",
  },
  {
    name: "Roles",
    url: "/roles",
    icon: ShieldCheck,
    permission: "roles:view",
  },
  {
    name: "Employees",
    url: "/employees",
    icon: IdCard,
    permission: "employees:view",
  },
  {
    name: "Users",
    url: "/users",
    icon: UsersRound,
    permission: "users:view",
  },
  {
    name: "Signatories",
    url: "/signatories",
    icon: FilePenLine,
    permission: "signatories:view",
  },
  {
    name: "Test",
    url: "/test",
    icon: FlaskConical,
    permission: "roles:view",
  },
] satisfies NavPage[];
