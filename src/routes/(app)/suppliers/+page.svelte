<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import SearchInput from "@/components/search-input.svelte";
  import TinText from "@/components/tin-text.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import type { Supplier } from "@/types";
  import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    Pencil,
    Plus,
    Store,
    Trash,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import { untrack } from "svelte";
  import { flip } from "svelte/animate";
  import { SvelteSet } from "svelte/reactivity";
  import { toast } from "svelte-sonner";
  import { columns, features } from "./columns.js";
  import DeleteSupplierDialog from "./delete-supplier-dialog.svelte";
  import SupplierForm from "./supplier-form.svelte";

  /**
   * The businesses the office buys from, picked on the fuel and paper POs.
   * Laid out like the assets page: search, status tabs, and a sortable
   * table. A supplier named on a PO is archived rather than deleted, so the
   * PO keeps showing who it was bought from.
   */
  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("purchase_orders:manage"));

  const suppliers = $derived(data.suppliers);

  /**
   * Which suppliers the table shows. Kept in the address so a reload keeps
   * the view; `active` is the default and so is never written there.
   */
  const STATUS_PARAM = "status";
  type StatusFilter = "active" | "archived" | "all";

  const statusFilter = $derived.by<StatusFilter>(() => {
    const raw = page.url.searchParams.get(STATUS_PARAM);
    return raw === "archived" || raw === "all" ? raw : "active";
  });

  function setStatusFilter(next: string) {
    const url = new URL(page.url);
    if (next === "active") url.searchParams.delete(STATUS_PARAM);
    else url.searchParams.set(STATUS_PARAM, next);
    // Replaced, so Back leaves the page instead of stepping through tabs.
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  const counts = $derived({
    active: suppliers.filter((s) => s.status === "active").length,
    archived: suppliers.filter((s) => s.status === "archived").length,
    all: suppliers.length,
  });

  // The tab narrows the list before the table sees it, so the search only
  // ever runs inside the chosen tab.
  const suppliersInTab = $derived(
    statusFilter === "all"
      ? suppliers
      : suppliers.filter((s) => s.status === statusFilter),
  );

  let search = $state("");

  const table = createTable({
    features,
    columns,
    get data() {
      return suppliersInTab;
    },
    getRowId: (row) => String(row.supplierPk),
    state: {
      get globalFilter() {
        return search;
      },
      // Only the All tab mixes both, so only there does a status column
      // tell anything.
      get columnVisibility() {
        return { status: statusFilter === "all", actions: canManage };
      },
    },
    onGlobalFilterChange: (updater) => {
      search = typeof updater === "function" ? updater(search) : updater;
    },
    globalFilterFn: "includesString",
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const visibleRows = $derived(table.getRowModel().rows);

  // Narrowing the list can leave the current page past the end of it.
  $effect(() => {
    search;
    statusFilter;
    untrack(() => {
      if (table.atoms.pagination.get().pageIndex !== 0) table.setPageIndex(0);
    });
  });

  /** A row fades in only when it is new to a table already on screen. */
  let seenRows = new Set<number>();
  let tableWasVisible = false;

  $effect(() => {
    const showing = visibleRows.length > 0;
    seenRows = showing
      ? new Set(visibleRows.map((row) => row.original.supplierPk))
      : new Set();
    tableWasVisible = showing;
  });

  /** Rows swap instantly while searching, so they keep up with the typing. */
  const searching = $derived(search.trim() !== "");

  function rowIntro(supplierPk: number) {
    const isNew = tableWasVisible && !seenRows.has(supplierPk);
    if (!isNew || searching || prefersReducedMotion()) return { duration: 0 };
    return { duration: DURATION.item };
  }

  let leavingRows = $state(0);

  function rowFlip() {
    return {
      duration: searching || prefersReducedMotion() ? 0 : DURATION.item,
      easing: easeOut,
    };
  }

  let formOpen = $state(false);
  let supplierToEdit = $state<Supplier | null>(null);
  /** Remounts the form each time, so it never opens with old typing. */
  let formKey = $state(0);

  function openForm(row: Supplier | null) {
    supplierToEdit = row;
    formKey += 1;
    formOpen = true;
  }

  async function onSaved() {
    formOpen = false;
    await invalidateAll();
  }

  let deleteOpen = $state(false);
  let supplierToDelete = $state<Supplier | null>(null);

  /**
   * Every archive/restore toast shares this id, so a new one replaces the
   * one on screen, and only the latest change offers Undo.
   */
  const STATUS_TOAST_ID = "supplier-status";
  /** Suppliers with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /** Archives or restores straight from the row menu; undone from the toast. */
  async function setActive(row: Supplier, active: boolean) {
    pending.add(row.supplierPk);
    try {
      const body = new FormData();
      body.set("supplierPk", String(row.supplierPk));
      body.set("status", active ? "active" : "archived");
      const response = await fetch("?/setSupplierStatus", {
        method: "POST",
        body,
        headers: { "x-sveltekit-action": "true" },
      });
      const result = deserialize(await response.text());
      if (result.type !== "success") {
        const error =
          result.type === "failure"
            ? (result.data as { error?: string } | undefined)?.error
            : undefined;
        toast.error(
          `${row.supplierName} not ${active ? "restored" : "archived"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }
      await invalidateAll();
      const updated = result.data?.updatedRow as Supplier;
      toast.success(`${row.supplierName} ${active ? "restored" : "archived"}`, {
        id: STATUS_TOAST_ID,
        action: { label: "Undo", onClick: () => setActive(updated, !active) },
      });
    } finally {
      pending.delete(row.supplierPk);
    }
  }
</script>

<svelte:head>
  <title>Suppliers - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Suppliers</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <div class="flex w-full max-w-5xl flex-wrap items-start gap-x-4 gap-y-2 pt-1">
    <SearchInput
      bind:value={search}
      class="w-full sm:w-72"
      placeholder="Search name, TIN, or PhilGEPS no."
      disabled={suppliers.length <= 0}
    />

    {#snippet tabCount(count: number)}
      <span class="text-muted-foreground">{count}</span>
    {/snippet}

    <Tabs.Root
      value={statusFilter}
      onValueChange={setStatusFilter}
      class="ml-auto"
      disabled={suppliers.length <= 0}
    >
      <Tabs.List>
        <Tabs.Trigger value="active">
          Active {@render tabCount(counts.active)}
        </Tabs.Trigger>
        <Tabs.Trigger value="archived">
          Archived {@render tabCount(counts.archived)}
        </Tabs.Trigger>
        <Tabs.Trigger value="all">
          All {@render tabCount(counts.all)}
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    {#if canManage}
      <Button onclick={() => openForm(null)}>
        <Plus />
        Add supplier
      </Button>
    {/if}
  </div>

  <ContentTransition
    isEmpty={visibleRows.length === 0}
    empty={emptyState}
    animated={!searching}
    class="w-full max-w-5xl pt-3"
  >
    <Table.Root
      containerClass={[
        "relative w-full min-w-0 overflow-x-auto rounded-lg border",
        leavingRows > 0 && "overflow-x-clip",
      ]}
    >
      <Table.Header class="bg-muted/80 rounded-t-lg">
        {#each table.getHeaderGroups() as group (group.id)}
          <Table.Row>
            {#each group.headers as header (header.id)}
              <Table.Head class={header.column.id === "actions" ? "w-0" : ""}>
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
        <!-- A plain `<tr>` so it can carry transitions, as on the assets page. -->
        {#each visibleRows as tableRow (tableRow.id)}
          {@const row = tableRow.original}
          <tr
            data-slot="table-row"
            class="hover:bg-muted/50 border-b transition-colors"
            animate:flip={rowFlip()}
            in:itemIn={rowIntro(row.supplierPk)}
            out:itemOut={{ duration: searching ? 0 : DURATION.exit }}
            onoutrostart={() => leavingRows++}
            onoutroend={() => leavingRows--}
          >
            {#each tableRow.getVisibleCells() as cell (cell.id)}
              {#if cell.column.id === "actions"}
                <Table.Cell>{@render actions(row)}</Table.Cell>
              {:else if cell.column.id === "status"}
                <Table.Cell>
                  <Badge
                    variant={row.status === "active" ? "secondary" : "outline"}
                  >
                    {row.status === "active" ? "Active" : "Archived"}
                  </Badge>
                </Table.Cell>
              {:else if cell.column.id === "name"}
                <Table.Cell class="font-medium">{row.supplierName}</Table.Cell>
              {:else if cell.column.id === "address"}
                <Table.Cell class="text-muted-foreground whitespace-normal">
                  {row.businessAddress}
                </Table.Cell>
              {:else if cell.column.id === "tin"}
                <Table.Cell class="tabular-nums">
                  <TinText tin={row.tin} />
                </Table.Cell>
              {:else if cell.column.id === "contact"}
                <Table.Cell class="text-muted-foreground">
                  {#if row.contactNumber || row.email}
                    <span class="grid">
                      {#if row.contactNumber}
                        <span class="tabular-nums">{row.contactNumber}</span>
                      {/if}
                      {#if row.email}<span>{row.email}</span>{/if}
                    </span>
                  {:else}
                    —
                  {/if}
                </Table.Cell>
              {:else}
                <Table.Cell class="tabular-nums">
                  {row.philgepsNumber}
                </Table.Cell>
              {/if}
            {/each}
          </tr>
        {/each}
      </Table.Body>
    </Table.Root>

    <!-- Only when there is a second page, so a short list has no pager. -->
    {#if table.getPageCount() > 1}
      <div class="mt-3 flex items-center justify-end gap-4">
        <span class="text-muted-foreground text-sm">
          Page {table.atoms.pagination.get().pageIndex + 1} of
          {table.getPageCount()}
        </span>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onclick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onclick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    {/if}
  </ContentTransition>
</div>

<!-- The row's Edit button and menu, drawn here for this page's handlers. -->
{#snippet actions(row: Supplier)}
  <ButtonGroup.Root>
    <Button
      variant="secondary"
      size="sm"
      onclick={() => openForm(row)}
      class="border-r-0"
    >
      <Pencil />
      Edit
    </Button>
    <ButtonGroup.Separator />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={buttonVariants({ variant: "secondary", size: "icon-sm" })}
        disabled={pending.has(row.supplierPk)}
        aria-label="More actions"
      >
        <EllipsisVertical />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="min-w-max">
        {#if row.status === "active"}
          <DropdownMenu.Item onclick={() => setActive(row, false)}>
            <Archive /> Archive supplier
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item onclick={() => setActive(row, true)}>
            <ArchiveRestore /> Restore supplier
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item
          variant="destructive"
          onclick={() => {
            supplierToDelete = row;
            deleteOpen = true;
          }}
        >
          <Trash /> Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </ButtonGroup.Root>
{/snippet}

<Dialog.Root bind:open={formOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {supplierToEdit ? "Edit supplier" : "Add supplier"}
      </Dialog.Title>
      <Dialog.Description>
        {supplierToEdit
          ? "Changes show on every purchase order that names it."
          : "A business that the office buys from, as it is named on the purchase order."}
      </Dialog.Description>
    </Dialog.Header>
    {#key formKey}
      <SupplierForm
        {supplierToEdit}
        {onSaved}
        onCancel={() => (formOpen = false)}
      />
    {/key}
  </Dialog.Content>
</Dialog.Root>

<DeleteSupplierDialog
  bind:open={deleteOpen}
  {supplierToDelete}
  onDeleted={() => invalidateAll()}
/>

{#snippet emptyState()}
  {#if suppliers.length > 0}
    <!--
      Suppliers exist but none are on screen, because of the search or the
      tab, so it says which one to undo.
    -->
    <div class="rounded-lg border py-10 text-center">
      {#if searching}
        <p class="text-muted-foreground text-sm">
          No supplier matches your search.
        </p>
        <Button variant="link" size="sm" onclick={() => (search = "")}>
          Clear search
        </Button>
      {:else}
        <p class="text-muted-foreground text-sm">
          {statusFilter === "archived"
            ? "No archived suppliers."
            : "No active suppliers. Check the Archived tab."}
        </p>
      {/if}
    </div>
  {:else}
    <Empty.Root class="border py-12">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Store />
        </Empty.Media>
        <Empty.Title>No suppliers yet</Empty.Title>
        <Empty.Description>
          Add the business named on a purchase order, so it can be picked when
          the PO is added.
        </Empty.Description>
      </Empty.Header>
      {#if canManage}
        <Empty.Content>
          <Button onclick={() => openForm(null)}>
            <Plus />
            Add supplier
          </Button>
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
{/snippet}
