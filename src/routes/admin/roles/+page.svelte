<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    ShieldCheck,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import type { ColumnFiltersState } from "@tanstack/table-core";
  import { untrack } from "svelte";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import AddEditRoleDialog from "./add-edit-role-dialog.svelte";
  import { createColumns, features, HIDDEN_COLUMNS } from "./columns.js";
  import { setRolesContext } from "./context.svelte.js";
  import DeleteAlertDialog from "./delete-alert-dialog.svelte";
  import { buildRoleFacets, emptyRoleFilters } from "./filters.js";
  import RolesToolbar from "./roles-toolbar.svelte";

  let { data } = $props();

  const ctx = setRolesContext();
  const gblCtx = getGlobalContext();

  let globalFilter = $state("");
  let filters = $state(emptyRoleFilters());

  // Seeded during init rather than on mount so the table cells — which read
  // the permission list and the protected role out of the context — have it
  // on their very first render. A one-time copy on purpose: from here the
  // context is the source of truth for the table, updated in place as roles
  // are added, edited, and deleted.
  untrack(() => {
    ctx.roles = data.roles;
    ctx.superAdminRolePk = data.superAdminRolePk;
    ctx.templates = data.templates;
    ctx.permissionDefs = data.permissionDefs;
  });

  // Fixed for the life of the page: the permission list is defined in code,
  // so the columns built from it never need rebuilding.
  const columns = untrack(() => createColumns(data.permissionDefs));

  const facets = $derived(buildRoleFacets(ctx.roles, ctx.permissionDefs));

  // Filter state is owned here rather than inside the table, so the toolbar
  // can drive it directly and the "Reset" button is one assignment. An empty
  // list means the dropdown was never touched, so it is left out entirely
  // rather than passed down as a filter matching nothing.
  const columnFilters = $derived(
    Object.entries(filters)
      .filter(([, values]) => values.length > 0)
      .map(([id, value]) => ({ id, value })) as ColumnFiltersState,
  );

  const table = createTable({
    features,
    columns,
    get data() {
      return ctx.roles;
    },
    state: {
      get globalFilter() {
        return globalFilter;
      },
      get columnFilters() {
        return columnFilters;
      },
    },
    onGlobalFilterChange: (updater) => {
      globalFilter =
        typeof updater === "function" ? updater(globalFilter) : updater;
    },
    globalFilterFn: "includesString",
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      columnVisibility: HIDDEN_COLUMNS,
    },
  });

  const matched = $derived(table.getFilteredRowModel().rows.length);

  // Narrowing the list can leave the current page past the end of it, which
  // reads as an empty table rather than as a filter result.
  $effect(() => {
    globalFilter;
    columnFilters;

    untrack(() => {
      if (table.atoms.pagination.get().pageIndex !== 0) table.setPageIndex(0);
    });
  });
</script>

<svelte:head>
  <title>Roles - EMS</title>
</svelte:head>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl"
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
          <Breadcrumb.Page>Roles</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    <div class="ml-auto">
      {#if gblCtx.can("admin:manage_roles")}
        <Button onclick={() => (ctx.addEditDialog = true)}><Plus /> Add</Button>
      {/if}
    </div>
  </div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">
  {#if ctx.roles.length}
    <div class="mt-1">
      <RolesToolbar
        bind:search={globalFilter}
        bind:filters
        {facets}
        {matched}
        total={ctx.roles.length}
      />
    </div>

    <Table.Root
      containerClass="relative w-full min-w-0 overflow-x-auto rounded-lg border"
    >
      <Table.Header>
        {#each table.getHeaderGroups() as group (group.id)}
          <Table.Row>
            {#each group.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  {#if header.column.getCanSort()}
                    <button
                      type="button"
                      class="flex items-center gap-1 select-none"
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
              <p class="text-sm text-muted-foreground">
                No roles match what you're looking for.
              </p>
              <Button
                variant="link"
                size="sm"
                onclick={() => {
                  filters = emptyRoleFilters();
                  globalFilter = "";
                }}
              >
                Reset the search and filters
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    <div class="flex items-center justify-end gap-4">
      <span class="text-sm text-muted-foreground">
        Page {table.atoms.pagination.get().pageIndex + 1} of
        {Math.max(table.getPageCount(), 1)}
      </span>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          class="size-8"
          disabled={!table.getCanPreviousPage()}
          onclick={() => table.previousPage()}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="size-8"
          disabled={!table.getCanNextPage()}
          onclick={() => table.nextPage()}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  {:else}
    <Empty.Root class="border border-dashed">
      <Empty.Header class="max-w-md">
        <Empty.Media variant="icon">
          <ShieldCheck />
        </Empty.Media>
        <Empty.Title>No roles yet</Empty.Title>
        <Empty.Description>
          Create a role and pick which permissions it grants. Users are then
          assigned a role from the Users page.
        </Empty.Description>
      </Empty.Header>
      {#if gblCtx.can("admin:manage_roles")}
        <Empty.Content>
          <Button
            variant="outline"
            size="sm"
            onclick={() => (ctx.addEditDialog = true)}>Add Role</Button
          >
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
</div>

<AddEditRoleDialog permissionDefs={data.permissionDefs} />
<DeleteAlertDialog />
