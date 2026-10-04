<script lang="ts">
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";

  const fruits = [
    { value: "1", label: "Apple" },
    { value: "2", label: "Banana" },
    { value: "3", label: "Mango" },
    { value: "4", label: "Durian", disabled: true },
    { value: "5", label: "Pineapple" },
    {
      value: "6",
      label:
        "Philippine carabao mango from Guimaras, extra sweet, harvested this week",
    },
  ];

  let fruit = $state("6");
  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);
  const pickedLabel = $derived(fruits.find((f) => f.value === fruit)?.label);

  function pick(value: string) {
    fruit = value;
    open = false;
    // Hand focus back to the trigger so keyboard users stay in the form.
    tick().then(() => triggerRef?.focus());
  }
</script>

<svelte:head>
  <title>Test - EMS</title>
</svelte:head>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl z-20"
>
  <div class="flex items-center gap-2 px-4 w-full">
    <Sidebar.Trigger class="-ms-1" />
    <Separator
      orientation="vertical"
      class="me-2 data-[orientation=vertical]:h-4"
    />
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item class="hidden md:block">
          <Breadcrumb.Link href="/admin">Dashboard</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator class="hidden md:block" />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Test</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>
</header>

<div class="grid max-w-xs gap-2 p-4">
  <Label for="fruit">Fruit</Label>
  <Popover.Root bind:open>
    <Popover.Trigger
      bind:ref={triggerRef}
      id="fruit"
      role="combobox"
      aria-expanded={open}
      data-no-value={pickedLabel ? undefined : ""}
      class="gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm h-8 transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between whitespace-nowrap outline-none data-no-value:text-muted-foreground"
    >
      <span class="min-w-0 flex-1 truncate text-left">
        {pickedLabel ?? "Choose a fruit"}
      </span>
      <ChevronsUpDownIcon
        class="size-4 shrink-0 text-muted-foreground pointer-events-none"
      />
    </Popover.Trigger>
    <Popover.Content class="w-(--bits-popover-anchor-width) min-w-48 p-0">
      <Command.Root>
        <Command.Input placeholder="Search fruits..." />
        <Command.List>
          <Command.Empty>Nothing matches your search.</Command.Empty>
          <Command.Group>
            {#each fruits as item (item.value)}
              <!-- keywords lets the search match the label, not the id -->
              <Command.Item
                value={item.value}
                keywords={[item.label]}
                disabled={item.disabled}
                data-checked={item.value === fruit}
                onSelect={() => pick(item.value)}
              >
                {item.label}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
  <p class="text-muted-foreground text-sm">
    Picked value: {fruit || "none"} ({pickedLabel ?? "none"})
  </p>
</div>
