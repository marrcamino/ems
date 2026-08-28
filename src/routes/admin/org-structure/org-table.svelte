<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { parenthesize } from "@/utils";
  import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Building2,
    Search,
    X,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import { columns, features } from "./columns.js";
  import { getOrgUnitContext } from "./context.svelte.js";
  import OrgUnitActionsCell from "./org-unit-actions-cell.svelte";

  const ctx = getOrgUnitContext();

  let search = $state("");

  // There is only ever one office, so a row for it would repeat the same name
  // on every screen and push everything else one step to the right. It is
  // named once above the table instead, and the divisions start at the left
  // edge. It is read from the flat list rather than from the tree, so the name
  // is still there when the tree is empty.
  const office = $derived(ctx.orgUnits.find((o) => o.level === "office") ?? null);
  const rows = $derived(ctx.orgUnitTree.flatMap((root) => root.children));

  const table = createTable({
    features,
    columns,
    get data() {
      return rows;
    },
    getSubRows: (row) => row.children,
    // Keyed by the database id rather than by position, so which branches are
    // open survives a rename, a move, or a box being added somewhere above.
    getRowId: (row) => String(row.orgUnitPk),
    state: {
      get globalFilter() {
        return search;
      },
    },
    onGlobalFilterChange: (updater) => {
      search = typeof updater === "function" ? updater(search) : updater;
    },
    globalFilterFn: "includesString",
    // A search matches the name of a section deep in the chart, and its
    // division has to come with it or the result has nothing to sit under.
    filterFromLeafRows: true,
    initialState: { expanded: true },
  });

  const searching = $derived(search.trim().length > 0);
</script>

<div class="flex min-w-0 flex-col gap-4">
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative">
      <Search
        class="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        placeholder="Search division, section or unit..."
        class="h-9 w-72 ps-8"
        bind:value={search}
      />
    </div>

    {#if searching}
      <Button variant="ghost" size="sm" onclick={() => (search = "")}>
        Clear <X />
      </Button>
    {/if}

    <div class="ms-auto flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => table.toggleAllRowsExpanded(true)}
      >
        Expand all
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onclick={() => table.toggleAllRowsExpanded(false)}
      >
        Collapse all
      </Button>
    </div>
  </div>

  <div class="min-w-0 rounded-lg border">
    {#if office}
      <div class="flex items-center gap-2 border-b px-4 py-3">
        <Building2 class="size-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium">
          {office.orgUnitName}
          {#if office.abbr}
            <span class="font-normal text-muted-foreground">
              {parenthesize(office.abbr)}
            </span>
          {/if}
        </span>
        {#if office.status === "inactive"}
          <Badge variant="destructive">Inactive</Badge>
        {/if}
        <!-- Renaming the office and adding a division under it live here now
             that it has no row of its own. -->
        <div class="ms-auto">
          <OrgUnitActionsCell unit={office} />
        </div>
      </div>
    {/if}

    <Table.Root containerClass="relative w-full min-w-0 overflow-x-auto">
      <Table.Header>
        {#each table.getHeaderGroups() as group (group.id)}
          <Table.Row>
            {#each group.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  {#if header.column.getCanSort()}
                    <button
                      type="button"
                      class="flex select-none items-center gap-1"
                      onclick={header.column.getToggleSortingHandler()}
                    >
                      <FlexRender {header} />
                      {#if header.column.getIsSorted() === "asc"}
                        <ArrowUp class="size-3.5" />
                      {:else if header.column.getIsSorted() === "desc"}
                        <ArrowDown class="size-3.5" />
                      {:else}
                        <ArrowUpDown class="size-3.5 opacity-40" />
                      {/if}
                    </button>
                  {:else}
                    <FlexRender {header} />
                  {/if}
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row>
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender {cell} />
              </Table.Cell>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell
              colspan={table.getVisibleLeafColumns().length}
              class="h-32 text-center"
            >
              {#if searching}
                <p class="text-sm text-muted-foreground">
                  Nothing matches what you're looking for.
                </p>
                <Button variant="link" size="sm" onclick={() => (search = "")}>
                  Clear the search
                </Button>
              {:else}
                <p class="text-sm text-muted-foreground">
                  Nothing has been added under this office yet.
                </p>
              {/if}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</div>
