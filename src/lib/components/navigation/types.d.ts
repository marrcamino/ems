import type { PermissionKey } from "$lib/server/permissions";
type NavItem = {
  name: string;
  url: string;
  // This should be `Component` after @lucide/svelte updates types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  permission: PermissionKey;
};
