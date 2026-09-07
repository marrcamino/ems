<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { CalendarPlus, Pencil, TriangleAlert } from "@lucide/svelte/icons";
  import AddChangeDialog from "./add-change-dialog.svelte";
  import {
    fullName,
    getEmployeesContext,
    type HistoryEntry,
  } from "./context.svelte.js";
  import CorrectEntryDialog from "./correct-entry-dialog.svelte";

  const ctx = getEmployeesContext();
  const gblCtx = getGlobalContext();

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Split by hand rather than parsed into a Date. These are calendar dates
  // with no time, and turning one into a Date is what makes it show the day
  // before once a timezone is applied to it.
  function formatDay(day: string): string {
    const [year, month, date] = day.split("-").map(Number);
    return `${date} ${MONTHS[month - 1]} ${year}`;
  }

  function datesOf(entry: HistoryEntry): string {
    const until = entry.validUntil ? formatDay(entry.validUntil) : "now";
    return `${formatDay(entry.validFrom)} to ${until}`;
  }

  function nameOf(entry: HistoryEntry): string {
    return [entry.firstName, entry.middleName, entry.lastName, entry.suffix]
      .filter(Boolean)
      .join(" ");
  }

  const canEdit = $derived(gblCtx.can("admin:manage_employees"));

  // Somebody who has left has no entry in use to close, so the server refuses
  // a change for them. Left out here rather than offered and then refused.
  const canAddChange = $derived(
    canEdit && ctx.employeeForHistory?.employmentStatus === "active",
  );

  function correct(entry: HistoryEntry) {
    ctx.startEditingEntry(entry);
    ctx.correctEntryDialog = true;
  }

  function addChange() {
    ctx.employeeToChange = ctx.employeeForHistory;
    ctx.addChangeDialog = true;
  }
</script>

<Sheet.Root
  bind:open={ctx.historySheet}
  onOpenChangeComplete={(open) => {
    if (!open) ctx.resetHistoryPanel();
  }}
>
  <Sheet.Content side="right" class=" sm:max-w-xl">
    <ScrollArea
      viewPortClasses="px-4 max-h-dvh scroll-fade-b"
      class="flex w-full flex-col "
    >
      <Sheet.Header
        class="px-0 sticky top-0 bg-linear-to-b from-popover to-transparent from-75%"
      >
        <Sheet.Title>Name and position history</Sheet.Title>
        <Sheet.Description>
          {#if ctx.employeeForHistory}
            This list shows each name and position of <strong
              >{fullName(ctx.employeeForHistory)}</strong
            >, and the dates each one was in use. A document shows the entry
            that was in use on the date written on the document.
          {/if}
        </Sheet.Description>

        {#if canAddChange}
          <!--
          Sits above the list on purpose. Whoever is about to record a change
          reads what is already in use first, which is what stops a second
          entry saying the same thing as the one below it.
        -->
          <div class="ml-auto">
            <Button size="sm" onclick={addChange}>
              <CalendarPlus /> Add a change
            </Button>
          </div>
        {/if}
      </Sheet.Header>

      {#if ctx.historyLoading}
        <div class="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner /> Reading the history...
        </div>
      {:else if ctx.historyError}
        <Alert.Root variant="danger">
          <TriangleAlert />
          <Alert.Title>Could not read the history</Alert.Title>
          <Alert.Description>{ctx.historyError}</Alert.Description>
        </Alert.Root>
      {:else}
        <div class="grid gap-3 pb-6">
          {#each ctx.historyEntries as entry (entry.employeeHistoryPk)}
            {@const current = entry.validUntil === null}

            <div class="rounded-lg border p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">
                  {datesOf(entry)}
                </span>
                {#if current}
                  <Badge variant="secondary">In use now</Badge>
                {/if}
              </div>

              <p class="font-medium">{nameOf(entry)}</p>
              <p class="text-sm text-muted-foreground">
                {entry.positionTitle}
              </p>
              <p class="text-xs text-muted-foreground">
                {entry.positionShortForm
                  ? `Prints as ${entry.positionShortForm}`
                  : "No short form typed in yet"}
              </p>

              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">
                  {entry.createdByUsername
                    ? `Added by ${entry.createdByUsername}`
                    : "Added before the system recorded who"}
                </span>

                {#if canEdit}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => correct(entry)}
                  >
                    <Pencil /> Correct this
                  </Button>
                {/if}
              </div>
            </div>
          {:else}
            <p class="py-8 text-sm text-muted-foreground">
              This person has no entries yet.
            </p>
          {/each}
        </div>
      {/if}
    </ScrollArea>

    <!--
      Both kept inside Sheet.Content on purpose. The sheet holds focus while
      it is open, so a dialog mounted outside it would open behind the sheet
      and could not be typed into.
    -->
    <CorrectEntryDialog />
    <AddChangeDialog />
  </Sheet.Content>
</Sheet.Root>
