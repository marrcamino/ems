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
    Droplets,
    EllipsisVertical,
    Pencil,
    Plus,
    Send,
    Trash,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { addMonths, monthLabel, monthName } from "../paper/paper-month";
  import { cubicMeters, formatCubicMeters } from "./water-format";
  import type { WaterStatus, WaterUse } from "./water-types";
  import WaterUseDialog from "./water-use-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  const month = $derived(data.month);
  const report = $derived(data.report);
  const uses = $derived(data.uses);
  const canManage = $derived(gblCtx.can("water:manage"));
  const status = $derived<WaterStatus>(report?.status ?? "open");
  const total = $derived(uses.reduce((sum, u) => sum + u.cubicMeters, 0));

  function go(nextMonth: string) {
    const url = new URL(page.url);
    if (nextMonth === data.lastMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    goto(url, { noScroll: true, keepFocus: true });
  }

  let useOpen = $state(false);
  let useToEdit = $state<WaterUse | null>(null);

  function openAdd() {
    useToEdit = null;
    useOpen = true;
  }

  function openEdit(use: WaterUse) {
    useToEdit = use;
    useOpen = true;
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
  const statusVariant = (s: WaterStatus | null) =>
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
  let useToRemove = $state<WaterUse | null>(null);
  let removing = $state(false);

  async function confirmRemove() {
    if (!useToRemove) return;
    removing = true;
    const body = new FormData();
    body.set("usePk", String(useToRemove.usePk));
    const error = await send("remove", body);
    removing = false;
    removeOpen = false;
    if (error)
      toastErrorOnce("water-remove", "Entry not removed", {
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
      toastErrorOnce("water-submit", `${monthName(month)} not submitted`, {
        description: error,
      });
    else toast.success(`${monthLabel(month)} submitted`);
  }
</script>

<svelte:head>
  <title>Water - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>Water</Breadcrumb.Page>
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
        disabled={month >= data.lastMonth}
        onclick={() => go(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>

    <div class="ml-auto flex gap-2">
      {#if canManage}
        <Button onclick={openAdd}>
          <Plus />
          Add water use
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

      {#if uses.length === 0}
        <Empty.Root class="border py-12">
          <Empty.Header>
            <Empty.Media variant="icon">
              <Droplets />
            </Empty.Media>
            <Empty.Title>
              No water use recorded for {monthLabel(month)}
            </Empty.Title>
            <Empty.Description>
              {status === "submitted"
                ? "The month was submitted with no water use recorded."
                : canManage
                  ? "Add the cubic meters of water that the office used this month."
                  : "Nothing is recorded for this month yet."}
            </Empty.Description>
          </Empty.Header>
          {#if canManage && status === "open"}
            <Empty.Content>
              <Button onclick={openAdd}>
                <Plus />
                Add water use
              </Button>
            </Empty.Content>
          {/if}
        </Empty.Root>
      {:else}
        <Table.Root containerClass="rounded-lg border">
          <Table.Header class="bg-muted/80">
            <Table.Row>
              <Table.Head>Entry</Table.Head>
              <Table.Head class="text-right">Cubic meters</Table.Head>
              {#if canManage}
                <Table.Head class="w-0"></Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each uses as use (use.usePk)}
              <Table.Row>
                <Table.Cell class="whitespace-normal">
                  {#if use.note}
                    <div>{use.note}</div>
                  {/if}
                  <div class="text-xs text-muted-foreground">
                    Entered {formatDate(use.enteredOn)}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatCubicMeters(use.cubicMeters)}
                </Table.Cell>
                {#if canManage}
                  <Table.Cell>
                    <ButtonGroup.Root>
                      <Button
                        variant="secondary"
                        size="sm"
                        class="border-r-0"
                        onclick={() => openEdit(use)}
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
                              useToRemove = use;
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
          <Card.Description>Water used</Card.Description>
          <Card.Action>
            <Badge variant={statusVariant(status)}>
              {STATUS_LABEL[status]}
            </Badge>
          </Card.Action>
        </Card.Header>
        <Card.Content class="grid gap-1 text-sm tabular-nums">
          <div class="flex justify-between">
            <span>Entries</span>
            <span>{uses.length}</span>
          </div>
          <div class="mt-1 flex justify-between border-t pt-1.5 font-medium">
            <span>Cubic meters</span>
            <!-- A month with no entry has no figure, which is not 0. -->
            <span>{uses.length ? formatCubicMeters(total) : "—"}</span>
          </div>
        </Card.Content>
        {#if canManage && status === "open"}
          <Card.Footer>
            <Button class="w-full" onclick={() => (submitOpen = true)}>
              <Send />
              Submit {monthName(month)}
            </Button>
          </Card.Footer>
        {/if}
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>{month.slice(0, 4)}</Card.Title>
          <Card.Description>Each month that is over</Card.Description>
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
                  {m.cubicMeters === null ? "" : cubicMeters(m.cubicMeters)}
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

<WaterUseDialog bind:open={useOpen} use={useToEdit} {month} />

<AlertDialog.Root bind:open={removeOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Remove this entry?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if useToRemove}
          {useToRemove.note
            ? `${useToRemove.note}, with ${cubicMeters(useToRemove.cubicMeters)},`
            : `The entry of ${cubicMeters(useToRemove.cubicMeters)}`} comes off the
          {monthName(month)} total.
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
        {#if uses.length > 0}
          The office used {cubicMeters(total)} of water this month.
        {:else}
          No water use is recorded for this month, so it is submitted as none
          recorded.
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
