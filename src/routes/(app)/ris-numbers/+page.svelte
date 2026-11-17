<script lang="ts">
  import { deserialize } from "$app/forms";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import { formatDate } from "$lib/utils/format-date.js";
  import {
    formNumber,
    runningWidth,
    shortNumber,
  } from "$lib/utils/form-numbers.js";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import SearchInput from "@/components/search-input.svelte";
  import SortIcon from "@/components/sort-icon.svelte";
  import StartingNumbersNote from "@/components/starting-numbers-note.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import {
    ChevronLeft,
    ChevronRight,
    CircleOff,
    EllipsisVertical,
    FileDigit,
    Pencil,
    Plus,
    RotateCcw,
    Trash,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { flip } from "svelte/animate";
  import { SvelteSet } from "svelte/reactivity";
  import { columns, features } from "./columns.js";
  import DeleteReservationDialog from "./delete-reservation-dialog.svelte";
  import NotUsedDialog from "./not-used-dialog.svelte";
  import ReservationDialog from "./reservation-dialog.svelte";
  import {
    newerThan,
    notNewestMessage,
    remarksOf,
    risOrder,
    type Reusable,
    STATUS_BADGE,
    STATUS_LABELS,
    type ListRow,
    type RisRow,
  } from "./ris-row.js";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("ris_numbers:manage"));

  // Held here rather than re-read from `data`, so a number reserved or
  // changed in a dialog shows without waiting for the page to reload.
  let rows = $state<RisRow[]>(untrack(() => data.rows));

  const width = $derived(runningWidth(rows.map((r) => r.risNumber)));
  const listRows = $derived<ListRow[]>(
    rows.map((r) => ({ ...r, shortNumber: shortNumber(r.risNumber, width) })),
  );

  let reservationDialogOpen = $state(false);
  let reservationToEdit = $state<ListRow | null>(null);
  let notUsedDialogOpen = $state(false);
  let rowToMark = $state<ListRow | null>(null);
  let deleteDialogOpen = $state(false);
  let rowToDelete = $state<ListRow | null>(null);

  function openReserve() {
    // The server refuses it too; this only stops a dialog that cannot save.
    if (!data.cutoverDone) return;
    reservationToEdit = null;
    reservationDialogOpen = true;
  }

  function openEdit(row: ListRow) {
    reservationToEdit = row;
    reservationDialogOpen = true;
  }

  function openDelete(row: ListRow) {
    rowToDelete = row;
    deleteDialogOpen = true;
  }

  /** Why the list already shows that a reservation cannot be deleted. */
  const deleteBlocked = $derived.by(() => {
    if (!rowToDelete) return undefined;
    const newer = newerThan(
      rowToDelete.risNumber,
      rows.map((r) => r.risNumber),
    );
    return newer ? notNewestMessage(shortNumber(newer, width)) : undefined;
  });

  function onDeleted(id: number) {
    rows = rows.filter((r) => r.id !== id);
  }

  function openNotUsed(row: ListRow) {
    rowToMark = row;
    notUsedDialogOpen = true;
  }

  function replaceRow(updated: RisRow) {
    rows = rows.map((r) =>
      r.id !== null && r.id === updated.id ? updated : r,
    );
  }

  function onSaved(row: RisRow, mode: "add" | "edit", reusedId: number | null) {
    if (mode === "edit") {
      replaceRow(row);
      return;
    }
    rows = [row, ...rows.filter((r) => r.id === null || r.id !== reusedId)];
  }

  /**
   * The newest number of this year, when it is a reservation marked not
   * used: the next RIS takes it again with this month (point 6.5). The
   * server decides again on Reserve; this only fills in the dialog.
   */
  const reusable = $derived.by<Reusable | null>(() => {
    const day = today(getLocalTimeZone()).toString();
    const ofYear = rows.filter((r) => r.risNumber.startsWith(day.slice(0, 5)));
    if (ofYear.length === 0) return null;
    const newest = ofYear.reduce((a, b) =>
      risOrder(b.risNumber) > risOrder(a.risNumber) ? b : a,
    );
    if (newest.id === null || newest.status !== "not_used") return null;
    const running = Number(newest.risNumber.split("-").at(-1));
    return {
      id: newest.id,
      again: shortNumber(formNumber(day, running), width),
      instead: shortNumber(formNumber(day, running + 1), width),
      reason: newest.notUsedReason,
    };
  });

  /**
   * Every status toast shares this id, so a new one replaces the one on
   * screen instead of stacking under it, and only the latest offers Undo.
   */
  const STATUS_TOAST_ID = "ris-status";

  /** Rows with a change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /**
   * Puts a number that was marked not used back to reserved. No
   * confirmation: the menu offers Mark as not used again, so it is undone in
   * one step.
   */
  async function markReserved(row: RisRow) {
    if (row.id === null) return;
    const short = shortNumber(row.risNumber, width);
    pending.add(row.id);
    try {
      const body = new FormData();
      body.set("id", String(row.id));
      const response = await fetch("?/markReserved", {
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
        toast.error(`RIS ${short} not changed`, {
          id: STATUS_TOAST_ID,
          description: error ?? "Try again.",
        });
        return;
      }

      replaceRow(result.data?.updatedRow as RisRow);
      toast.success(`RIS ${short} reserved again`, { id: STATUS_TOAST_ID });
    } finally {
      pending.delete(row.id);
    }
  }

  function onMarkedNotUsed(row: RisRow) {
    replaceRow(row);
    toast.success(`RIS ${shortNumber(row.risNumber, width)} marked not used`, {
      id: STATUS_TOAST_ID,
      action: { label: "Undo", onClick: () => markReserved(row) },
      duration: 10000,
    });
  }

  let search = $state("");

  const table = createTable({
    features,
    columns,
    get data() {
      return listRows;
    },
    // Keyed by the number, so the row transitions follow the right number
    // when the list is sorted or searched.
    getRowId: (row) => row.risNumber,
    state: {
      get globalFilter() {
        return search;
      },
      columnVisibility: { search: false },
    },
    onGlobalFilterChange: (updater) => {
      search = typeof updater === "function" ? updater(search) : updater;
    },
    globalFilterFn: "includesString",
    initialState: {
      sorting: [{ id: "number", desc: true }],
      pagination: { pageIndex: 0, pageSize: 15 },
    },
  });

  const visibleRows = $derived(table.getRowModel().rows);

  // Narrowing the list can leave the current page past the end of it, which
  // reads as an empty table rather than as a search result.
  $effect(() => {
    search;
    untrack(() => {
      if (table.atoms.pagination.get().pageIndex !== 0) table.setPageIndex(0);
    });
  });

  /**
   * A row fades in only when it is new to a table that is already on screen,
   * the same rule as the assets table and for the same reason.
   */
  let seenRows = new Set<string>();
  let tableWasVisible = false;

  $effect(() => {
    const showing = visibleRows.length > 0;
    seenRows = showing
      ? new Set(visibleRows.map((row) => row.original.risNumber))
      : new Set();
    tableWasVisible = showing;
  });

  // While the search box has text, rows come and go on every keystroke, so
  // they swap instantly; an animation per keystroke would trail the typing.
  const searching = $derived(search.trim() !== "");

  function rowIntro(risNumber: string) {
    const isNewToAVisibleTable = tableWasVisible && !seenRows.has(risNumber);
    if (!isNewToAVisibleTable || searching || prefersReducedMotion()) {
      return { duration: 0 };
    }
    return { duration: DURATION.item };
  }

  /** Rows fading out right now; horizontal overflow is clipped only then. */
  let leavingRows = $state(0);

  function rowFlip() {
    return {
      duration: searching || prefersReducedMotion() ? 0 : DURATION.item,
      easing: easeOut,
    };
  }
</script>

<svelte:head>
  <title>RIS Numbers - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>RIS Numbers</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  {#if !data.cutoverDone}
    <StartingNumbersNote
      canSet={gblCtx.can("fuel:set_starting_numbers")}
      class="w-full max-w-5xl pt-1 pb-3"
    />
  {/if}

  <div class="flex w-full max-w-5xl flex-wrap items-start gap-x-4 gap-y-2 pt-1">
    <SearchInput
      bind:value={search}
      class="w-full sm:w-72"
      placeholder="Search number, purpose, or name"
      disabled={rows.length <= 0}
    />

    {#if canManage}
      <!-- Disabled with no reason beside it: the note above says why. -->
      <Button
        class="ml-auto"
        onclick={openReserve}
        disabled={!data.cutoverDone}
      >
        <Plus />
        Reserve next number
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
                      <SortIcon
                        type={header.column.columnDef.meta?.sortIcon}
                        sorted={header.column.getIsSorted()}
                      />
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
        <!-- A plain `<tr>` so it can carry transitions; see the assets page. -->
        {#each visibleRows as tableRow (tableRow.id)}
          {@const row = tableRow.original}
          <tr
            data-slot="table-row"
            class="hover:bg-muted/50 border-b transition-colors"
            animate:flip={rowFlip()}
            in:itemIn={rowIntro(row.risNumber)}
            out:itemOut={{ duration: searching ? 0 : DURATION.exit }}
            onoutrostart={() => leavingRows++}
            onoutroend={() => leavingRows--}
          >
            {#each tableRow.getVisibleCells() as cell (cell.id)}
              {#if cell.column.id === "number"}
                <Table.Cell class="font-medium tabular-nums">
                  {row.shortNumber}
                </Table.Cell>
              {:else if cell.column.id === "date"}
                <Table.Cell class="text-muted-foreground whitespace-nowrap">
                  {formatDate(row.date)}
                </Table.Cell>
              {:else if cell.column.id === "purpose"}
                <Table.Cell>
                  <div class="max-w-sm truncate" title={row.purpose}>
                    {row.purpose}
                  </div>
                  {#if row.controlNumber}
                    <div class="text-muted-foreground text-xs">
                      Withdrawal {shortNumber(row.controlNumber, 3)}
                    </div>
                  {/if}
                </Table.Cell>
              {:else if cell.column.id === "reservedBy"}
                <Table.Cell class="text-muted-foreground">
                  {row.reservedBy}
                </Table.Cell>
              {:else if cell.column.id === "status"}
                <Table.Cell>
                  <Badge class={STATUS_BADGE[row.status]}>
                    {STATUS_LABELS[row.status]}
                  </Badge>
                </Table.Cell>
              {:else if cell.column.id === "remarks"}
                <Table.Cell class="text-muted-foreground">
                  <div class="max-w-xs truncate" title={remarksOf(row)}>
                    {remarksOf(row) || "—"}
                  </div>
                </Table.Cell>
              {:else if cell.column.id === "actions"}
                <Table.Cell>
                  {@render actions(row)}
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
  The row's menu. A fuel withdrawal's number belongs to the Fuel page, so
  its row has none.
-->
{#snippet actions(row: ListRow)}
  {#if canManage && row.id !== null}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={buttonVariants({ variant: "secondary", size: "icon-sm" })}
        disabled={pending.has(row.id)}
        aria-label="More actions"
      >
        <EllipsisVertical />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-max">
        <DropdownMenu.Item onclick={() => openEdit(row)}>
          <Pencil /> Edit
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        {#if row.status === "reserved"}
          <DropdownMenu.Item onclick={() => openNotUsed(row)}>
            <CircleOff /> Mark as not used
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item onclick={() => markReserved(row)}>
            <RotateCcw /> Mark as reserved again
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          variant="destructive"
          onclick={() => openDelete(row)}
        >
          <Trash /> Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
{/snippet}

<ReservationDialog
  bind:open={reservationDialogOpen}
  {reservationToEdit}
  {reusable}
  {onSaved}
/>

<DeleteReservationDialog
  bind:open={deleteDialogOpen}
  row={rowToDelete}
  blockedReason={deleteBlocked}
  {onDeleted}
/>

<NotUsedDialog
  bind:open={notUsedDialogOpen}
  row={rowToMark}
  onMarked={onMarkedNotUsed}
/>

{#snippet emptyState()}
  {#if rows.length > 0}
    <!-- Numbers exist but none match the search, so "no numbers" would be wrong. -->
    <div class="rounded-lg border py-10 text-center">
      <p class="text-sm text-muted-foreground">
        No RIS number matches your search.
      </p>
      <Button variant="link" size="sm" onclick={() => (search = "")}>
        Clear search
      </Button>
    </div>
  {:else}
    <Empty.Root class="border py-12">
      <Empty.Header>
        <Empty.Media variant="icon">
          <FileDigit />
        </Empty.Media>
        <Empty.Title>No RIS numbers yet</Empty.Title>
        <Empty.Description>
          Reserve the next number before an RIS is written, so that no two forms
          get the same number.
        </Empty.Description>
      </Empty.Header>
      {#if canManage}
        <Empty.Content>
          <Button onclick={openReserve} disabled={!data.cutoverDone}>
            <Plus />
            Reserve next number
          </Button>
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
{/snippet}
