<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils/index.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<main
  bind:this={ref}
  data-slot="sidebar-inset"
  class={cn(
    "bg-background min-w-0 relative flex w-full flex-1 flex-col border-l",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</main>
