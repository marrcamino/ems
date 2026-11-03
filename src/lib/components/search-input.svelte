<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { cn, dataAttr } from "$lib/utils/index.js";
  import { Search, X } from "@lucide/svelte/icons";
  import type { ComponentProps } from "svelte";

  /**
   * A search box whose magnifier turns into a clear button once something
   * is typed.
   *
   * ```svelte
   * <SearchInput bind:value={search} class="w-full sm:w-80" placeholder="Search asset" />
   * ```
   *
   * Escape empties it, and so does the clear button, which also puts the
   * cursor back in the box so the next search can be typed at once. `class`
   * sizes the whole box; everything else goes to the input.
   */
  let {
    value = $bindable(""),
    ref = $bindable(null),
    class: className,
    onkeydown,
    ...restProps
  }: Omit<ComponentProps<typeof Input>, "value" | "type" | "files" | "ref"> & {
    value?: string;
    ref?: HTMLInputElement | null;
  } = $props();

  const hasText = $derived(value !== "");

  function clear() {
    value = "";
    ref?.focus();
  }
</script>

<div class={cn("relative", className)}>
  <!--
    Out of reach while the box is empty: invisible, not clickable, skipped by
    Tab, and hidden from screen readers.
  -->
  <button
    type="button"
    aria-label="Clear search"
    aria-hidden={hasText ? undefined : true}
    tabindex={hasText ? undefined : -1}
    onclick={clear}
    data-has-text={dataAttr(hasText)}
    class="pointer-events-none absolute inset-s-2.5 top-2.5 size-4 cursor-pointer text-muted-foreground opacity-0 hover:text-foreground data-has-text:pointer-events-auto data-has-text:opacity-100"
  >
    <X class="size-4" />
  </button>
  <Search
    data-has-text={dataAttr(hasText)}
    class="pointer-events-none absolute inset-s-2.5 top-2.5 size-4 text-muted-foreground data-has-text:opacity-0"
  />
  <Input
    bind:ref
    bind:value
    class="h-9 w-full ps-8"
    onkeydown={(event) => {
      onkeydown?.(event);
      // Only with text in the box, so an Escape in an empty box still does
      // whatever it does around it, such as closing a dialog.
      if (event.key === "Escape" && hasText && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        value = "";
      }
    }}
    {...restProps}
  />
</div>
