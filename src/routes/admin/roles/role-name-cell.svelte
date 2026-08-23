<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Lock } from "@lucide/svelte/icons";
  import { getRolesContext, type RoleRow } from "./context.svelte.js";

  let { role }: { role: RoleRow } = $props();

  const ctx = getRolesContext();
  const isFrozen = $derived(ctx.isSuperAdminRole(role));
</script>

<div class="flex items-center gap-2">
  <span class="font-medium">{role.roleName}</span>

  {#if isFrozen}
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Badge {...props} variant="secondary"><Lock /> Locked</Badge>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content class="max-w-64">
        The only role that can manage roles. It can't be renamed, deactivated,
        or deleted, and its access can't be reduced.
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</div>
