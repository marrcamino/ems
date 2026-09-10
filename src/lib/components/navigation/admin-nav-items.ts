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

type NavItem = {
  name: string;
  url: string;
  // This should be `Component` after @lucide/svelte updates types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  permission: PermissionKey;
};

type ReportItems = {
  title: string;
  icon: any;
  permission: PermissionKey;
  items: Omit<NavItem, "icon">[];
};

/**
 * Each page carries the `view` key that gates it, so the nav shows only
 * what the signed-in admin can actually open. Roles is the one that makes
 * this necessary rather than cosmetic: admin:view_roles is withheld from
 * every role but the super-admin one, so for an ordinary admin the link
 * would lead straight to a 403.
 */
export const administrationPages = [
  {
    name: "Home",
    url: "/admin",
    icon: House,
    permission: "admin:view",
  },
  {
    name: "Employees",
    url: "/admin/employees",
    icon: IdCard,
    permission: "admin:view_employees",
  },
  {
    name: "Users",
    url: "/admin/users",
    icon: UsersRound,
    permission: "admin:view_users",
  },
  {
    name: "Roles",
    url: "/admin/roles",
    icon: ShieldCheck,
    permission: "admin:view_roles",
  },
  {
    name: "Organizational Structure",
    url: "/admin/org-structure",
    icon: Building,
    permission: "admin:view_org_units",
  },
  {
    name: "Signatories",
    url: "/admin/signatories",
    icon: FilePenLine,
    permission: "admin:view_signatories",
  },
] satisfies NavItem[];

export const reportPages = [
  {
    title: "Fuel",
    icon: Fuel,
    permission: "admin:view_fuel",
    items: [
      {
        name: "Dashboard",
        url: "/admin/fuel",
        permission: "admin:view_fuel",
      },
      {
        name: "Assets",
        url: "/admin/fuel/assets",
        permission: "admin:view_fuel",
      },
    ],
  },
] satisfies ReportItems[];
