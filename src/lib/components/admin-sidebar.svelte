<script lang="ts" module>
  import agencyLogo from "$lib/assets/agency-logo.png";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import { House, LogOutIcon, UsersRound } from "@lucide/svelte/icons";

  const data = {
    user: {
      name: "Admin",
      email: "admin@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    projects: [
      {
        name: "Home",
        url: "/",
        icon: House,
      },

      {
        name: "Users",
        url: "/admin/users",
        icon: UsersRound,
      },
    ],
  };
</script>

<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import NavUser from "./nav-user.svelte";
  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const sidebar = useSidebar();
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
        {#each data.projects as item (item.name)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href={item.url} {...props}>
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
