<script lang="ts" module>
  import agencyLogo from "$lib/assets/agency-logo.png";
  import { LogOutIcon } from "@lucide/svelte/icons";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import BotIcon from "@lucide/svelte/icons/bot";
  import ChartPieIcon from "@lucide/svelte/icons/chart-pie";
  import FrameIcon from "@lucide/svelte/icons/frame";
  import MapIcon from "@lucide/svelte/icons/map";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
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
        isActive: true,
        items: [
          {
            title: "Admin",
            url: "/admin",
          },
          {
            title: "Fuel",
            url: "/fuel",
          },
          {
            title: "Settings",
            url: "#",
          },
        ],
      },
      {
        title: "Models",
        url: "#",
        icon: BotIcon,
        items: [
          {
            title: "Genesis",
            url: "#",
          },
          {
            title: "Explorer",
            url: "#",
          },
          {
            title: "Quantum",
            url: "#",
          },
        ],
      },
      {
        title: "Documentation",
        url: "#",
        icon: BookOpenIcon,
        items: [
          {
            title: "Introduction",
            url: "#",
          },
          {
            title: "Get Started",
            url: "#",
          },
          {
            title: "Tutorials",
            url: "#",
          },
          {
            title: "Changelog",
            url: "#",
          },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2Icon,
        items: [
          {
            title: "General",
            url: "#",
          },
          {
            title: "Team",
            url: "#",
          },
          {
            title: "Billing",
            url: "#",
          },
          {
            title: "Limits",
            url: "#",
          },
        ],
      },
    ],

    projects: [
      {
        name: "Design Engineering",
        url: "#",
        icon: FrameIcon,
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: ChartPieIcon,
      },
      {
        name: "Travel",
        url: "#",
        icon: MapIcon,
      },
    ],
  };
</script>

<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import NavMain from "./nav-main.svelte";
  import NavProjects from "./nav-projects.svelte";
  import NavUser from "./nav-user.svelte";
  import { enhance } from "$app/forms";
  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();
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
    <NavMain items={data.navMain} />
    <NavProjects projects={data.projects} />
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
