<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import type { SessionUser } from "$lib/types";
  import { fullName, initials } from "$lib/utils";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import LogOutIcon from "@lucide/svelte/icons/log-out";

  let { user }: { user: SessionUser } = $props();

  const sidebar = useSidebar();

  const name = $derived(fullName(user));

  /**
   * There are no email addresses in this system, so the second line is the
   * person's position. Accounts created before a position was filled in fall
   * back to the sign-in name, which is always present.
   */
  const subtitle = $derived(user.positionTitle || user.username);

  // Logging out has to be a POST so the session row is actually invalidated,
  // so the menu item submits this form rather than following a link.
  let logoutForm = $state<HTMLFormElement | null>(null);
</script>

<form
  bind:this={logoutForm}
  method="POST"
  action="/logout"
  class="hidden"
  use:enhance
></form>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-lg"
          >
            <Avatar.Root class="size-8 rounded-full">
              <Avatar.Fallback class="rounded-full text-xs">
                {initials(user)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div
              class="grid flex-1 rounded-full text-start text-sm leading-tight"
            >
              <span class="truncate font-medium">{name}</span>
              <span class="truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            </div>
            <ChevronsUpDownIcon class="ms-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar.Root class="size-8">
              <Avatar.Fallback class="text-xs">
                {initials(user)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{name}</span>
              <span class="truncate text-xs text-muted-foreground">
                Signed in as {user.username}
              </span>
            </div>
          </div>
        </DropdownMenu.Label>
        {#if user.positionTitle}
          <p class="px-2 pb-1 text-xs text-muted-foreground">
            {user.positionTitle}
          </p>
        {/if}
        <DropdownMenu.Separator />
        <DropdownMenu.Item>
          {#snippet child({ props })}
            <a href="/change-password" {...props}>
              <KeyRoundIcon />
              Change password
            </a>
          {/snippet}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          variant="destructive"
          onSelect={() => logoutForm?.requestSubmit()}
        >
          <LogOutIcon />
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
