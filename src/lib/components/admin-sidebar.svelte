<script lang="ts" module>
  import agencyLogo from "$lib/assets/agency-logo.png";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import type { PermissionKey } from "$lib/server/permissions";
  import {
    House,
    LogOutIcon,
    UsersRound,
    Building,
    ShieldCheck,
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
  const data = {
    user: {
      name: "Admin",
      email: "admin@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    projects: [
      {
        name: "Dashboard",
        url: "/admin",
        icon: House,
        permission: "admin:view",
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
    ] satisfies NavItem[],
  };
</script>

<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { isActivePath } from "$lib/utils/is-active-path";
  import { getGlobalContext } from "../../routes/global-context.svelte";
  import type { ComponentProps } from "svelte";
  import NavUser from "./nav-user.svelte";
  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const sidebar = useSidebar();
  const gblCtx = getGlobalContext();

  const visibleProjects = $derived(
    data.projects
      .filter((item) => gblCtx.can(item.permission))
      .map((item) => ({
        ...item,
        active: isActivePath(page.url.pathname, item.url),
      })),
  );
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="/admin" {...props}>
              <div
                class="flex rounded-full size-8 items-center justify-center bg-muted text-sidebar-primary-foreground"
              >
                <img src={agencyLogo} alt="dfgfd" />
              </div>
              <div class="grid flex-1 text-start text-sm leading-tight">
                <span class="truncate font-medium">EMS</span>
                <span class="truncate text-xs">PENRO Dinagat Islands</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group class="group-data-[collapsible=icon]:hidden">
      <Sidebar.GroupLabel>Main</Sidebar.GroupLabel>
      <Sidebar.Menu>
        {#each visibleProjects as item (item.name)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={item.active}>
              {#snippet child({ props })}
                <a
                  href={item.url}
                  aria-current={item.active ? "page" : undefined}
                  {...props}
                >
                  <item.icon />
                  <span>{item.name}</span>
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
          <Sidebar.MenuItem>
            <Sidebar.MenuButton size="sm">
              {#snippet child({ props })}
                <!-- <a href="/logout" {...props}>
                  <LogOutIcon />
                  <span>Logout</span>
                </a> -->

                <form method="POST" action="/logout" use:enhance>
                  <a
                    href="/logout"
                    {...props}
                    onclick={(e) => {
                      e.preventDefault();
                      e.currentTarget.closest("form")?.requestSubmit();
                    }}
                  >
                    <LogOutIcon />
                    <span>Logout</span>
                  </a>
                </form>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={data.user} />
  </Sidebar.Footer>
</Sidebar.Root>
