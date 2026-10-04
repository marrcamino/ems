<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cn } from "$lib/utils/index.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
  bind:ref
  data-slot="tabs-trigger"
  class={cn(
    "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg:not([class*='size-'])]:size-4 relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/60 transition-[color,box-shadow] group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
    // The active background (default variant) and underline (line variant)
    // are drawn by the sliding indicator in tabs-list.svelte, not here.
    "data-[state=active]:text-foreground dark:data-[state=active]:text-foreground",
    "group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:data-[state=active]:text-primary",
    className,
  )}
  {...restProps}
/>
