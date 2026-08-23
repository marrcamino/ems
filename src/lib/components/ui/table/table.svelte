<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils/index.js";
  import type { ClassValue, HTMLTableAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    containerClass,
    ...restProps
  }: WithElementRef<HTMLTableAttributes> & {
    containerClass?: ClassValue;
  } = $props();
</script>

<div
  data-slot="table-container"
  class={cn("relative w-full overflow-x-auto", containerClass)}
>
  <table
    bind:this={ref}
    data-slot="table"
    class={cn("w-full caption-bottom text-sm", className)}
    {...restProps}
  >
    {@render children?.()}
  </table>
</div>
