<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { EmployeeRow } from "./context.svelte.js";
  import { TENURE_STATUS_LABELS, TENURE_STATUS_SHORT } from "./labels.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const tenure = $derived(employee.tenureStatus);
</script>

{#if tenure}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <Badge {...props} variant="outline">{TENURE_STATUS_SHORT[tenure]}</Badge>
      {/snippet}
    </Tooltip.Trigger>
    <!-- COS and Job Order are shortened in the table; the full words are here
         so nobody has to already know what the initials stand for. -->
    <Tooltip.Content>{TENURE_STATUS_LABELS[tenure]}</Tooltip.Content>
  </Tooltip.Root>
{:else}
  <span class="text-sm text-muted-foreground">Not set</span>
{/if}
