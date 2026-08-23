<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  /**
   * The pages this role can open, by name. More use to an admin picking a
   * role than a count of permission keys would be — "Fuel, Users" answers the
   * question "what does this role get you?" directly.
   */
  let { areas }: { areas: string[] } = $props();

  const VISIBLE = 3;

  const shown = $derived(areas.slice(0, VISIBLE));
  const hidden = $derived(areas.slice(VISIBLE));
</script>

{#if !areas.length}
  <span class="text-muted-foreground">No pages yet</span>
{:else}
  <div class="flex flex-wrap items-center gap-1">
    {#each shown as area (area)}
      <Badge variant="outline">{area}</Badge>
    {/each}

    {#if hidden.length}
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Badge {...props} variant="ghost" class="text-muted-foreground">
              +{hidden.length} more
            </Badge>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content class="max-w-64">
          {hidden.join(", ")}
        </Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
{/if}
