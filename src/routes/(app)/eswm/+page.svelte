<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatDate } from "$lib/utils/format-date.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import {
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    Pencil,
    Plus,
    Recycle,
    Send,
    Trash,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import {
    addMonths,
    monthLabel,
    monthName,
    submitTooEarly,
  } from "../paper/paper-month";
  import CleanupDriveDialog from "./cleanup-drive-dialog.svelte";
  import { countOf, formatCount, formatKilos } from "./eswm-format";
  import type { CleanupDrive, EswmStatus } from "./eswm-types";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  const month = $derived(data.month);
  const report = $derived(data.report);
  const drives = $derived(data.drives);
  const canManage = $derived(gblCtx.can("eswm:manage"));
  const status = $derived<EswmStatus>(report?.status ?? "open");

  const totals = $derived({
    sacks: drives.reduce((sum, d) => sum + d.sacks, 0),
    kilos: drives.reduce((sum, d) => sum + d.kilos, 0),
    // Unknown, not 0, when no entry has a number of participants.
    participants: drives.some((d) => d.participants !== null)
      ? drives.reduce((sum, d) => sum + (d.participants ?? 0), 0)
      : null,
  });

  function go(nextMonth: string) {
    const url = new URL(page.url);
    if (nextMonth === data.currentMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    goto(url, { noScroll: true, keepFocus: true });
  }

  let driveOpen = $state(false);
  let driveToEdit = $state<CleanupDrive | null>(null);

  function openAdd() {
    driveToEdit = null;
    driveOpen = true;
  }

  function openEdit(drive: CleanupDrive) {
    driveToEdit = drive;
    driveOpen = true;
  }

  /** An entry saved under another month takes the page there. */
  function onSaved(savedMonth: string) {
    if (savedMonth !== month) go(savedMonth);
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
  const statusVariant = (s: EswmStatus | null) =>
    s === "submitted" ? "default" : "outline";

  /** Sends Remove or Submit, then reloads the page's data. */
  async function send(action: "remove" | "submit", body: FormData) {
    try {
      const response = await fetch(`?/${action}`, {
        method: "POST",
        body,
        headers: { "x-sveltekit-action": "true" },
      });
      const result = deserialize(await response.text());
      if (result.type === "success") {
        await invalidateAll();
        return null;
      }
      return result.type === "failure"
        ? ((result.data as { error?: string } | undefined)?.error ??
            "Try again.")
        : "Try again. If it keeps happening, contact ICT.";
    } catch {
      return "Try again. If it keeps happening, contact ICT.";
    }
  }

  let removeOpen = $state(false);
  let driveToRemove = $state<CleanupDrive | null>(null);
  let removing = $state(false);

  async function confirmRemove() {
    if (!driveToRemove) return;
    removing = true;
    const body = new FormData();
    body.set("drivePk", String(driveToRemove.drivePk));
    const error = await send("remove", body);
    removing = false;
    removeOpen = false;
    if (error)
      toastErrorOnce("eswm-remove", "Entry not removed", {
        description: error,
      });
    else toast.success("Entry removed");
  }

  let submitOpen = $state(false);
  let submitting = $state(false);

  async function confirmSubmit() {
    submitting = true;
    const body = new FormData();
    body.set("month", month);
    const error = await send("submit", body);
    submitting = false;
    submitOpen = false;
    if (error)
      toastErrorOnce("eswm-submit", `${monthName(month)} not submitted`, {
        description: error,
      });
    else toast.success(`${monthLabel(month)} submitted`);
  }
</script>

<svelte:head>
  <title>ESWM - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>ESWM</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <div
    class="flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 pt-1"
  >
    <ButtonGroup.Root>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onclick={() => go(addMonths(month, -1))}
        class="border-e-0"
      >
        <ChevronLeft />
      </Button>
      <span
        class="flex w-40 dark:bg-muted/40 items-center justify-center border-y text-sm font-medium tabular-nums"
      >
        {monthLabel(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={month >= data.currentMonth}
        onclick={() => go(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>

    <div class="ml-auto flex gap-2">
      {#if canManage}
        <Button onclick={openAdd}>
          <Plus />
          Add collected waste
        </Button>
      {/if}
    </div>
  </div>

  <div
    class="grid w-full max-w-5xl items-start gap-4 pt-3 lg:grid-cols-[minmax(0,1fr)_18rem]"
  >
    <div class="grid min-w-0 gap-3">
      {#if status === "submitted"}
        <Alert.Root>
          <Send />
          <Alert.Title>{monthLabel(month)} is submitted</Alert.Title>
          <Alert.Description>
            {[
              report?.submittedOn &&
                `Submitted ${formatDate(report.submittedOn)}`,
              report?.submittedBy && `by ${report.submittedBy}`,
            ]
              .filter(Boolean)
              .join(" ")}. Its entries can still be corrected.
          </Alert.Description>
        </Alert.Root>
      {:else if !canManage}
        <p class="text-sm text-muted-foreground">
          This month is not submitted yet.
        </p>
      {/if}

      {#if drives.length === 0}
        <Empty.Root class="border py-12">
          <Empty.Header>
            <Empty.Media variant="icon">
              <Recycle />
            </Empty.Media>
            <Empty.Title>No waste collected in {monthLabel(month)}</Empty.Title>
            <Empty.Description>
              {status === "submitted"
                ? "The month was submitted with no waste collected."
                : canManage
                  ? "Add the waste from each cleanup that the office holds."
                  : "Nothing is recorded for this month yet."}
            </Empty.Description>
          </Empty.Header>
          {#if canManage}
            <Empty.Content>
              <Button onclick={openAdd}>
                <Plus />
                Add collected waste
              </Button>
            </Empty.Content>
          {/if}
        </Empty.Root>
      {:else}
        <Table.Root containerClass="rounded-lg border">
          <Table.Header class="bg-muted/80">
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Activity</Table.Head>
              <Table.Head class="text-right">Participants</Table.Head>
              <Table.Head class="text-right">Sacks</Table.Head>
              <Table.Head class="text-right">Kilos</Table.Head>
              {#if canManage}
                <Table.Head class="w-0"></Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each drives as drive (drive.drivePk)}
              <Table.Row>
                <Table.Cell class="tabular-nums">
                  {formatDate(drive.heldOn)}
                </Table.Cell>
                <Table.Cell class="whitespace-normal">
                  <div>{drive.activity}</div>
                  <div class="text-xs text-muted-foreground">
                    {drive.place}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {drive.participants === null
                    ? "—"
                    : formatCount(drive.participants)}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatCount(drive.sacks)}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatKilos(drive.kilos)}
                </Table.Cell>
                {#if canManage}
                  <Table.Cell>
                    <ButtonGroup.Root>
                      <Button
                        variant="secondary"
                        size="sm"
                        class="border-r-0"
                        onclick={() => openEdit(drive)}
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
                          aria-label="More actions"
                        >
                          <EllipsisVertical />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Item
                            variant="destructive"
                            onclick={() => {
                              driveToRemove = drive;
                              removeOpen = true;
                            }}
                          >
                            <Trash /> Remove
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </ButtonGroup.Root>
                  </Table.Cell>
                {/if}
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </div>

    <div class="grid gap-4">
      <Card.Root>
        <Card.Header>
          <Card.Title>{monthLabel(month)}</Card.Title>
          <Card.Description>Collected waste</Card.Description>
          <Card.Action>
            <Badge variant={statusVariant(status)}>
              {STATUS_LABEL[status]}
            </Badge>
          </Card.Action>
        </Card.Header>
        <Card.Content class="grid gap-1 text-sm tabular-nums">
          <div class="flex justify-between">
            <span>Activities</span>
            <span>{formatCount(drives.length)}</span>
          </div>
          <div class="flex justify-between">
            <span>Participants</span>
            <span>
              {totals.participants === null
                ? "—"
                : formatCount(totals.participants)}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Sacks</span>
            <span>{formatCount(totals.sacks)}</span>
          </div>
          <div class="mt-1 flex justify-between border-t pt-1.5 font-medium">
            <span>Kilos</span>
            <span>{formatKilos(totals.kilos)}</span>
          </div>
        </Card.Content>
        {#if canManage && status === "open"}
          <!--
            Unavailable until the month is over, with the reason under the
            button; the server refuses an early submit with the same words.
          -->
          {@const tooEarly = submitTooEarly(month, data.currentMonth)}
          <Card.Footer class="flex-col gap-2">
            <Button
              class="w-full"
              onclick={() => (submitOpen = true)}
              disabled={!!tooEarly}
            >
              <Send />
              Submit {monthName(month)}
            </Button>
            {#if tooEarly}
              <p class="text-muted-foreground text-center text-xs">
                {tooEarly}
              </p>
            {/if}
          </Card.Footer>
        {/if}
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>{month.slice(0, 4)}</Card.Title>
          <Card.Description>Each month of the year so far</Card.Description>
        </Card.Header>
        <Card.Content class="grid gap-0.5 text-sm">
          {#each [...data.year].reverse() as m (m.month)}
            <button
              type="button"
              class={[
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                m.month === month && "bg-muted font-medium",
              ]}
              onclick={() => go(m.month)}
            >
              <span>{monthName(m.month)}</span>
              <span class="flex items-center gap-2">
                <span class="text-muted-foreground tabular-nums">
                  {m.kilos > 0 ? `${formatKilos(m.kilos)} kg` : ""}
                </span>
                <Badge variant={statusVariant(m.status)}>
                  {STATUS_LABEL[m.status ?? "open"]}
                </Badge>
              </span>
            </button>
          {/each}
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>

<CleanupDriveDialog
  bind:open={driveOpen}
  drive={driveToEdit}
  {month}
  currentMonth={data.currentMonth}
  today={data.today}
  {onSaved}
/>

<AlertDialog.Root bind:open={removeOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Remove this entry?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if driveToRemove}
          {driveToRemove.activity} on {formatDate(driveToRemove.heldOn)}, with
          {countOf(driveToRemove.sacks, "sack", "sacks")} and {formatKilos(
            driveToRemove.kilos,
          )} kg, comes off the {monthName(month)} total.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={removing}>Cancel</AlertDialog.Cancel>
      <Button variant="destructive" onclick={confirmRemove} disabled={removing}>
        {#if removing}
          <Spinner />
        {/if}
        Remove
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={submitOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Submit {monthLabel(month)}?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if drives.length > 0}
          The office collected {countOf(totals.sacks, "sack", "sacks")} and {formatKilos(
            totals.kilos,
          )} kg of waste this month.
        {:else}
          No waste is recorded for this month, so it is submitted as none
          collected.
        {/if}
        Its entries can still be corrected after submitting.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
      <Button onclick={confirmSubmit} disabled={submitting}>
        {#if submitting}
          <Spinner />
        {/if}
        Submit
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
