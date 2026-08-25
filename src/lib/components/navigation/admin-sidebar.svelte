<script lang="ts" module>
  import type { PermissionKey } from "$lib/server/permissions";
  import {
    Building,
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

  /**
   * Each page carries the `view` key that gates it, so the nav shows only
   * what the signed-in admin can actually open. Roles is the one that makes
   * this necessary rather than cosmetic: admin:view_roles is withheld from
   * every role but the super-admin one, so for an ordinary admin the link
   * would lead straight to a 403.
   */
  const pages = [
    {
      name: "Dashboard",
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
  ] satisfies NavItem[];
</script>

<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { isActivePath } from "$lib/utils/is-active-path";
  import type { ComponentProps } from "svelte";
  import { getGlobalContext } from "../../../routes/global-context.svelte";
  import NavActiveIndicator from "./nav-active-indicator.svelte";
  import NavHeader from "./nav-header.svelte";
  import NavTheme from "./nav-theme.svelte";
  import NavUser from "./nav-user.svelte";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const gblCtx = getGlobalContext();

  const visiblePages = $derived(
    pages
      .filter((item) => gblCtx.can(item.permission))
      .map((item) => ({
        ...item,
        active: isActivePath(page.url.pathname, item.url),
      })),
  );
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
  <NavHeader userType="admin" />

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel class="h-6">Administration</Sidebar.GroupLabel>
      <Sidebar.Menu class="gap-0.5">
        {#each visiblePages as item (item.name)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={item.active} tooltipContent={item.name}>
              {#snippet child({ props })}
                <a
                  href={item.url}
                  aria-current={item.active ? "page" : undefined}
                  {...props}
                >
                  <item.icon />
                  <span>{item.name}</span>

                  <NavActiveIndicator active={item.active} />
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>

    <Sidebar.Group class="mt-auto">
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <NavTheme />
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={gblCtx.user} />
  </Sidebar.Footer>
</Sidebar.Root>
