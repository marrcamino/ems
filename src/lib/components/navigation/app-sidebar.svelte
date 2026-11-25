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

        {#if item.action && item.opens && (!item.action.permission || gblCtx.can(item.action.permission))}
          {@const action = item.action}
          <Sidebar.MenuAction>
            {#snippet child({ props })}
              <a
                href={action.url}
                aria-label={action.name}
                title={action.name}
                {...props}
              >
                <action.icon />
              </a>
            {/snippet}
          </Sidebar.MenuAction>
        {/if}

        {#if item.children.length}
          <div
            class="grid grid-rows-[1fr] transition-[grid-template-rows,opacity,visibility] duration-200 ease-linear group-data-[collapsible=icon]:invisible group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none"
          >
            <div class="min-h-0 overflow-hidden">
              <Sidebar.MenuSub
                class="border-l-0 group-data-[collapsible=icon]:flex"
              >
                {#each item.children as subItem (subItem.url)}
                  <!--
                    The tree line. `before` runs down from the row above and
                    curves into this row; `after` runs the whole row's height
                    on to the next row, so the last row ends on its curve. The
                    two overlap where they meet, so the colour is solid: a
                    see-through one would show the overlap as a brighter patch.
                  -->
                  <Sidebar.MenuSubItem
                    class="[--tree-line:color-mix(in_oklab,var(--sidebar-foreground)_20%,var(--sidebar))] before:pointer-events-none before:absolute before:-top-1 before:-left-2.5 before:h-[calc(50%+0.25rem)] before:w-1.5 before:rounded-bl-md before:border-b before:border-l before:border-(--tree-line) first:before:-top-0.5 first:before:h-[calc(50%+0.125rem)] not-last:after:pointer-events-none not-last:after:absolute not-last:after:-top-1 not-last:after:bottom-0 not-last:after:-left-2.5 not-last:after:border-l not-last:after:border-(--tree-line) first:after:-top-0.5"
                  >
                    <Sidebar.MenuSubButton
                      isActive={subItem.active}
                      class="group/menu-sub-button overflow-visible text-nowrap group-data-[collapsible=icon]:flex"
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
            </div>
          </div>
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
