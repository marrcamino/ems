<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { PAPER_SIZES } from "$lib/paper-sizes";
  import { formatDate } from "$lib/utils/format-date.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import DateInput from "@/components/date-input.svelte";
  import Header from "@/components/header.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { parseDate, type DateValue } from "@internationalized/date";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { addMonths, monthLabel, reamCount } from "../paper-month";
  import type { SubmittedRow } from "./+page.server";

  let { data } = $props();

  const month = $derived(data.month);
  const rows = $derived(data.rows);

  /** Only the sizes some office used this month get a column. */
  const sizes = $derived(
    PAPER_SIZES.filter((s) => rows.some((r) => r.consumed[s.value])),
  );

  const received = $derived(rows.filter((r) => r.status === "received"));
  const waiting = $derived(rows.filter((r) => r.status === "submitted"));

  function go(nextMonth: string) {
    const url = new URL(page.url);
    if (nextMonth === data.latestMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    goto(url, { noScroll: true, keepFocus: true });
  }

  async function send(action: "receive" | "reopen", body: FormData) {
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

  /** "2 A4 and 1 Long". */
  function inWords(row: SubmittedRow) {
    const words = PAPER_SIZES.filter((s) => row.consumed[s.value]).map(
      (s) => `${row.consumed[s.value]} ${s.label}`,
    );
    return words.length <= 1
      ? words.join("")
      : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
  }
  const totalOf = (row: SubmittedRow) =>
    Object.values(row.consumed).reduce((sum, n) => sum + (n ?? 0), 0);

  // Receive: the date the printed report reached GSU, from the day it was
  // submitted to today.
  let receiveOpen = $state(false);
  let toReceive = $state<SubmittedRow | null>(null);
  let receivedOn = $state<DateValue | undefined>();
  let receiving = $state(false);

  function openReceive(row: SubmittedRow) {
    toReceive = row;
    receivedOn = parseDate(data.today);
    receiveOpen = true;
  }

  async function confirmReceive() {
    if (!toReceive || !receivedOn) return;
    receiving = true;
    const body = new FormData();
    body.set("reportPk", String(toReceive.reportPk));
    body.set("receivedOn", receivedOn.toString());
    const error = await send("receive", body);
    receiving = false;
    receiveOpen = false;
    if (error)
      toastErrorOnce("paper-receive", "Report not received", {
        description: error,
      });
    else toast.success(`${toReceive.abbr} report received`);
  }

  // Reopen: only GSU's own report, which is received as it is submitted.
  let reopenOpen = $state(false);
  let toReopen = $state<SubmittedRow | null>(null);
  let reopening = $state(false);

  async function confirmReopen() {
    if (!toReopen) return;
    reopening = true;
    const body = new FormData();
    body.set("reportPk", String(toReopen.reportPk));
    const error = await send("reopen", body);
    reopening = false;
    reopenOpen = false;
    if (error)
      toastErrorOnce("paper-reopen", "Report not reopened", {
        description: error,
      });
    else toast.success(`${monthLabel(month)} reopened`);
  }
</script>

<svelte:head>
  <title>Submitted Reports - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/paper">Paper</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Submitted Reports</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <div
    class="flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 pt-1"
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
        disabled={month >= data.latestMonth}
        onclick={() => go(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>
    <p class="text-sm text-muted-foreground">
      {received.length} of {rows.length} received, {waiting.length} waiting
    </p>
  </div>

  <Table.Root containerClass="mt-3 w-full max-w-5xl rounded-lg border">
    <Table.Header class="bg-muted/80">
      <Table.Row>
        <Table.Head>Office</Table.Head>
        <Table.Head>Status</Table.Head>
        {#each sizes as size (size.value)}
          <Table.Head class="text-right">{size.label}</Table.Head>
        {/each}
        <Table.Head>Submitted</Table.Head>
        <Table.Head>Received</Table.Head>
        <Table.Head class="w-0"></Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each rows as row (row.orgUnitPk)}
        {@const sent = row.status === "submitted" || row.status === "received"}
        <Table.Row>
          <Table.Cell class="font-medium">
            {#if data.canViewOffices}
              <a
                class="hover:underline"
                href={`/paper?office=${row.orgUnitPk}&month=${month}`}
              >
                {row.orgUnitName}
              </a>
            {:else}
              {row.orgUnitName}
            {/if}
          </Table.Cell>
          <Table.Cell>
            {#if row.status === "received"}
              <Badge>Received</Badge>
            {:else if row.status === "submitted"}
              <Badge variant="secondary">Submitted</Badge>
            {:else}
              <Badge variant="outline">Not submitted</Badge>
            {/if}
          </Table.Cell>
          {#each sizes as size (size.value)}
            <Table.Cell class="text-right tabular-nums">
              {sent ? (row.consumed[size.value] ?? "—") : ""}
            </Table.Cell>
          {/each}
          <Table.Cell class="tabular-nums">
            {sent && row.submittedOn ? formatDate(row.submittedOn) : ""}
          </Table.Cell>
          <Table.Cell>
            {#if row.status === "received" && row.receivedOn}
              <span class="tabular-nums">{formatDate(row.receivedOn)}</span>
              {#if row.isGsu}
                <span class="block text-xs text-muted-foreground">
                  GSU's own report
                </span>
              {:else if row.receivedBy}
                <span class="block text-xs text-muted-foreground">
                  {row.receivedBy}
                </span>
              {/if}
            {/if}
          </Table.Cell>
          <Table.Cell class="text-right">
            {#if row.status === "submitted"}
              <Button size="sm" onclick={() => openReceive(row)}>Receive</Button>
            {:else if row.status === "received" && row.isGsu}
              <Button
                size="sm"
                variant="outline"
                onclick={() => {
                  toReopen = row;
                  reopenOpen = true;
                }}
              >
                Reopen
              </Button>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>

<Dialog.Root bind:open={receiveOpen}>
  <Dialog.Content class="sm:max-w-110">
    <Dialog.Header>
      <Dialog.Title>Receive the {toReceive?.abbr} report?</Dialog.Title>
      <Dialog.Description>
        {#if toReceive && totalOf(toReceive) > 0}
          {toReceive.abbr} used {reamCount(totalOf(toReceive))} in {monthLabel(
            month,
          )}: {inWords(toReceive)}. Check these against the printed report.
        {:else}
          {toReceive?.abbr} used no paper in {monthLabel(month)}. Check this against
          the printed report.
        {/if}
        After receiving, {toReceive?.abbr} can no longer change its entries.
      </Dialog.Description>
    </Dialog.Header>

    <Field.Field>
      <Field.Label for="receivedOn">Date received</Field.Label>
      <DateInput
        id="receivedOn"
        bind:value={receivedOn}
        minValue={toReceive?.submittedOn
          ? parseDate(toReceive.submittedOn)
          : undefined}
        maxValue={parseDate(data.today)}
        required
      />
    </Field.Field>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (receiveOpen = false)}
        disabled={receiving}
      >
        Cancel
      </Button>
      <Button onclick={confirmReceive} disabled={receiving || !receivedOn}>
        {#if receiving}
          <Spinner />
        {/if}
        Receive
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={reopenOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Reopen GSU's report?</AlertDialog.Title>
      <AlertDialog.Description>
        Its {monthLabel(month)} entries can change again. Submit it again once they
        are right.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={reopening}>Cancel</AlertDialog.Cancel>
      <Button onclick={confirmReopen} disabled={reopening}>
        {#if reopening}
          <Spinner />
        {/if}
        Reopen
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
