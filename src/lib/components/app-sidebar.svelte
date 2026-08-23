<script lang="ts" module>
  import agencyLogo from "$lib/assets/agency-logo.png";
  import type { PermissionKey } from "$lib/server/permissions";
  import { LogOutIcon } from "@lucide/svelte/icons";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";

  export type NavSubItem = {
    title: string;
    url: string;
    permission: PermissionKey;
  };

  export type NavItem = {
    title: string;
    url: string;
    // This should be `Component` after @lucide/svelte updates types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    defaultOpen?: boolean;
    items?: NavSubItem[];
  };

  /**
   * Each page carries the `view` key that gates it, so the nav shows only
   * what the signed-in user can actually open. A section whose pages have
   * all been filtered away disappears along with its heading.
   */
  const data = {
    user: {
      name: "User",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "Main",
        url: "/",
        icon: SquareTerminalIcon,
        defaultOpen: true,
        items: [
          {
            title: "Fuel",
            url: "/fuel",
            permission: "fuel:view",
          },
          {
            title: "ESWM",
            url: "/eswm",
            permission: "eswm:view",
          },
          {
            title: "Air Travel",
            url: "/air-travel",
            permission: "air_travel:view",
          },
        ],
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
  import NavMain from "./nav-main.svelte";
  import NavUser from "./nav-user.svelte";
  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const gblCtx = getGlobalContext();

  const visibleNavMain = $derived(
    data.navMain
      .map((section) => ({
        ...section,
        active: isActivePath(page.url.pathname, section.url),
        items: section.items
          .filter((item) => gblCtx.can(item.permission))
          .map((item) => ({
            ...item,
            active: isActivePath(page.url.pathname, item.url),
          })),
      }))
      .filter((section) => section.items.length > 0),
  );
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="/" {...props}>
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
    <NavMain items={visibleNavMain} />
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
