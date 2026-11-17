<script lang="ts" module>
  export type PickerItem = {
    value: string;
    label: string;
    /** A smaller line under the label, such as a position or a plate. */
    detail?: string;
    /** What the button shows once this item is picked, if not the label. */
    buttonLabel?: string;
    /**
     * Text kept whole after the button's label. A long label is cut short
     * before it, so the suffix stays readable. The list does not show it.
     *
     *   suffix="(ICTU)"  →  Information and Communicati… (ICTU)
     */
    suffix?: string;
    /** A small tag at the right of the list line, such as an asset type. */
    badge?: string;
    /** More words the search matches, though they are not shown. */
    keywords?: string[];
  };
</script>

<script lang="ts">
  import type { CommandRootApi } from "$lib/components/ui/command/command.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import { cn, dataAttr } from "@/utils/index.js";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";

  /**
   * A button that opens a searchable list and shows the picked item.
   *
   * ```svelte
   * <SearchPicker id="driver" items={people} bind:value={driverPk} required />
   * ```
   *
   * `value` is the picked item's `value`, or "" for none. With `required`, an
   * empty picker stops the form like a normal input, because a hidden input
   * carries the value.
   */
  let {
    id,
    items,
    value = $bindable(""),
    placeholder = "Choose",
    searchPlaceholder = "Search...",
    empty = "Nothing matches.",
    required = false,
    disabled = false,
    class: className,
    "aria-labelledby": ariaLabelledby,
  }: {
    id: string;
    items: PickerItem[];
    value?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    empty?: string;
    required?: boolean;
    /** Shows the picked item, but it cannot be changed. */
    disabled?: boolean;
    class?: string;
    "aria-labelledby"?: string;
  } = $props();

  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);

  let commandApi = $state<CommandRootApi | null>(null);

  const picked = $derived(items.find((item) => item.value === value));

  /*
   * On opening, highlight the picked item and scroll the list to it. The
   * list highlights its first item on its own just after it opens, so this
   * waits a frame to run after that, or it would be undone.
   */
  $effect(() => {
    if (!open || !commandApi || !picked) return;
    const command = commandApi;
    const pickedValue = picked.value;
    const frame = requestAnimationFrame(() => {
      const index = command
        .getValidItems()
        .findIndex((el) => el.dataset.value === pickedValue);
      if (index >= 0) command.updateSelectedToIndex(index);
    });
    return () => cancelAnimationFrame(frame);
  });

  function pick(next: string) {
    value = next;
    open = false;
    // Back to the button, so keyboard users stay in the form.
    tick().then(() => triggerRef?.focus());
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    bind:ref={triggerRef}
    {id}
    {disabled}
    role="combobox"
    aria-expanded={open}
    aria-labelledby={ariaLabelledby}
    data-no-value={dataAttr(!picked)}
    class={cn(
      "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-no-value:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
  >
    <!--
      w-0 flex-1: the text takes the space left over and never widens the
      button, so a long name is cut short instead of pushing the button
      past its field.
    -->
    {#if picked?.suffix}
      <span class="flex w-0 flex-1 text-left">
        <span class="truncate">{picked.buttonLabel ?? picked.label}</span>
        <span class="shrink-0">&nbsp;{picked.suffix}</span>
      </span>
    {:else}
      <span class="w-0 flex-1 truncate text-left">
        {picked ? (picked.buttonLabel ?? picked.label) : placeholder}
      </span>
    {/if}
    <ChevronsUpDownIcon
      class="pointer-events-none size-4 shrink-0 text-muted-foreground"
    />
    <HiddenInput name={id} {value} {required} />
  </Popover.Trigger>
  <Popover.Content class="w-(--bits-popover-anchor-width) min-w-64 p-0">
    <Command.Root
      bind:api={commandApi}
      class="**:data-[slot=input-group]:rounded-sm!"
    >
      <Command.Input placeholder={searchPlaceholder} />
      <!--
        The list hides its scrollbar, so a long list did not look scrollable.
        The scroll area scrolls it instead and shows a scrollbar. The
        scrollbar is only there while the list overflows; the right padding
        follows it, so the items never sit under it.
      -->
      <Command.List class="max-h-none overflow-visible -mx-1">
        <ScrollArea
          type="auto"
          class="group/list"
          viewPortClasses="max-h-72 scroll-py-1 group-has-data-[slot=scroll-area-scrollbar]/list:pr-2"
        >
          <Command.Empty>{empty}</Command.Empty>
          <Command.Group class="mt-0.5">
            {#each items as item (item.value)}
              <!-- keywords lets the search match the words, not the id. -->
              <Command.Item
                value={item.value}
                keywords={[
                  item.label,
                  item.detail ?? "",
                  item.badge ?? "",
                  ...(item.keywords ?? []),
                ]}
                data-checked={item.value === value}
                onSelect={() => pick(item.value)}
              >
                <span class="grid min-w-0 flex-1">
                  <span class="truncate">{item.label}</span>
                  {#if item.detail}
                    <span class="truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  {/if}
                </span>
                {#if item.badge}
                  <Badge variant="secondary" class="shrink-0"
                    >{item.badge}</Badge
                  >
                {/if}
              </Command.Item>
            {/each}
          </Command.Group>
        </ScrollArea>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
