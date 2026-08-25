<script lang="ts" module>
  import type { PermissionKey } from "$lib/server/permissions";
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
    items: NavSubItem[];
  };

  /**
   * Each page carries the `view` key that gates it, so the nav shows only
   * what the signed-in user can actually open. A section whose pages have
   * all been filtered away disappears along with its heading.
   */
  const navMain = [
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
  ] satisfies NavItem[];
</script>

<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { isActivePath } from "$lib/utils/is-active-path";
  import type { ComponentProps } from "svelte";
  import { getGlobalContext } from "../../../routes/global-context.svelte";
  import NavHeader from "./nav-header.svelte";
  import NavMain from "./nav-main.svelte";
  import NavTheme from "./nav-theme.svelte";
  import NavUser from "./nav-user.svelte";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const gblCtx = getGlobalContext();

  const visibleNavMain = $derived(
    navMain
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
  <NavHeader userType="staff" />

  <Sidebar.Content>
    <NavMain items={visibleNavMain} />
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
