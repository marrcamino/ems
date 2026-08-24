<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Lock, ShieldCheck, SquarePen } from "@lucide/svelte/icons";
  import { getUsersContext, type UserRow } from "./context.svelte.js";
  import { roleAreaLabels } from "./filters.js";

  let { user }: { user: UserRow } = $props();

  const ctx = getUsersContext();

  const role = $derived(ctx.roleByPk(user.roleFk));
  const kind = $derived(ctx.kindOfRole(user.roleFk));
  const isSuperAdmin = $derived(ctx.isSuperAdminRole(user.roleFk));

  /**
   * Whoever manages users cannot open the Roles page, so a role name on its
   * own tells them nothing. The tooltip lists the pages it opens.
   */
  const areas = $derived(roleAreaLabels(role, ctx.permissionDefs));
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <span {...props} class="flex items-center gap-1.5 w-max">
        <Badge variant="outline">
          {#if isSuperAdmin}
            <Lock />
          {:else if kind === "admin"}
            <ShieldCheck />
          {:else if kind === "staff"}
            <SquarePen />
          {/if}
          {user.roleName}
        </Badge>
        {#if role?.status === "inactive"}
          <span class="text-xs text-muted-foreground">(inactive)</span>
        {/if}
      </span>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content class="max-w-64 flex flex-col items-start gap-0">
    {#if areas.length}
      <p class="font-semibold">Can open</p>
      <p>{areas.join(", ")}</p>
    {:else}
      <p>This role doesn't open any pages yet.</p>
    {/if}
  </Tooltip.Content>
</Tooltip.Root>
