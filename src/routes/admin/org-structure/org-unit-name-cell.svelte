<script lang="ts">
  import { parenthesize } from "@/utils";
  import type { Row } from "@tanstack/table-core";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { features } from "./columns.js";
  import type { TreeNode } from "./context.svelte.js";

  let { row }: { row: Row<typeof features, TreeNode> } = $props();

  const unit = $derived(row.original);
  const canExpand = $derived(row.getCanExpand());
  const isExpanded = $derived(row.getIsExpanded());
</script>

<!-- The indent is what carries the hierarchy, so it is driven by the row's own
     depth rather than by the level: a section shown on its own after a search
     still lines up under whatever ancestors came with it. -->
<div
  class="flex items-center gap-1"
  style="padding-inline-start: {row.depth * 1.25}rem"
>
  {#if canExpand}
    <button
      type="button"
      onclick={row.getToggleExpandedHandler()}
      class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={isExpanded
        ? `Hide what is under ${unit.orgUnitName}`
        : `Show what is under ${unit.orgUnitName}`}
      aria-expanded={isExpanded}
    >
      <ChevronRight
        class="size-4 transition-transform {isExpanded ? 'rotate-90' : ''}"
      />
    </button>
  {:else}
    <span class="size-5 shrink-0"></span>
  {/if}

  <span class="font-medium" class:text-muted-foreground={unit.status === "inactive"}>
    {unit.orgUnitName}
    {#if unit.abbr}
      <span class="font-normal text-muted-foreground">
        {parenthesize(unit.abbr)}
      </span>
    {/if}
  </span>
</div>
