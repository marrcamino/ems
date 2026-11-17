<script lang="ts">
  import type { PageProps } from "./$types";
  import Header from "@/components/header.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import {
    ChevronDown,
    Copy,
    EllipsisVertical,
    HandCoins,
    Pencil,
    Plus,
    Printer,
    RotateCcwClock,
    Route,
  } from "@lucide/svelte/icons";
  import { createTable, FlexRender } from "@tanstack/svelte-table";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { formatDate } from "$lib/utils/format-date.js";
  import {
    FUEL_LABELS,
    FUELS,
    PO_TYPE_LABELS,
    type Fuel,
  } from "./purchase-orders/po-math.js";
  import type { WithdrawalRow } from "./withdrawal-row.js";
  import { columns, features } from "./withdrawal-columns.js";
  import { runningWidth, shortNumber } from "$lib/utils/form-numbers.js";
  import {
    STATUS_BADGE,
    STATUS_LABELS,
    type WithdrawalStatus,
  } from "./withdrawal-status.js";
  import { searchWithdrawals } from "./withdrawal-search.js";
  import SearchInput from "@/components/search-input.svelte";
  import SortIcon from "@/components/sort-icon.svelte";
  import FilterCombobox from "./filter-combobox.svelte";
  import RadioTabs, { type RadioTab } from "@/components/radio-tabs.svelte";
  import StartingNumbersNote from "@/components/starting-numbers-note.svelte";
  import NewWithdrawalDialog from "./new-withdrawal-dialog.svelte";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import * as Empty from "$lib/components/ui/empty/index.js";

  let { data }: PageProps = $props();

  const gblCtx = getGlobalContext();
  const canRecord = $derived(gblCtx.can("fuel:record"));

  let newWithdrawalOpen = $state(false);

  // The sidebar's + beside Fuel links to /fuel?new=withdrawal, which opens
  // the form. The ?new is dropped when the form closes, not when it opens:
  // on a fresh page load the router is not ready yet, and replaceState
  // throws.
  $effect(() => {
    if (
      page.url.searchParams.get("new") === "withdrawal" &&
      canRecord &&
      data.cutoverDone
    ) {
      newWithdrawalOpen = true;
    }
  });

  function setNewWithdrawalOpen(open: boolean) {
    newWithdrawalOpen = open;
    if (open || !page.url.searchParams.has("new")) return;
    const url = new URL(page.url);
    url.searchParams.delete("new");
    replaceState(url, page.state);
  }

  /** By file date, then by the order of entry, as the server sends them. */
  const withdrawals = $derived(data.withdrawals);

  // Every active office, so one with no withdrawals can still be picked.
  const officeOptions = $derived(
    data.offices.map((office) => ({ value: office.abbr, label: office.abbr })),
  );

  const fuelOptions = FUELS.map((fuel) => ({
    value: fuel,
    label: FUEL_LABELS[fuel],
  }));

  /** The tabs' order: what waits on GSU first, then what is done. */
  const TAB_STATUSES: WithdrawalStatus[] = [
    "waiting",
    "out",
    "incomplete",
    "complete",
    "cancelled",
  ];
  // Shorter than the badge's "Waiting for approval", to keep the tabs on one line.
  const TAB_LABELS: Record<WithdrawalStatus, string> = {
    ...STATUS_LABELS,
    waiting: "For approval",
  };
  let statusTab = $state<"all" | WithdrawalStatus>("all");

  // Nothing picked in a filter shows everything.
  let selectedOffices = $state<string[]>([]);
  let selectedFuels = $state<string[]>([]);
  let search = $state("");
  const searching = $derived(search.trim() !== "");
  const filtering = $derived(
    selectedOffices.length > 0 || selectedFuels.length > 0,
  );

  function clearFilters() {
    selectedOffices = [];
    selectedFuels = [];
  }

  // The filters and the search hide rows; they never take them out of the
  // table. Building a row again is what costs time (up to 0.9 s to bring
  // back 59 rows on a slow computer, measured 28 October 2026), and hiding
  // or showing one is almost free.
  const filtered = $derived(
    withdrawals.filter(
      (w) =>
        (selectedOffices.length === 0 || selectedOffices.includes(w.office)) &&
        (selectedFuels.length === 0 || selectedFuels.includes(w.fuel)),
    ),
  );

  // Every form number that the filters leave, so they all show the same
  // number of digits. Counted before the search, so the numbers do not
  // change length while a search is typed.
  const width = $derived(
    runningWidth(
      filtered.flatMap((w) => [
        w.controlNumber,
        w.wsNumber,
        w.risNumber,
        w.tripTicketNumber,
      ]),
    ),
  );

  // The status tabs sit above the filters and the search, so each tab counts
  // what they leave, and picking a tab narrows the list last.
  const searched = $derived(searchWithdrawals(filtered, search, width));
  const withdrawalsShown = $derived(
    statusTab === "all"
      ? searched
      : searched.filter((w) => w.status === statusTab),
  );
  const statusTabs = $derived<RadioTab<"all" | WithdrawalStatus>[]>([
    { value: "all", label: "All", count: searched.length },
    ...TAB_STATUSES.map((status) => ({
      value: status,
      label: TAB_LABELS[status],
      count: searched.filter((w) => w.status === status).length,
    })),
  ]);

  const shownIds = $derived(new Set(withdrawalsShown.map((w) => String(w.id))));

  const table = createTable({
    features,
    columns,
    get data() {
      return withdrawals;
    },
    getRowId: (row) => String(row.id),
  });

  /** Every row, sorted, the hidden ones included. */
  const sortedRows = $derived(table.getRowModel().rows);

  /** Each shown row's place in the list, so the # counts 1, 2, 3 on screen. */
  const rowNumbers = $derived.by(() => {
    const numbers = new Map<string, number>();
    for (const row of sortedRows) {
      if (shownIds.has(row.id)) numbers.set(row.id, numbers.size + 1);
    }
    return numbers;
  });

  /** The forms under the control number, as the line under it reads. */
  function formsLine(row: WithdrawalRow) {
    if (row.kind === "trip") return "Trip only";
    const parts: string[] = [];
    if (row.wsNumber) parts.push(`WS ${shortNumber(row.wsNumber, width)}`);
    if (row.risNumber) parts.push(`RIS ${shortNumber(row.risNumber, width)}`);
    if (row.kind === "reimbursed") parts.push("Reimbursed trip");
    return parts.join(" · ");
  }

  /** The hover text of a balance, saying why its liters are or are not exact. */
  function balanceHint(row: WithdrawalRow) {
    if (!row.poType) return undefined;
    const type = PO_TYPE_LABELS[row.poType];
    return row.poType === "price"
      ? `${row.poNumber} is ${type}, so the liters are an estimate from the last known price.`
      : `${row.poNumber} is ${type}, so its price does not change.`;
  }

  const countLabel = (n: number) =>
    `${n} ${n === 1 ? "withdrawal" : "withdrawals"}`;

  const NUMBER_COLUMNS = new Set(["rowNumber", "withdrawn", "balance"]);

  // Teal for diesel and red-orange for gasoline, kept clear of the blue,
  // green, red, and yellow that mean info, success, danger, and warning.
  const FUEL_BADGE: Record<Fuel, string> = {
    diesel:
      "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300",
    gasoline:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  };
