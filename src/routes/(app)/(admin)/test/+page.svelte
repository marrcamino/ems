<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import Header from "@/components/header.svelte";
  import SortIcon, {
    SORT_ICON_TYPES,
    type SortIconType,
  } from "@/components/sort-icon.svelte";

  type Sorted = "asc" | "desc" | false;

  const STATES: { label: string; sorted: Sorted }[] = [
    { label: "Not sorted", sorted: false },
    { label: "Ascending", sorted: "asc" },
    { label: "Descending", sorted: "desc" },
  ];

  // Each header button goes not sorted → ascending → descending → not
  // sorted, the way TanStack toggles a column.
  let sorting = $state<Record<SortIconType, Sorted>>(
    Object.fromEntries(SORT_ICON_TYPES.map((type) => [type, false])) as Record<
      SortIconType,
      Sorted
    >,
  );

  function next(sorted: Sorted): Sorted {
    if (sorted === false) return "asc";
    if (sorted === "asc") return "desc";
    return false;
  }
</script>

<svelte:head>
  <title>Test - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Test</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-0">
  <section class="flex flex-col gap-2">
    <h2 class="font-semibold">Sort icon: every type</h2>
    <Table.Root
      containerClass="relative w-full min-w-0 overflow-x-auto rounded-lg border"
    >
      <Table.Header>
        <Table.Row>
          <Table.Head>type</Table.Head>
          {#each STATES as state (state.label)}
            <Table.Head class="text-center">{state.label}</Table.Head>
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each SORT_ICON_TYPES as type (type)}
          <Table.Row>
            <Table.Cell class="font-mono">{type}</Table.Cell>
            {#each STATES as state (state.label)}
              <Table.Cell>
                <SortIcon
                  {type}
                  sorted={state.sorted}
                  class="mx-auto size-6"
                />
              </Table.Cell>
            {/each}
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </section>

  <section class="flex flex-col gap-2">
    <h2 class="font-semibold">Sort icon: in a column header</h2>
    <p class="text-sm text-muted-foreground">
      Click a column name to sort by it.
    </p>
    <Table.Root
      containerClass="relative w-full min-w-0 overflow-x-auto rounded-lg border"
    >
      <Table.Header>
        <Table.Row>
          {#each SORT_ICON_TYPES as type (type)}
            <Table.Head>
              <button
                type="button"
                class="flex select-none items-center gap-1"
                onclick={() => (sorting[type] = next(sorting[type]))}
              >
                {type}
                <SortIcon {type} sorted={sorting[type]} />
              </button>
            </Table.Head>
          {/each}
        </Table.Row>
      </Table.Header>
    </Table.Root>
  </section>
</div>
