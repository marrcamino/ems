<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import { cn } from "$lib/utils/index.js";

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = "default",
    unavailable,
    children,
    onclick,
    onSelect,
    closeOnSelect,
    ...restProps
  }: DropdownMenuPrimitive.ItemProps & {
    inset?: boolean;
    variant?: "default" | "destructive";
    /**
     * Shows the item as unavailable, with this reason under its label. Unlike
     * `disabled`, the item stays reachable by mouse and arrow keys, so the
     * reason can be read; selecting it does nothing and keeps the menu open.
     * Use `disabled` only when the cause is already visible on the screen.
     */
    unavailable?: string;
  } = $props();

  const reasonId = $props.id();

  const itemClass = $derived(
    cn(
      "gap-1.5 rounded-md px-1.5 py-1 text-sm focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    ),
  );
</script>

{#if unavailable}
  <DropdownMenuPrimitive.Item
    bind:ref
    data-slot="dropdown-menu-item"
    data-inset={inset}
    data-variant={variant}
    class={itemClass}
    closeOnSelect={false}
    {...restProps}
  >
    {#snippet child({ props })}
      <!--
        bits-ui writes aria-disabled="false" on any item that is not disabled,
        so it is set here, after its props, for screen readers to announce.
      -->
      <div {...props} aria-disabled="true" aria-describedby={reasonId}>
        <div class="flex flex-col gap-0.5">
          <span class="flex items-center gap-1.5 opacity-50">
            {@render children?.()}
          </span>
          <span
            id={reasonId}
            class="max-w-60 text-xs whitespace-normal text-muted-foreground"
          >
            {unavailable}
          </span>
        </div>
      </div>
    {/snippet}
  </DropdownMenuPrimitive.Item>
{:else}
  <DropdownMenuPrimitive.Item
    bind:ref
    data-slot="dropdown-menu-item"
    data-inset={inset}
    data-variant={variant}
    class={itemClass}
    {onclick}
    {onSelect}
    {closeOnSelect}
    {children}
    {...restProps}
  />
{/if}
