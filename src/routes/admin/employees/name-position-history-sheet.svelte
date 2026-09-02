<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { Pencil, TriangleAlert } from "@lucide/svelte/icons";
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

  function correct(entry: HistoryEntry) {
    ctx.startEditingEntry(entry);
    ctx.correctEntryDialog = true;
  }
</script>

<Sheet.Root
  bind:open={ctx.historySheet}
  onOpenChangeComplete={() => ctx.resetHistoryPanel()}
>
  <Sheet.Content side="right" class="flex w-full flex-col sm:max-w-xl">
    <Sheet.Header>
      <Sheet.Title>Name and position history</Sheet.Title>
      <Sheet.Description>
        {#if ctx.employeeForHistory}
          Every name and position {fullName(ctx.employeeForHistory)} has been recorded
          under, and the dates each one was in use. A document shows whichever entry
          covers the date written on it.
        {/if}
      </Sheet.Description>
    </Sheet.Header>

    <ScrollArea viewPortClasses="px-4 size-full">
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
      Kept inside Sheet.Content on purpose. The sheet holds focus while it is
      open, so a dialog mounted outside it would open behind the sheet and
      could not be typed into.
    -->
    <CorrectEntryDialog />
  </Sheet.Content>
</Sheet.Root>
