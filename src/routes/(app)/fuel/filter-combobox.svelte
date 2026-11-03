<script lang="ts">
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils/index.js";
  import type { FilterOption } from "$lib/utils/facets";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import type { Snippet } from "svelte";

  /**
   * A filter that ticks several options from a list, such as offices or
   * statuses. Nothing ticked means no filter. The list stays open between
   * ticks, so several are picked in one go, and its Clear unticks them all.
   *
   * ```svelte
   * <FilterCombobox name="office" plural="offices" searchable {options} bind:selected />
   * ```
   *
   * `searchable` adds a box at the top for a list too long to scan, and
   * `option` draws an option some other way than its label, such as a badge.
   */
  interface Props {
    options: FilterOption[];
    selected: string[];
    /** What the list holds: "office", "offices". The button reads "Office: All". */
    name: string;
    plural: string;
    searchable?: boolean;
    option?: Snippet<[FilterOption]>;
    class?: string;
  }

  let {
    options,
    selected = $bindable(),
    name,
    plural,
    searchable = false,
    option,
    class: className,
  }: Props = $props();

  let open = $state(false);
  let commandRef = $state<HTMLElement | null>(null);

  // Past two, the names stop fitting on the button and a count reads better.
  const SUMMARY_LIMIT = 2;

  const chosen = $derived(new Set(selected));

  const summary = $derived.by(() => {
    if (selected.length === 0) return "All";
    if (selected.length > SUMMARY_LIMIT) return `${selected.length} ${plural}`;
    // In the list's own order, not the order they were ticked.
    return options
      .filter((o) => chosen.has(o.value))
      .map((o) => o.label)
      .join(", ");
  });

  function toggle(value: string) {
    selected = chosen.has(value)
      ? selected.filter((existing) => existing !== value)
      : [...selected, value];
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    role="combobox"
    aria-expanded={open}
    aria-label="Filter by {name}"
    class={cn(
      "flex h-9 truncate items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm whitespace-nowrap shadow-xs transition-colors outline-none select-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50",
      className,
    )}
  >
    <span class="truncate">
      <span class="text-muted-foreground capitalize">{name}:</span>
      <span class="font-medium">{summary}</span>
    </span>
    <ChevronDownIcon
      class="pointer-events-none size-4 shrink-0 text-muted-foreground ml-auto"
    />
  </Popover.Trigger>
  <!--
    With no search box, the list itself takes the focus, so the arrow keys
    and Enter work as soon as it opens.
  -->
  <Popover.Content
    align="start"
    class="w-(--bits-popover-anchor-width) min-w-56 gap-0 p-0"
    onOpenAutoFocus={(event) => {
      if (searchable) return;
      event.preventDefault();
      commandRef?.focus();
    }}
  >
    <Command.Root
      bind:ref={commandRef}
      class="outline-none **:data-[slot=input-group]:rounded-sm!"
    >
      {#if searchable}
        <Command.Input placeholder="Search {plural}..." />
      {/if}
      <Command.List>
        <Command.Empty>No {name} matches.</Command.Empty>
        <Command.Group class={searchable ? "mt-0.5" : undefined}>
          {#each options as item (item.value)}
            <Command.Item
              value={item.value}
              keywords={[item.label]}
              data-checked={chosen.has(item.value)}
              onSelect={() => toggle(item.value)}
            >
              {#if option}
                {@render option(item)}
              {:else}
                {item.label}
              {/if}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
    <div class="border-t p-1">
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start"
        disabled={selected.length === 0}
        onclick={() => (selected = [])}
      >
        Clear
      </Button>
    </div>
  </Popover.Content>
</Popover.Root>
