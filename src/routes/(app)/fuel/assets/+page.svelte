<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import AnimateContent from "@/components/transition/animate-content.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { deserialize } from "$app/forms";
  import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Search,
    CircleCheck,
    CircleOff,
    EllipsisVertical,
    Pencil,
    Plus,
    TagPlus,
    Trash,
    TriangleAlert,
    Truck,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";
  import type { AssetType } from "@/types";
  import { untrack } from "svelte";
  import { flip } from "svelte/animate";
  import AddEditAssetDialog from "./add-edit-asset-dialog.svelte";
  import type { AssetRow } from "./asset-row.js";
  import { columns, features } from "./columns.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import DeleteAssetDialog from "./delete-asset-dialog.svelte";
  import AssetTypesDialog from "./types/asset-types-dialog.svelte";
  import type { AssetTypeRow } from "./types/types.js";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("assets:manage"));

  // Held here rather than re-read from `data`, so a row added or edited in the
  // dialog appears without waiting for the page to reload.
  let assets = $state<AssetRow[]>(untrack(() => data.assets));

  // Held here rather than in the asset types dialog, because this page needs
  // them too: the add asset dialog picks from them, and whether any is active
  // decides whether an asset can be added at all.
  let assetTypes = $state<AssetTypeRow[]>(untrack(() => data.assetTypes));

  // An asset cannot be added until at least one type is active, so the add
  // button is disabled until then. Disabled rather than hidden, so the admin
  // can see the button exists and what is missing before it works.
  const hasActiveType = $derived(assetTypes.some((t) => t.status === "active"));

  /**
   * The asset types dialog is opened through the address, so a link or a
   * reload can open it too: `?asset-types` opens the dialog, and
   * `?asset-types=add` also opens the add dialog on top once the list has opened.
   */
  const TYPES_PARAM = "asset-types";

  const typesDialogOpen = $derived(page.url.searchParams.has(TYPES_PARAM));
  const addTypeRequested = $derived(
    page.url.searchParams.get(TYPES_PARAM) === "add",
  );

  /**
   * Every change replaces the history entry rather than adding one, so
   * opening the dialog, switching its tabs, and closing it never pile up
   * steps: Back always leaves the assets page for wherever the admin was
   * before it.
   */
  function goToTypes(value: "" | "add" | null) {
    const url = new URL(page.url);
    if (value === null) {
      url.searchParams.delete(TYPES_PARAM);
      // The dialog's tab goes with it, so reopening starts on Active.
      url.searchParams.delete("type-status");
    } else url.searchParams.set(TYPES_PARAM, value);
    goto(url, { noScroll: true, keepFocus: true, replaceState: true });
  }

  /** Renames and meter changes reach the asset rows without a reload. */
  function onTypeSaved(row: AssetType) {
    assets = assets.map((a) =>
      a.assetTypeFk === row.assetTypePk
        ? { ...a, assetTypeName: row.assetTypeName, meterType: row.meterType }
        : a,
    );
  }

  let dialogOpen = $state(false);
  let assetToEdit = $state<AssetRow | null>(null);

  let deleteDialogOpen = $state(false);
  let assetToDelete = $state<AssetRow | null>(null);

  /** Same order as the server: by name, then plate to split repeated names. */
  function sortRows(rows: AssetRow[]) {
    return [...rows].sort(
      (a, b) =>
        a.assetName.localeCompare(b.assetName) ||
        (a.plateNumber ?? "").localeCompare(b.plateNumber ?? ""),
    );
  }

  function openAdd() {
    // Checked here as well as on the button, because `disabled` can be
    // removed in the browser's dev tools. The server refuses such a save
    // anyway; this only stops a dialog opening with nothing to pick.
    if (!hasActiveType) return;
    assetToEdit = null;
    dialogOpen = true;
  }

  function openEdit(row: AssetRow) {
    assetToEdit = row;
    dialogOpen = true;
  }

  function openDelete(row: AssetRow) {
    assetToDelete = row;
    deleteDialogOpen = true;
  }

  /**
   * Every activate/deactivate toast shares this id, so a new one replaces
   * the one on screen instead of stacking under it. Only the latest change
   * then offers Undo, and there is never a pile of Undo buttons whose
   * targets the admin has to work out.
   */
  const STATUS_TOAST_ID = "asset-status";

  /** Rows with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /**
   * Switches an asset on or off straight from the row menu. No confirmation:
   * it is undone in one click from the toast, which costs nothing when the
   * admin meant it. Waits for the server before changing the row, since on
   * the office network the wait is not noticeable.
   */
  async function setActive(row: AssetRow, active: boolean) {
    pending.add(row.assetPk);
    try {
      const body = new FormData();
      body.set("assetPk", String(row.assetPk));
      body.set("status", active ? "active" : "inactive");
      const response = await fetch("?/setStatus", {
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
          `${row.assetName} not ${active ? "activated" : "deactivated"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }

      const updated = result.data?.updatedRow as AssetRow;
      assets = assets.map((a) => (a.assetPk === updated.assetPk ? updated : a));
      toast.success(
        `${row.assetName} ${active ? "activated" : "deactivated"}`,
        {
          id: STATUS_TOAST_ID,
          action: { label: "Undo", onClick: () => setActive(updated, !active) },
        },
      );
    } finally {
      pending.delete(row.assetPk);
    }
  }

  function onSaved(row: AssetRow, mode: "add" | "edit") {
    assets = sortRows(
      mode === "add"
        ? [...assets, row]
        : assets.map((a) => (a.assetPk === row.assetPk ? row : a)),
    );
  }

  function onDeleted(assetPk: number) {
    assets = assets.filter((a) => a.assetPk !== assetPk);
  }

  /**
   * Which assets the table shows, the same tabs as the asset types dialog.
   * Kept in the address so a reload keeps the view; `active` is the default
   * and so is never written there.
   */
  const STATUS_PARAM = "status";
  type StatusFilter = "active" | "inactive" | "all";

  const statusFilter = $derived.by<StatusFilter>(() => {
    const raw = page.url.searchParams.get(STATUS_PARAM);
    // Anything hand-typed that is not a real filter falls back to the default.
    return raw === "inactive" || raw === "all" ? raw : "active";
  });

  function setStatusFilter(next: string) {
    const url = new URL(page.url);
    if (next === "active") url.searchParams.delete(STATUS_PARAM);
    else url.searchParams.set(STATUS_PARAM, next);
    // Replaced, like the asset types dialog, so Back leaves the page instead
    // of stepping back through every tab that was clicked.
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  const counts = $derived({
    active: assets.filter((a) => a.status === "active").length,
    inactive: assets.filter((a) => a.status === "inactive").length,
    all: assets.length,
  });

  // The tab narrows the list before the table sees it, so an asset that is
  // deactivated on the Active tab leaves the table on its own, with its exit
  // animation, and the search only ever runs inside the chosen tab.
  const assetsInTab = $derived(
    statusFilter === "all"
      ? assets
      : assets.filter((a) => a.status === statusFilter),
  );

  let search = $state("");

  const table = createTable({
    features,
    columns,
    get data() {
      return assetsInTab;
    },
    // Keyed by the asset, not the position, so the row transitions below
    // follow the right asset when the list is sorted or searched.
    getRowId: (row) => String(row.assetPk),
    state: {
      get globalFilter() {
        return search;
      },
      // Only the All tab mixes both, so only there does a status column
      // tell anything.
      get columnVisibility() {
        return { status: statusFilter === "all" };
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

  // Narrowing the list can leave the current page past the end of it, which
  // reads as an empty table rather than as a search result.
  $effect(() => {
    search;
    statusFilter;

    untrack(() => {
      if (table.atoms.pagination.get().pageIndex !== 0) table.setPageIndex(0);
    });
  });

  /**
   * A row fades in only when it is new to a table that is already on screen,
   * the same rule as the asset types table and for the same reason.
   */
  let seenRows = new Set<number>();
  let tableWasVisible = false;

  $effect(() => {
    const showing = visibleRows.length > 0;
    seenRows = showing
      ? new Set(visibleRows.map((row) => row.original.assetPk))
      : new Set();
    tableWasVisible = showing;
  });

  /**
   * True while the search box has text. Rows then come and go on every
   * keystroke because the view narrowed, not because the data changed, so
   * they swap instantly: an animation per keystroke would trail the typing.
   * Switching tabs still animates, since that is one deliberate click.
   */
  const searching = $derived(search.trim() !== "");

  function rowIntro(assetPk: number) {
    const isNewToAVisibleTable = tableWasVisible && !seenRows.has(assetPk);
    if (!isNewToAVisibleTable || searching || prefersReducedMotion()) {
      return { duration: 0 };
    }
    return { duration: DURATION.item };
  }

  /**
   * Rows fading out right now. Horizontal overflow is clipped only while one
   * leaves; see the same counter in asset-types-dialog.svelte for why.
   */
  let leavingRows = $state(0);

  function rowFlip() {
    return {
      duration: searching || prefersReducedMotion() ? 0 : DURATION.item,
      easing: easeOut,
    };
  }
</script>

<svelte:head>
  <title>Assets - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/fuel">Fuel</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Assets</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <!--
    Wraps onto more lines on a narrow window instead of pushing the page
    wider: search, tabs and the two buttons need about 900px on one line.
  -->
  <div class="flex w-full max-w-5xl flex-wrap items-start gap-x-4 gap-y-2 pt-1">
    <div class="relative w-full sm:w-72">
      <Search
        class="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        disabled={assets.length <= 0}
        placeholder="Search name, plate, or property no."
        class="h-9 w-full ps-8"
        bind:value={search}
      />
    </div>

    {#snippet typeCount(count: any)}
      <span class="text-muted-foreground">{count}</span>
    {/snippet}

    <Tabs.Root
      value={statusFilter}
      onValueChange={setStatusFilter}
      class="ml-auto"
      disabled={assets.length <= 0}
    >
      <Tabs.List>
        <Tabs.Trigger value="active">
          Active {@render typeCount(counts.active)}
        </Tabs.Trigger>
        <Tabs.Trigger value="inactive">
          Inactive {@render typeCount(counts.inactive)}
        </Tabs.Trigger>
        <Tabs.Trigger value="all">
          All {@render typeCount(counts.all)}
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    <div class=" flex gap-2">
      <!--
        With no active type there is nothing to manage yet, only one to add,
        so the dialog opens straight into the add dialog.
      -->
      <Button
        variant="outline"
        onclick={() => goToTypes(hasActiveType || !canManage ? "" : "add")}
      >
        <TagPlus />
        {hasActiveType ? "Manage asset types" : "Set up asset types"}
      </Button>
      {#if canManage}
        <Button onclick={openAdd} disabled={!hasActiveType}>
          <Plus />
          Add asset
        </Button>
      {/if}
    </div>
  </div>

  {#if !hasActiveType}
    <!--
      Slides open and closed rather than popping, because it can now come and
      go without a reload: deactivating the last active type in the asset
      types dialog brings it in, and adding one takes it away.
    -->
    <AnimateContent class="w-full max-w-5xl pt-4">
      <Alert.Root variant="warning">
        <TriangleAlert />
        <Alert.Title>No active asset types</Alert.Title>
        <Alert.Description>
          <p>
            Add one to start adding assets. Each asset needs a type, like
            motorcycle or generator.
          </p>
        </Alert.Description>
      </Alert.Root>
    </AnimateContent>
  {/if}

  <ContentTransition
    isEmpty={visibleRows.length === 0}
    empty={emptyState}
    animated={!searching}
    class="w-full max-w-5xl pt-3"
  >
    <Table.Root
      containerClass={[
        "rounded-lg relative w-full min-w-0 overflow-x-auto rounded-lg border",
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
        <!-- A plain `<tr>` so it can carry transitions; see the asset types dialog. -->
        {#each visibleRows as tableRow (tableRow.id)}
          {@const row = tableRow.original}
          <tr
            data-slot="table-row"
            class="hover:bg-muted/50 border-b transition-colors"
            animate:flip={rowFlip()}
            in:itemIn={rowIntro(row.assetPk)}
            out:itemOut={{ duration: searching ? 0 : DURATION.exit }}
            onoutrostart={() => leavingRows++}
            onoutroend={() => leavingRows--}
          >
            {#each tableRow.getVisibleCells() as cell (cell.id)}
              {#if cell.column.id === "actions"}
                <Table.Cell>
                  {@render actions(row)}
                </Table.Cell>
              {:else if cell.column.id === "status"}
                <Table.Cell>
                  <Badge
                    variant={row.status === "active" ? "secondary" : "outline"}
                  >
                    {row.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
              {:else if cell.column.id === "name"}
                <Table.Cell class="font-medium">{row.assetName}</Table.Cell>
              {:else if cell.column.id === "type"}
                <Table.Cell class="text-muted-foreground">
                  {row.assetTypeName}
                </Table.Cell>
              {:else}
                <Table.Cell>{cell.getValue() || "—"}</Table.Cell>
              {/if}
            {/each}
          </tr>
        {/each}
      </Table.Body>
    </Table.Root>

    <!-- Only when there is a second page, so a short list has no pager. -->
    {#if table.getPageCount() > 1}
      <div class="mt-3 flex items-center justify-end gap-4">
        <span class="text-sm text-muted-foreground">
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

<!--
  The row's Edit button and menu. Drawn here rather than as a column
  component, because it needs this page's Edit, Delete and Activate handlers.
-->
{#snippet actions(row: AssetRow)}
  {#if canManage}
    <ButtonGroup.Root>
      <Button
        variant="secondary"
        size="sm"
        onclick={() => openEdit(row)}
        class="border-r-0"
      >
        <Pencil />
        Edit
      </Button>
      <ButtonGroup.Separator />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={buttonVariants({
            variant: "secondary",
            size: "icon-sm",
          })}
          disabled={pending.has(row.assetPk)}
          aria-label="More actions"
        >
          <EllipsisVertical />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {#if row.status === "active"}
            <DropdownMenu.Item onclick={() => setActive(row, false)}>
              <CircleOff /> Deactivate
            </DropdownMenu.Item>
          {:else}
            <DropdownMenu.Item onclick={() => setActive(row, true)}>
              <CircleCheck /> Activate
            </DropdownMenu.Item>
          {/if}

          <DropdownMenu.Item
            variant="destructive"
            onclick={() => openDelete(row)}
          >
            <Trash /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </ButtonGroup.Root>
  {/if}
{/snippet}

<AddEditAssetDialog
  bind:open={dialogOpen}
  {assetToEdit}
  {assetTypes}
  {onSaved}
/>

<AssetTypesDialog
  open={typesDialogOpen}
  onOpenChange={(open) => goToTypes(open ? "" : null)}
  bind:assetTypes
  openAddWhenReady={addTypeRequested}
  onAddOpened={() => goToTypes("")}
  {onTypeSaved}
  {assets}
/>

<DeleteAssetDialog
  bind:open={deleteDialogOpen}
  {assetToDelete}
  {onDeleted}
  onDeactivate={(row) => setActive(row, false)}
/>

{#snippet emptyState()}
  {#if assets.length > 0}
    <!--
      Assets exist but none are on screen, because of the search or the tab.
      Saying "no assets" would be wrong here, so it says which one to undo.
    -->
    <div class="rounded-lg border py-10 text-center">
      {#if searching}
        <p class="text-sm text-muted-foreground">
          No asset matches your search.
        </p>
        <Button variant="link" size="sm" onclick={() => (search = "")}>
          Clear search
        </Button>
      {:else}
        <p class="text-sm text-muted-foreground">
          {statusFilter === "inactive"
            ? "No inactive assets."
            : "No active assets. Check the Inactive tab."}
        </p>
      {/if}
    </div>
  {:else}
    <Empty.Root class="border py-12">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Truck />
        </Empty.Media>
        <Empty.Title>No assets yet</Empty.Title>
        <Empty.Description>
          Add each vehicle, boat, and machine the office owns, so fuel can be
          recorded against it.
        </Empty.Description>
      </Empty.Header>
      {#if canManage}
        <Empty.Content>
          <Button onclick={openAdd} disabled={!hasActiveType}>
            <Plus />
            Add asset
          </Button>
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
{/snippet}
