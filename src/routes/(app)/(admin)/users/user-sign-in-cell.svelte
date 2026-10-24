<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { UserRow } from "./context.svelte.js";
  import { formatDateTime, formatWhen } from "./format.js";

  let { user }: { user: UserRow } = $props();
</script>

{#if user.lastLoginAt}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span {...props} class="text-sm">{formatWhen(user.lastLoginAt)}</span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>{formatDateTime(user.lastLoginAt)}</Tooltip.Content>
  </Tooltip.Root>
{:else}
  <span class="text-sm text-muted-foreground">Never</span>
{/if}
