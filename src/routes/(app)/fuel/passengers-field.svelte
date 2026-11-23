<script lang="ts">
  import AnimatedList from "$lib/components/transition/animated-list.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { cn } from "$lib/utils/index.js";
  import XIcon from "@lucide/svelte/icons/x";
  import {
    DURATION,
    EASE_OUT_CSS,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import { tick, untrack } from "svelte";

  /**
   * The trip ticket's passengers: a button that lists the names, which opens
   * a dialog on top to add and remove them. Names are typed, never picked,
   * since a passenger may not work in the office.
   *
   * ```svelte
   * <PassengersField id="passengers" bind:names bind:open />
   * ```
   */
  let {
    id,
    names = $bindable([]),
    open = $bindable(false),
    "aria-labelledby": ariaLabelledby,
  }: {
    id: string;
    names: string[];
    /** Bound so the dialog underneath can step back while this one is open. */
    open?: boolean;
    "aria-labelledby"?: string;
  } = $props();

  let draft = $state("");

  /**
   * The names with an id each. The list animates a row in and out by its key,
   * and a name is not a safe key: a name removed and typed again at once
   * would meet its old row still fading out.
   */
  type Entry = { id: number; name: string };
  let nextId = 0;
  const toEntries = (list: string[]) =>
    list.map((name): Entry => ({ id: nextId++, name }));
  let entries = $state<Entry[]>(untrack(() => toEntries(names)));

  // The names changed from outside, as when the form starts over: follow them.
  $effect.pre(() => {
    const outside = names;
    const same = untrack(
      () =>
        outside.length === entries.length &&
        outside.every((name, i) => name === entries[i].name),
    );
    if (!same) entries = toEntries(outside);
  });

  function update(next: Entry[]) {
    entries = next;
    names = next.map((e) => e.name);
  }

  let viewport = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  /** The row flashed because its name was typed again. */
  let flashedId = $state<number | null>(null);
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  const sameName = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

  function add() {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name) return;

    // Only here, as a help while typing: the server does not check for a
    // repeated name, and a passenger list with one twice does no harm.
    const existing = entries.find((e) => sameName(e.name, name));
    if (existing) {
      showExisting(existing.id);
      return;
    }

    draft = "";
    update([...entries, { id: nextId++, name }]);
    // The new name goes at the end, so bring the end into view once it is
    // laid out. Its entrance only moves it a few pixels, never its place.
    tick().then(() =>
      viewport?.scrollTo({
        top: viewport.scrollHeight,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      }),
    );
  }

  /**
   * Scrolls the row into view, then flashes it and swells it a little,
   * instead of adding it twice.
   */
  function showExisting(entryId: number) {
    const row = viewport?.querySelector(`[data-entry-id="${entryId}"]`);
    if (!viewport || !row) return;

    // The row's middle on the box's middle, as far as the list can scroll.
    const rowBox = row.getBoundingClientRect();
    const box = viewport.getBoundingClientRect();
    const centered =
      viewport.scrollTop +
      (rowBox.top + rowBox.height / 2) -
      (box.top + box.height / 2);
    const top = Math.min(
      Math.max(centered, 0),
      viewport.scrollHeight - viewport.clientHeight,
    );
    if (Math.abs(top - viewport.scrollTop) < 1) {
      flash(entryId, row);
      return;
    }

    afterScroll(viewport, () => flash(entryId, row));
    viewport.scrollTo({
      top,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function flash(entryId: number, row: Element) {
    flashedId = entryId;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashedId = null), 1200);
    if (prefersReducedMotion()) return;
    row.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.03)" },
        { transform: "scale(1)" },
      ],
      { duration: DURATION.bump * 2, easing: EASE_OUT_CSS },
    );
  }

  /**
   * Runs `then` once the box stops scrolling. The timeout covers a browser
   * that never sends `scrollend`.
   */
  function afterScroll(el: HTMLElement, then: () => void) {
    const finish = () => {
      el.removeEventListener("scrollend", finish);
      clearTimeout(fallback);
      then();
    };
    el.addEventListener("scrollend", finish);
    const fallback = setTimeout(finish, 800);
  }

  function remove(entryId: number) {
    update(entries.filter((e) => e.id !== entryId));
  }
</script>

<button
  type="button"
  {id}
  aria-labelledby={ariaLabelledby}
  class={cn(
    "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50",
    names.length === 0 && "text-muted-foreground",
  )}
  onclick={() => (open = true)}
>
  <span class="w-0 flex-1 truncate">
    {names.length > 0 ? names.join("; ") : "Add passengers"}
  </span>
</button>

<!-- A name typed but not added yet is kept, not lost, when the dialog closes. -->
<Dialog.Root
  bind:open
  onOpenChange={(isOpen) => {
    if (!isOpen) add();
  }}
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) draft = "";
  }}
>
  <!-- At most 442px tall, or the screen less a margin if that is shorter. -->
  <Dialog.Content
    class="flex max-h-[min(442px,calc(100dvh-2rem))] flex-col sm:max-w-sm"
  >
    <Dialog.Header>
      <Dialog.Title>Passengers</Dialog.Title>
      <Dialog.Description>Printed on the trip ticket.</Dialog.Description>
    </Dialog.Header>

    <div class="flex gap-2">
      <Input
        bind:ref={input}
        bind:value={draft}
        maxlength={150}
        placeholder="Type a name"
        aria-label="Passenger's name"
        onkeydown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          add();
        }}
      />
      <Button
        type="button"
        variant="outline"
        onclick={() => {
          add();
          input?.focus();
        }}
      >
        Add
      </Button>
    </div>

    <!--
      -mx-4 puts the scrollbar on the dialog's edge.

      animateHeight off: a height that grows over several frames made a new
      name show up partway down the list and slide into place.

      overflow-y-clip: rows still animating after a removal hang below the
      list, and the scroll area keeps its scrollbar for them, since it
      checks again only when a size changes.
    -->
    <ScrollArea
      bind:viewportRef={viewport}
      class="-mx-4 flex min-h-0 flex-col "
      viewPortClasses="h-auto px-4 scroll-fade-y"
      type="auto"
    >
      <AnimatedList
        items={entries}
        key={(entry) => entry.id}
        animateHeight={false}
        class="overflow-y-clip"
        listClass="gap-0 divide-y"
      >
        {#snippet item(entry, index)}
          <div
            data-entry-id={entry.id}
            class={cn(
              "hover:bg-muted flex items-center gap-2 py-1.5 pr-1 pl-1 transition-colors duration-500",
              flashedId === entry.id && "bg-primary/15 hover:bg-primary/15",
            )}
          >
            <!-- Counts the names; w-6 fits up to "50.", the most allowed. -->
            <span
              class="text-muted-foreground w-6 shrink-0 text-right text-sm tabular-nums"
            >
              {index + 1}.
            </span>
            <span class="w-0 flex-1 truncate text-sm">{entry.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove {entry.name}"
              onclick={() => remove(entry.id)}
              class="hover:text-destructive"
            >
              <XIcon />
            </Button>
          </div>
        {/snippet}
        {#snippet empty()}
          <p class="text-muted-foreground text-sm">No passengers yet.</p>
        {/snippet}
      </AnimatedList>
    </ScrollArea>

    <Dialog.Footer>
      <Button
        type="button"
        onclick={() => {
          add();
          open = false;
        }}
      >
        Done
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
