<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";

  interface Props {
    value?: unknown;
    class?: string;
    children?: Snippet;
  }

  let { value, class: className, children }: Props = $props();
</script>

<div class={cn(className)}>
  {#if children}
    {@render children()}
  {:else}
    {value}
  {/if}
</div>
