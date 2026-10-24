<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { ListFilter } from "@lucide/svelte/icons";
  import type { CountedOption } from "./filters.js";

  /**
   * One filter dropdown: tick as many options as you like, and the trigger
   * shows what is currently applied so the state of the table is readable
   * without opening anything.
   */
  interface Props {
    label: string;
    options: CountedOption[];
    selected: string[];
    onChange: (values: string[]) => void;
    icon?: typeof ListFilter;
  }

  let {
    label,
    options,
    selected,
    onChange,
    icon: Icon = ListFilter,
  }: Props = $props();

  // Past two, the labels stop fitting on the button and a count reads better.
  const SUMMARY_LIMIT = 2;

  const chosen = $derived(new Set(selected));
  const summary = $derived(
    options.filter((option) => chosen.has(option.value)).map((o) => o.label),
  );

  function toggle(value: string, checked: boolean) {
    onChange(
      checked
        ? [...selected, value]
        : selected.filter((existing) => existing !== value),
    );
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="sm"
        class="h-9 border-dashed data-[state=open]:border-solid"
      >
        <Icon />
        {label}

        {#if summary.length}
          <Separator
            orientation="vertical"
            class="mx-0.5 data-[orientation=vertical]:h-4"
          />
          {#if summary.length > SUMMARY_LIMIT}
            <Badge variant="secondary">{summary.length} selected</Badge>
          {:else}
            {#each summary as item (item)}
              <Badge variant="secondary">{item}</Badge>
            {/each}
          {/if}
        {/if}
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content align="start" class="w-60">
    <DropdownMenu.Label>{label}</DropdownMenu.Label>
    <DropdownMenu.Separator />

    <ScrollArea type="auto" viewPortClasses="max-h-72 overflow-y-auto">
      {#each options as option (option.value)}
        <DropdownMenu.CheckboxItem
          checked={chosen.has(option.value)}
          closeOnSelect={false}
          disabled={option.count === 0 && !chosen.has(option.value)}
          onCheckedChange={(checked) => toggle(option.value, checked)}
        >
          <span class="flex-1">{option.label}</span>
          <span class="text-xs text-muted-foreground tabular-nums">
            {option.count}
          </span>
        </DropdownMenu.CheckboxItem>
      {:else}
        <p class="px-2 py-1.5 text-sm text-muted-foreground">
          Nothing to filter by yet.
        </p>
      {/each}
    </ScrollArea>

    {#if summary.length}
      <DropdownMenu.Separator />
      <DropdownMenu.Item closeOnSelect={false} onclick={() => onChange([])}>
        Clear
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
