<!-- <script lang="ts" module>
  import type { PermissionKey } from "$lib/server/permissions";
  import {
    Building,
    FilePenLine,
    FlaskConical,
    House,
    IdCard,
    ShieldCheck,
    UsersRound,
  } from "@lucide/svelte/icons";

  import type { NavItem } from "./types";

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
    {
      name: "Signatories",
      url: "/admin/signatories",
      icon: FilePenLine,
      permission: "admin:view_signatories",
    },
    {
      name: "Test",
      url: "/admin/test",
      icon: FlaskConical,
      permission: "admin:view",
    },
  ] satisfies NavItem[];
</script> -->

<script lang="ts">
  import { page } from "$app/state";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { isActivePath } from "$lib/utils/is-active-path";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { FlaskConical } from "@lucide/svelte/icons";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import type { ComponentProps } from "svelte";
  import { administrationPages, reportPages } from "./admin-nav-items";
  import NavActiveIndicator from "./nav-active-indicator.svelte";
  import NavHeader from "./nav-header.svelte";
  import NavTheme from "./nav-theme.svelte";
  import NavUser from "./nav-user.svelte";
  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const gblCtx = getGlobalContext();

  const visibleAdminPages = $derived(
    administrationPages
      .filter((item) => gblCtx.can(item.permission))
      .map((item) => ({
        ...item,
        active: isActivePath(page.url.pathname, item.url),
      })),
  );

  const visibleAdminReportPages = $derived(
    reportPages
      .filter((item) => gblCtx.can(item.permission))
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => gblCtx.can(item.permission))
          .map((item) => ({
            ...item,
            active: isActivePath(page.url.pathname, item.url),
          })),
      }))
      .filter((group) => group.items.length > 0),
  );
</script>

<Sidebar.Root bind:ref variant="inset" collapsible="icon" {...restProps}>
  <NavHeader userType="admin" />

  <Sidebar.Content>
    <!-- ADMINISTRATION -->
    <Sidebar.Group>
      <Sidebar.GroupLabel class="h-6">Administration</Sidebar.GroupLabel>
      <Sidebar.Menu class="gap-0.5">
        {#each visibleAdminPages as item (item.name)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={item.active}
              tooltipContent={item.name}
              class="text-nowrap"
            >
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

    <!-- REPORTS -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Reports</Sidebar.GroupLabel>
      <Sidebar.Menu>
        {#each visibleAdminReportPages as item (item.title)}
          {@const hasActiveChild = item.items.find((i) => i.active)}

          <Collapsible.Root
            class="group/collapsible"
            open={hasActiveChild?.active}
          >
            {#snippet child({ props })}
              <Sidebar.MenuItem {...props}>
                <Collapsible.Trigger>
                  {#snippet child({ props })}
                    <Sidebar.MenuButton {...props} tooltipContent={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRightIcon
                        class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </Sidebar.MenuButton>
                  {/snippet}
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <Sidebar.MenuSub>
                    {#each item.items as subItem (subItem.name)}
                      <Sidebar.MenuSubItem>
                        <Sidebar.MenuSubButton
                          isActive={subItem.active}
                          class="overflow-visible text-nowrap"
                        >
                          {#snippet child({ props })}
                            <a href={subItem.url} {...props}>
                              <span>{subItem.name}</span>
                              <NavActiveIndicator active={subItem.active} />
                            </a>
                          {/snippet}
                        </Sidebar.MenuSubButton>
                      </Sidebar.MenuSubItem>
                    {/each}
                  </Sidebar.MenuSub>
                </Collapsible.Content>
              </Sidebar.MenuItem>
            {/snippet}
          </Collapsible.Root>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>

    <Sidebar.Group class="mt-auto gap-0.5">
      <Sidebar.Menu class="gap-0.5">
        <Sidebar.MenuItem>
          {@const isActive = isActivePath(page.url.pathname, "/admin/test")}
          <Sidebar.MenuButton
            {isActive}
            tooltipContent="Test"
            class="text-nowrap"
          >
            {#snippet child({ props })}
              <a
                href="/admin/test"
                aria-current={isActive ? "page" : undefined}
                {...props}
              >
                <FlaskConical />
                <span>Test</span>

                <NavActiveIndicator active={isActive} />
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>

      <Sidebar.Menu>
        <NavTheme />
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer>
    <NavUser user={gblCtx.user} />
  </Sidebar.Footer>
</Sidebar.Root>
