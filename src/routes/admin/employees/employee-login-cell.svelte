<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import type { EmployeeRow } from "./context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const gblCtx = getGlobalContext();

  // The Users page is where an account is made, so the link is only worth
  // offering to an admin who can actually open it.
  const canOpenUsers = $derived(gblCtx.can("admin:view_users"));
</script>

{#if employee.username}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span {...props} class="text-sm">{employee.username}</span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      This person signs in as "{employee.username}". Accounts are managed on the
      Users page.
    </Tooltip.Content>
  </Tooltip.Root>
{:else if canOpenUsers}
  <a href="/admin/users" class="w-max">
    <Badge variant="ghost" class="text-muted-foreground hover:text-foreground">
      No account yet
    </Badge>
  </a>
{:else}
  <span class="text-sm text-muted-foreground">No account yet</span>
{/if}
