<script lang="ts">
  import { cn, type WithoutChild } from "$lib/utils/index.js";
  import { ChevronDownIcon, Lock } from "@lucide/svelte/icons";
  import { Select as SelectPrimitive } from "bits-ui";
  import { untrack } from "svelte";

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = "default",
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: "sm" | "default";
  } = $props();

  let showLock = $derived(restProps.disabled ? "" : null);
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "gap-1.5 rounded-lg relative border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50  *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className,
  )}
  {...restProps}
>
  <span class="min-w-0 flex-1 truncate text-left">
    {@render children?.()}
  </span>
  <Lock
    data-lock={showLock}
    class="size-4 text-yellow-600/80 opacity-0 data-lock:opacity-100 pointer-events-none absolute right-1.5"
  />
  <ChevronDownIcon
    data-lock={showLock}
    class="size-4 text-muted-foreground data-lock:opacity-0 pointer-events-none"
  />
</SelectPrimitive.Trigger>
