<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { isActivePath } from "$lib/utils/is-active-path";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import type { ComponentProps } from "svelte";
  import NavActiveIndicator from "./nav-active-indicator.svelte";
  import NavHeader from "./nav-header.svelte";
  import { adminPages, workPages, type NavPage } from "./nav-items";
  import NavTheme from "./nav-theme.svelte";
  import NavUser from "./nav-user.svelte";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const gblCtx = getGlobalContext();

  type VisiblePage = Omit<NavPage, "children"> & {
    /** Whether the person holds the page's own key, so the name is a link. */
    opens: boolean;
    active: boolean;
    children: VisiblePage[];
  };

  /**
   * A page shows when the person can open it. A parent such as Fuel also
   * shows when they can open any page under it, as a plain heading rather
   * than a link, so that a role holding Assets but not Fuel still finds its
   * page.
   */
  function visible(pages: NavPage[]): VisiblePage[] {
    return pages.flatMap((item) => {
      const children = visible(item.children ?? []);
      const opens = !item.permission || gblCtx.can(item.permission);
      if (!opens && children.length === 0) return [];

      return [
        {
          ...item,
          opens,
          children,
          active: opens && isActivePath(page.url.pathname, item.url),
        },
      ];
    });
  }

  const visibleWorkPages = $derived(visible(workPages));
  const visibleAdminPages = $derived(visible(adminPages));
</script>

{#snippet menu(items: VisiblePage[])}
  <Sidebar.Menu class="gap-0.5">
    {#each items as item (item.url)}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          isActive={item.active}
          tooltipContent={item.name}
          class="text-nowrap"
        >
          {#snippet child({ props })}
            {#if item.opens}
              <a
                href={item.url}
                aria-current={item.active ? "page" : undefined}
                {...props}
              >
                <item.icon />
                <span>{item.name}</span>
                <NavActiveIndicator active={item.active} />
              </a>
            {:else}
              <span {...props}>
                <item.icon />
                <span>{item.name}</span>
              </span>
            {/if}
          {/snippet}
        </Sidebar.MenuButton>

        {#if item.children.length}
          <Sidebar.MenuSub>
            {#each item.children as subItem (subItem.url)}
              <Sidebar.MenuSubItem>
                <Sidebar.MenuSubButton
                  isActive={subItem.active}
                  class="overflow-visible text-nowrap"
                >
                  {#snippet child({ props })}
                    <a
                      href={subItem.url}
                      aria-current={subItem.active ? "page" : undefined}
                      {...props}
                    >
                      <span>{subItem.name}</span>
                      <NavActiveIndicator active={subItem.active} />
                    </a>
                  {/snippet}
                </Sidebar.MenuSubButton>
              </Sidebar.MenuSubItem>
            {/each}
          </Sidebar.MenuSub>
        {/if}
      </Sidebar.MenuItem>
    {/each}
  </Sidebar.Menu>
{/snippet}

<Sidebar.Root bind:ref variant="inset" collapsible="icon" {...restProps}>
  <NavHeader />

  <Sidebar.Content>
    <Sidebar.Group>
      {@render menu(visibleWorkPages)}
    </Sidebar.Group>

    {#if visibleAdminPages.length}
      <Sidebar.Separator />
      <Sidebar.Group>
        {@render menu(visibleAdminPages)}
      </Sidebar.Group>
    {/if}

    <Sidebar.Group class="mt-auto">
      <Sidebar.Menu>
        <NavTheme />
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer>
    <NavUser user={gblCtx.user} />
  </Sidebar.Footer>
</Sidebar.Root>
