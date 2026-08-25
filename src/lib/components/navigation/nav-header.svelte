<script lang="ts" module>
  import agencyLogo from "$lib/assets/agency-logo.png";
  import agencyLogoDark from "$lib/assets/agency-logo-dark.png";
  import {
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
  } from "$lib/components/ui/sidebar/index.js";
</script>

<script lang="ts">
  interface Props {
    userType: "admin" | "staff";
  }

  let { userType }: Props = $props();
</script>

<SidebarHeader>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" class="hover:bg-transparent">
        {#snippet child({ props })}
          <a href={userType === "admin" ? "/admin" : "/"} {...props}>
            <div
              class="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
            >
              <img
                src={agencyLogoDark}
                alt="Agency logo"
                class="absolute size-full object-contain opacity-100 dark:hidden"
              />
              <img
                src={agencyLogo}
                alt=""
                aria-hidden="true"
                class="absolute size-full object-contain hidden dark:block"
              />
            </div>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">EMS</span>
              <span class="truncate text-xs text-muted-foreground">
                PENRO Dinagat Islands
              </span>
            </div>
          </a>
        {/snippet}
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarHeader>