</script>

<svelte:head>
  <title>Fuel - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>Fuel withdrawals</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex h-[calc(100svh-4rem)] min-w-0 flex-col items-center pt-0 px-2">
  {#if !data.cutoverDone}
    <StartingNumbersNote
      canSet={gblCtx.can("fuel:set_starting_numbers")}
      class="w-full px-1 pb-3"
    />
  {/if}
  <div class="w-full px-1">
    <RadioTabs legend="Status" tabs={statusTabs} bind:value={statusTab} />
  </div>

  <div class="flex w-full flex-wrap items-center gap-x-2 gap-y-2 pt-3">
    <SearchInput
      bind:value={search}
      class="w-full sm:w-80"
      placeholder="Search asset, driver, remarks, or number"
    />

    <!-- Someone who sees one office has nothing to filter by office. -->
    {#if data.allOffices}
      <FilterCombobox
        name="office"
        plural="offices"
        searchable
        options={officeOptions}
        bind:selected={selectedOffices}
        class="w-48"
      />
    {/if}
    <FilterCombobox
      name="fuel"
      plural="fuels"
      options={fuelOptions}
      bind:selected={selectedFuels}
    >
      {#snippet option(item)}
        <Badge variant="outline" class={FUEL_BADGE[item.value as Fuel]}>
          {item.label}
        </Badge>
      {/snippet}
    </FilterCombobox>

    <span class="ml-auto text-sm text-muted-foreground tabular-nums">
      {withdrawalsShown.length === withdrawals.length
        ? countLabel(withdrawals.length)
        : `${withdrawalsShown.length} of ${countLabel(withdrawals.length)}`}
    </span>

    <!--
      A withdrawal is the common case; the two trips without a withdrawal
      slip wait in the menu. The two trips open no form yet.
    -->
    {#if canRecord}
      <!-- Disabled with no reason beside it: the note above says why. -->
      <ButtonGroup.Root>
        <Button
          onclick={() => (newWithdrawalOpen = true)}
          disabled={!data.cutoverDone}
        >
          <Plus />
          New withdrawal
        </Button>
        <ButtonGroup.Separator />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class={buttonVariants({ size: "icon" })}
            aria-label="More ways to add"
            disabled={!data.cutoverDone}
          >
            <ChevronDown />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="min-w-max">
            <DropdownMenu.Item><Route />Trip only</DropdownMenu.Item>
            <DropdownMenu.Item><HandCoins /> Reimbursed trip</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </ButtonGroup.Root>
    {/if}
  </div>

  <!--
    A sticky header sticks inside its nearest scrolling box. The table must
    scroll sideways for the wide columns, and the header only sticks if that
    same box scrolls up and down too. So the scroll area takes the rest of the
    screen and scrolls both ways, with the header pinned to its top. The
    table's own box is told not to scroll, or it would become the nearest
    scrolling box instead.
  -->
  <div class="flex min-h-0 w-full flex-1 flex-col pt-3">
    <ScrollArea
      orientation="both"
      class="flex min-h-0 flex-col rounded-lg border"
      viewPortClasses="min-h-0 pb-2.5"
      scrollbarYClasses="z-20 [&>[data-slot=scroll-area-thumb]]:bg-muted-foreground"
      scrollbarXClasses="[&>[data-slot=scroll-area-thumb]]:bg-muted-foreground"
      type="always"
    >
      <Table.Root containerClass="overflow-visible">
        <Table.Header>
          {#each table.getHeaderGroups() as group (group.id)}
            <Table.Row>
              {#each group.headers as header (header.id)}
                <!--
                  Solid, not see-through, so rows do not show through it while
                  they scroll under. The line under it is a shadow, because a
                  cell border scrolls away with the rows.
                -->
                <Table.Head
                  class={[
                    "sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_var(--border)]",
                    NUMBER_COLUMNS.has(header.column.id) && "text-right",
                    header.column.id === "actions" && "right-0 z-20 w-0",
                  ]}
                >
                  {#if !header.isPlaceholder}
                    {#if header.column.getCanSort()}
                      <button
                        type="button"
                        class={[
                          "flex select-none items-center gap-1",
                          NUMBER_COLUMNS.has(header.column.id) && "ml-auto",
                        ]}
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
          {#if withdrawals.length === 0}
            <Table.Row class="hover:bg-transparent">
              <Table.Cell colspan={columns.length} class="py-6">
                <Empty.Root>
                  <Empty.Header>
                    <Empty.Title>No withdrawals yet</Empty.Title>
                    <Empty.Description>
                      Withdrawals show here once they are saved.
                    </Empty.Description>
                  </Empty.Header>
                  {#if canRecord}
                    <Empty.Content>
                      <Button
                        onclick={() => (newWithdrawalOpen = true)}
                        disabled={!data.cutoverDone}
                      >
                        <Plus />
                        New withdrawal
                      </Button>
                    </Empty.Content>
                  {/if}
                </Empty.Root>
              </Table.Cell>
            </Table.Row>
          {:else if withdrawalsShown.length === 0}
            <!--
              Rows exist but the search or the filters hide all of them. The
              button undoes the search first, since it is the quickest to
              type again, then the filters, and last the status tab.
            -->
            <Table.Row class="hover:bg-transparent">
              <Table.Cell colspan={columns.length} class="py-10 text-center">
                <p class="text-sm text-muted-foreground">
                  No matching withdrawals
                </p>
                {#if searching}
                  <Button
                    variant="link"
                    size="sm"
                    onclick={() => (search = "")}
                  >
                    Clear search
                  </Button>
                {:else if filtering}
                  <Button variant="link" size="sm" onclick={clearFilters}>
                    Clear filters
                  </Button>
                {:else}
                  <!-- Only the status tab hides them; its count already says 0. -->
                  <Button
                    variant="link"
                    size="sm"
                    onclick={() => (statusTab = "all")}
                  >
                    Show all
                  </Button>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/if}
          {#each sortedRows as tableRow (tableRow.id)}
            {@const row = tableRow.original}
            <!--
              Top-aligned, so the one-line cells sit level with the first
              line of the two-line cells.
            -->
            <Table.Row
              class="group [&>td]:align-top"
              hidden={!shownIds.has(tableRow.id)}
            >
              {#each tableRow.getVisibleCells() as cell (cell.id)}
                {#if cell.column.id === "rowNumber"}
                  <Table.Cell
                    class="text-right tabular-nums text-muted-foreground"
                  >
                    {rowNumbers.get(tableRow.id)}
                  </Table.Cell>
                {:else if cell.column.id === "fileDate"}
                  <Table.Cell>
                    {formatDate(row.fileDate)}
                  </Table.Cell>
                {:else if cell.column.id === "office"}
                  <Table.Cell>
                    <Badge variant="secondary">{row.office}</Badge>
                  </Table.Cell>
                {:else if cell.column.id === "slip"}
                  <Table.Cell>
                    <div class="flex items-center gap-1.5">
                      <span class="font-semibold tabular-nums">
                        CN {shortNumber(row.controlNumber, width)}
                      </span>
                      <!-- What the office prefix on the paper used to tell. -->
                      <Badge
                        variant="outline"
                        class="h-4.5 bg-muted/40 px-1.5 text-[11px] text-muted-foreground tabular-nums"
                        title="{row.office}'s no. {row.officeCount} in {row.fileDate.slice(
                          0,
                          4,
                        )}"
                      >
                        #{row.officeCount}
                      </Badge>
                    </div>
                    <div class="text-xs text-muted-foreground tabular-nums">
                      {formsLine(row)}
                    </div>
                  </Table.Cell>
                {:else if cell.column.id === "status"}
                  <Table.Cell>
                    <Badge class={STATUS_BADGE[row.status]}>
                      {STATUS_LABELS[row.status]}
                    </Badge>
                  </Table.Cell>
                {:else if cell.column.id === "withdrawn"}
                  <Table.Cell class="text-right tabular-nums">
                    <div class="flex items-center justify-end gap-1.5">
                      <Badge variant="outline" class={FUEL_BADGE[row.fuel]}>
                        {FUEL_LABELS[row.fuel]}
                      </Badge>
                      {#if row.withdrawnH !== null}
                        <span class="font-medium">
                          {formatLiters(row.withdrawnH)}
                        </span>
                      {:else if row.boughtH !== null}
                        <span class="font-medium">
                          {formatLiters(row.boughtH)}
                        </span>
                      {:else}
                        <span class="text-muted-foreground">—</span>
                      {/if}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {#if row.kind === "trip"}
                        No fuel taken
                      {:else if row.kind === "reimbursed"}
                        Bought during the trip
                      {:else if row.amountC !== null && row.priceC !== null}
                        {formatPesos(row.amountC)} at {formatPesos(
                          row.priceC,
                        )}/L
                      {:else if row.requestedH !== null}
                        Requested {formatLiters(row.requestedH)}
                      {:else if row.requestedC !== null}
                        Requested {formatPesos(row.requestedC)}
                      {/if}
                    </div>
                  </Table.Cell>
                {:else if cell.column.id === "balance"}
                  <Table.Cell class="text-right tabular-nums">
                    <!-- A trip does not count down any allocation. -->
                    {#if row.balanceH === null || row.balanceC === null}
                      <span class="text-muted-foreground">—</span>
                    {:else}
                      <div title={balanceHint(row)}>
                        <div>
                          {row.poType === "price" ? "≈ " : ""}{formatLiters(
                            row.balanceH,
                          )}
                        </div>
                        <div class="text-xs text-muted-foreground">
                          {formatPesos(row.balanceC)}
                        </div>
                      </div>
                    {/if}
                  </Table.Cell>
                {:else if cell.column.id === "assetAndTrip"}
                  <Table.Cell>
                    <div>{row.asset}</div>
                    <div class="text-xs text-muted-foreground tabular-nums">
                      {#if row.tripTicketNumber}
                        DTT {shortNumber(row.tripTicketNumber, width)} &bull; {row.driver}
                      {:else}
                        No trip ticket
                      {/if}
                    </div>
                  </Table.Cell>
                {:else if cell.column.id === "remarks"}
                  <Table.Cell
                    class="max-w-50 min-w-40 pr-4 whitespace-normal text-muted-foreground"
                  >
                    {row.remarks}
                  </Table.Cell>
                {:else if cell.column.id === "actions"}
                  <Table.Cell>
                    <!-- None of these does anything yet. -->
                    <ButtonGroup.Root>
                      <Button variant="secondary" size="sm" class="border-r-0">
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
                          aria-label="More actions"
                        >
                          <EllipsisVertical />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="min-w-max">
                          <DropdownMenu.Item
                            ><Printer /> Print</DropdownMenu.Item
                          >
                          <DropdownMenu.Item>
                            <Copy /> Copy control number
                          </DropdownMenu.Item>
                          <DropdownMenu.Item>
                            <RotateCcwClock /> View history
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </ButtonGroup.Root>
                  </Table.Cell>
                {/if}
              {/each}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </ScrollArea>
  </div>
</div>

{#if canRecord}
  <NewWithdrawalDialog
    bind:open={() => newWithdrawalOpen, setNewWithdrawalOpen}
    {data}
  />
{/if}
