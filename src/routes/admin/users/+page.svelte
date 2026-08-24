<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import Header from "@/components/header.svelte";
  import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    UsersRound,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import type { ColumnFiltersState } from "@tanstack/table-core";
  import { untrack } from "svelte";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import AddEditUserDialog from "./add-edit-user-dialog.svelte";
  import { createColumns, features, HIDDEN_COLUMNS } from "./columns.js";
  import { setUsersContext } from "./context.svelte.js";
  import DeleteAlertDialog from "./delete-alert-dialog.svelte";
  import { buildUserFacets, emptyUserFilters } from "./filters.js";
  import ResetPasswordDialog from "./reset-password-dialog.svelte";
  import TemporaryPasswordDialog from "./temporary-password-dialog.svelte";
  import UsersToolbar from "./users-toolbar.svelte";

  let { data } = $props();

  const ctx = setUsersContext();
  const gblCtx = getGlobalContext();

  let globalFilter = $state("");
  let filters = $state(emptyUserFilters());

  // Seeded during init rather than on mount so the table cells — which read
  // the role list and the signed-in user out of the context — have it on
  // their very first render. A one-time copy on purpose: from here the
  // context is the source of truth for the table, updated in place as
  // accounts are added, edited, and deleted.
  untrack(() => {
    ctx.users = data.users;
    ctx.roles = data.roles;
    ctx.orgUnits = data.orgUnits;
    ctx.permissionDefs = data.permissionDefs;
    ctx.superAdminRolePk = data.superAdminRolePk;
    ctx.currentUserPk = gblCtx.user.userPk;
    ctx.canManageRoles = gblCtx.can("admin:manage_roles");
  });

  // The role list is read through a getter so the "Type" column keeps working
  // after a role is renamed or retired elsewhere and the page data refreshes.
  const columns = untrack(() => createColumns(() => ctx.roles));

  const facets = $derived(buildUserFacets(ctx.users, ctx.roles));

  // Filter state is owned here rather than inside the table, so the toolbar
  // can drive it directly and "Reset" is one assignment. An empty list means
  // the dropdown was never touched, so it is left out entirely rather than
  // passed down as a filter matching nothing.
  const columnFilters = $derived(
    Object.entries(filters)
      .filter(([, values]) => values.length > 0)
      .map(([id, value]) => ({ id, value })) as ColumnFiltersState,
  );

  const table = createTable({
    features,
    columns,
    get data() {
      return ctx.users;
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
  <title>Users - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/admin">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Users</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  <div class="ml-auto">
    {#if gblCtx.can("admin:manage_users")}
      <Button onclick={() => (ctx.addEditDialog = true)}><Plus /> Add</Button>
    {/if}
  </div>
</Header>

<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0">
  {#if ctx.users.length}
    <div class="mt-1">
      <UsersToolbar
        bind:search={globalFilter}
        bind:filters
        {facets}
        {matched}
        total={ctx.users.length}
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
              <p class="text-sm text-muted-foreground">
                Nobody matches what you're looking for.
              </p>
              <Button
                variant="link"
                size="sm"
                onclick={() => {
                  filters = emptyUserFilters();
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
          <UsersRound />
        </Empty.Media>
        <Empty.Title>No accounts yet</Empty.Title>
        <Empty.Description>
          Add the people who will use the system and give each of them a role.
          Roles decide which pages a person can open.
        </Empty.Description>
      </Empty.Header>
      {#if gblCtx.can("admin:manage_users")}
        <Empty.Content>
          <Button
            variant="outline"
            size="sm"
            onclick={() => (ctx.addEditDialog = true)}>Add Person</Button
          >
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
</div>

<AddEditUserDialog />
<ResetPasswordDialog />
<DeleteAlertDialog />
<TemporaryPasswordDialog />
