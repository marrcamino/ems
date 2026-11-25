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
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { PAPER_SIZES, paperSizeLabel } from "$lib/paper-sizes";
  import { formatDate } from "$lib/utils/format-date.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import SearchPicker, { type PickerItem } from "../fuel/search-picker.svelte";
  import {
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    Pencil,
    Plus,
    Printer,
    Send,
    Stamp,
    StickyNotes,
    Trash,
    TriangleAlert,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import EntryDialog from "./entry-dialog.svelte";
  import OwnReportNote from "./own-report-note.svelte";
  import StartingBalanceDialog from "./starting-balance-dialog.svelte";
  import {
    addMonths,
    monthLabel,
    monthName,
    reamCount,
    submitTooEarly,
  } from "./paper-month";
  import type { PaperEntry, ReportStatus } from "./paper-types";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  const month = $derived(data.month);
  const office = $derived(data.office);
  const report = $derived(data.report);
  const entries = $derived(data.entries);

  /** Entries are added and submitted only for the person's own office. */
  const ownOffice = $derived(
    office !== null && office.orgUnitPk === data.ownOfficePk,
  );
  const canManage = $derived(gblCtx.can("paper:manage") && ownOffice);
  const status = $derived<ReportStatus>(report?.status ?? "open");
  /**
   * Adding, editing, and removing, until GSU receives the month or a later
   * one: the server's lockReason.
   */
  const canChange = $derived(canManage && !data.locked);
  /** A locked month that is not received itself: a later one is. */
  const lockedByLater = $derived(
    !!data.locked && status !== "received" && !(data.start && month < data.start.month),
  );

  const totals = $derived(
    PAPER_SIZES.map((size) => ({
      ...size,
      reams: entries.reduce((sum, e) => sum + (e.reams[size.value] ?? 0), 0),
    })).filter((size) => size.reams > 0),
  );
  const totalReams = $derived(totals.reduce((sum, s) => sum + s.reams, 0));

  /** The form's four rows, for the sizes that have a number in any of them. */
  const balance = $derived(
    (data.balance ?? []).filter(
      (b) => b.forwarded || b.received || b.consumed || b.balance,
    ),
  );
  const BALANCE_ROWS = [
    { key: "forwarded", label: "Balance forwarded" },
    { key: "received", label: "New" },
    { key: "consumed", label: "Consumed" },
    { key: "balance", label: "Balance" },
  ] as const;

  let startOpen = $state(false);

  /** Keeps the office in the address when the month changes, and back. */
  function go(next: { month?: string; office?: number }) {
    const url = new URL(page.url);
    const nextMonth = next.month ?? month;
    if (nextMonth === data.currentMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    const nextOffice = next.office ?? office?.orgUnitPk;
    if (!nextOffice || nextOffice === data.ownOfficePk) {
      url.searchParams.delete("office");
    } else url.searchParams.set("office", String(nextOffice));
    goto(url, { noScroll: true, keepFocus: true });
  }

  let entryOpen = $state(false);
  let entryToEdit = $state<PaperEntry | null>(null);

  function openAdd() {
    entryToEdit = null;
    entryOpen = true;
  }

  function openEdit(entry: PaperEntry) {
    entryToEdit = entry;
    entryOpen = true;
  }

  /** An entry saved under another month takes the page to that month. */
  function onSaved(savedMonth: string) {
    if (savedMonth !== month) go({ month: savedMonth });
  }

  const STATUS_LABEL = {
    open: "Open",
    submitted: "Submitted",
    received: "Received",
  } as const;
  const statusVariant = (s: ReportStatus | null) =>
    s === "received" ? "default" : s === "submitted" ? "secondary" : "outline";

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
  let entryToRemove = $state<PaperEntry | null>(null);
  let removing = $state(false);

  async function confirmRemove() {
    if (!entryToRemove) return;
    removing = true;
    const body = new FormData();
    body.set("entryPk", String(entryToRemove.entryPk));
    const error = await send("remove", body);
    removing = false;
    removeOpen = false;
    if (error)
      toastErrorOnce("paper-remove", "Entry not removed", {
        description: error,
      });
    else toast.success("Entry removed");
  }

  let submitOpen = $state(false);
  let submitting = $state(false);

  // The form's signature blocks, chosen on submitting. Each starts on the
  // office's last choice, as the same people usually sign.
  let preparedByPk = $state("");
  let notedByPk = $state("");
  let signerErrors = $state<{ preparedBy?: string; notedBy?: string }>({});

  const signerItems = $derived(
    data.signers.map((s): PickerItem => ({
      value: String(s.employeePk),
      label: s.name,
      detail: s.positionTitle,
    })),
  );
  const stillWorking = (pk: string) =>
    data.signers.some((s) => String(s.employeePk) === pk) ? pk : "";

  function openSubmit() {
    preparedByPk = stillWorking(data.signerDefaults.preparedByPk);
    notedByPk = stillWorking(data.signerDefaults.notedByPk);
    signerErrors = {};
    submitOpen = true;
  }

  async function confirmSubmit() {
    signerErrors = {
      preparedBy: preparedByPk ? undefined : "Choose who prepared the form.",
      notedBy: notedByPk ? undefined : "Choose who noted the form.",
    };
    if (!preparedByPk || !notedByPk) return;
    submitting = true;
    const body = new FormData();
    body.set("month", month);
    body.set("preparedByPk", preparedByPk);
    body.set("notedByPk", notedByPk);
    const error = await send("submit", body);
    submitting = false;
    submitOpen = false;
    if (error) {
      toastErrorOnce("paper-submit", `${monthName(month)} not submitted`, {
        description: error,
      });
    } else
      toast.success(
        data.isGsuOffice
          ? `${monthLabel(month)} submitted and received`
          : `${monthLabel(month)} submitted`,
      );
  }

  /** "2 A4 and 1 Long", for the submit and remove dialogs. */
  function inWords(parts: { label: string; reams: number }[]) {
    const words = parts.map((s) => `${s.reams} ${s.label}`);
    return words.length <= 1
      ? words.join("")
      : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
  }
  const totalsInWords = $derived(inWords(totals));

  /** One line's reams in words, "1 A4 and 1 Legal". */
  const lineInWords = (entry: PaperEntry) =>
    inWords(
      PAPER_SIZES.filter((s) => entry.reams[s.value]).map((s) => ({
        label: s.label,
        reams: entry.reams[s.value]!,
      })),
    );
</script>

<svelte:head>
  <title>Paper - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>Paper</Breadcrumb.Page>
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
        onclick={() => go({ month: addMonths(month, -1) })}
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
        onclick={() => go({ month: addMonths(month, 1) })}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>

    {#if data.allOffices}
      <Select.Root
        type="single"
        value={office ? String(office.orgUnitPk) : undefined}
        onValueChange={(value) => go({ office: Number(value) })}
      >
        <Select.Trigger class="w-64" aria-label="Office">
          <span class="truncate"
            >{office?.orgUnitName ?? "Choose an office"}</span
          >
        </Select.Trigger>
        <Select.Content>
          {#each data.offices as o (o.orgUnitPk)}
            <Select.Item value={String(o.orgUnitPk)} label={o.orgUnitName}>
              {o.orgUnitName}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}

    <div class="ml-auto flex gap-2">
      {#if canChange}
        <Button onclick={openAdd}>
          <Plus />
          Add opened ream
        </Button>
      {/if}
    </div>
  </div>

  {#if !office}
    <Alert.Root variant="warning" class="mt-4 w-full max-w-5xl">
      <TriangleAlert />
      <Alert.Title>Your account is not linked to an office</Alert.Title>
      <Alert.Description>
        Ask the system administrator to set your office on the Employees page.
        The paper you record is counted under that office.
      </Alert.Description>
    </Alert.Root>
  {:else}
    <div
      class="grid w-full max-w-5xl items-start gap-4 pt-3 lg:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <div class="grid min-w-0 gap-3">
        {#if status === "received"}
          <Alert.Root>
            <Stamp />
            <Alert.Title>{monthLabel(month)} is received by GSU</Alert.Title>
            <Alert.Description>
              {[
                report?.receivedOn &&
                  `Received ${formatDate(report.receivedOn)}`,
                report?.receivedBy && `by ${report.receivedBy}`,
              ]
                .filter(Boolean)
                .join(" ")}. Its entries can no longer change.
              {#if report?.preparedBy}
                Prepared by {report.preparedBy}{report.notedBy
                  ? `, noted by ${report.notedBy}`
                  : ""}.
              {/if}
            </Alert.Description>
          </Alert.Root>
        {:else if status === "submitted"}
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
                .join(" ")}. {lockedByLater
                ? data.locked
                : "Its entries can still change until GSU receives the printed report. Print it again after a change."}
              {#if report?.preparedBy}
                Prepared by {report.preparedBy}{report.notedBy
                  ? `, noted by ${report.notedBy}`
                  : ""}.
              {/if}
            </Alert.Description>
          </Alert.Root>
        {:else if lockedByLater}
          <p class="text-sm text-muted-foreground">{data.locked}</p>
        {:else if !ownOffice}
          <p class="text-sm text-muted-foreground">
            {office.orgUnitName} records its own paper. This month is not submitted
            yet.
          </p>
        {/if}

        {#if entries.length === 0}
          <Empty.Root class="border py-12">
            <Empty.Header>
              <Empty.Media variant="icon">
                <StickyNotes />
              </Empty.Media>
              <Empty.Title
                >No paper recorded for {monthLabel(month)}</Empty.Title
              >
              <Empty.Description>
                {canChange
                  ? "Add each ream when your office opens it."
                  : status !== "open"
                    ? "The month was submitted with no paper used."
                    : "Nothing has been recorded for this month yet."}
              </Empty.Description>
            </Empty.Header>
            {#if canChange}
              <Empty.Content>
                <Button onclick={openAdd}>
                  <Plus />
                  Add opened ream
                </Button>
              </Empty.Content>
            {/if}
          </Empty.Root>
        {:else}
          <Table.Root containerClass="rounded-lg border">
            <Table.Header class="bg-muted/80">
              <Table.Row>
                <Table.Head>Date</Table.Head>
                {#each totals as size (size.value)}
                  <Table.Head class="text-right">{size.label}</Table.Head>
                {/each}
                <Table.Head>Received by</Table.Head>
                {#if canChange}
                  <Table.Head class="w-0"></Table.Head>
                {/if}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each entries as entry (entry.entryPk)}
                <Table.Row>
                  <Table.Cell class="tabular-nums">
                    {formatDate(entry.consumedOn)}
                  </Table.Cell>
                  {#each totals as size (size.value)}
                    <Table.Cell class="text-right tabular-nums">
                      {entry.reams[size.value] ?? "—"}
                    </Table.Cell>
                  {/each}
                  <Table.Cell>{entry.receivedBy}</Table.Cell>
                  {#if canChange}
                    <Table.Cell>
                      <ButtonGroup.Root>
                        <Button
                          variant="secondary"
                          size="sm"
                          class="border-r-0"
                          onclick={() => openEdit(entry)}
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
                                entryToRemove = entry;
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
            <Card.Description>Bond paper, in reams</Card.Description>
            <Card.Action>
              <Badge variant={statusVariant(status)}>
                {STATUS_LABEL[status]}
              </Badge>
            </Card.Action>
          </Card.Header>
          <Card.Content class="grid gap-2 text-sm">
            {#if !data.balance}
              <p class="text-muted-foreground">
                The paper record starts in {monthLabel(data.start!.month)}.
              </p>
            {:else if balance.length === 0}
              <p class="text-muted-foreground">No paper yet.</p>
            {:else}
              <!-- The four summary rows of the office's paper form. -->
              <table class="w-full tabular-nums">
                <thead>
                  <tr class="text-muted-foreground text-xs">
                    <th class="pb-1 text-left font-normal"></th>
                    {#each balance as b (b.paperSize)}
                      <th class="pb-1 pl-2 text-right font-normal">
                        {paperSizeLabel(b.paperSize)}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each BALANCE_ROWS as row (row.key)}
                    <tr
                      class={[
                        row.key === "balance" &&
                          "border-t font-medium [&>td]:pt-1.5",
                      ]}
                    >
                      <td class="py-0.5 text-left">{row.label}</td>
                      {#each balance as b (b.paperSize)}
                        <td
                          class={[
                            "py-0.5 pl-2 text-right",
                            b[row.key] < 0 && "text-destructive",
                          ]}
                        >
                          {b[row.key]}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
            {#if data.canEnterStart}
              <Button
                variant="ghost"
                size="sm"
                class="justify-self-start"
                onclick={() => (startOpen = true)}
              >
                {#if data.start}
                  <Pencil />
                  Edit balance forwarded
                {:else}
                  <Plus />
                  Enter balance forwarded
                {/if}
              </Button>
            {/if}
          </Card.Content>
          {#if canChange && status === "open"}
            <!--
              Unavailable until the month is over, with the reason under the
              button; the server refuses an early submit with the same words.
            -->
            {@const tooEarly = submitTooEarly(month, data.currentMonth)}
            <Card.Footer class="flex-col gap-2">
              <Button class="w-full" onclick={openSubmit} disabled={!!tooEarly}>
                <Send />
                Submit {monthName(month)}
              </Button>
              {#if tooEarly}
                <p class="text-muted-foreground text-center text-xs">
                  {tooEarly}
                </p>
              {/if}
            </Card.Footer>
          {:else if status !== "open" && canManage}
            <!-- Only once submitted: before that there is no form to print. -->
            <Card.Footer>
              <Button
                class="w-full"
                variant="outline"
                onclick={() =>
                  toast("The printed form is not ready yet", {
                    description: "It comes with the print layout, later.",
                  })}
              >
                <Printer />
                Print {monthName(month)}
              </Button>
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
                onclick={() => go({ month: m.month })}
              >
                <span>{monthName(m.month)}</span>
                <span class="flex items-center gap-2">
                  <span class="text-muted-foreground tabular-nums">
                    {m.reams > 0 ? reamCount(m.reams) : ""}
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
  {/if}
</div>

<EntryDialog
  bind:open={entryOpen}
  entry={entryToEdit}
  {month}
  today={data.today}
  staff={data.staff}
  ownEmployeePk={data.ownEmployeePk}
  {onSaved}
/>

<StartingBalanceDialog bind:open={startOpen} {month} start={data.start} />

<AlertDialog.Root bind:open={removeOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Remove this entry?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if entryToRemove}
          {lineInWords(entryToRemove)}, received by {entryToRemove.receivedBy}
          on {formatDate(entryToRemove.consumedOn)}, comes off the {monthName(
            month,
          )} total.
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

<Dialog.Root bind:open={submitOpen}>
  <Dialog.Content class="sm:max-w-110">
    <Dialog.Header>
      <Dialog.Title>Submit {monthLabel(month)}?</Dialog.Title>
      <Dialog.Description>
        {#if totalReams > 0}
          Your office used {reamCount(totalReams)} this month: {totalsInWords}.
        {:else}
          No paper is recorded for this month, so it is submitted as none used.
        {/if}
        {#if data.isGsuOffice}
          After submitting, no entry can be added, edited, or removed for {monthName(
            month,
          )}.
        {:else}
          Its entries can still change until GSU receives the printed report.
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if data.isGsuOffice}
      <OwnReportNote userPk={gblCtx.user.userPk} />
    {/if}

    <Field.Group class="gap-4">
      <Field.Field data-invalid={signerErrors.preparedBy ? true : undefined}>
        <Field.Label id="preparedBy-label" required>Prepared by</Field.Label>
        <SearchPicker
          id="preparedBy"
          aria-labelledby="preparedBy-label"
          items={signerItems}
          bind:value={
            () => preparedByPk,
            (pk) => {
              preparedByPk = pk;
              signerErrors.preparedBy = undefined;
            }
          }
          placeholder="Choose who prepared it"
          searchPlaceholder="Search employees..."
          empty="No one matches."
        />
        <Field.Error>{signerErrors.preparedBy}</Field.Error>
      </Field.Field>
      <Field.Field data-invalid={signerErrors.notedBy ? true : undefined}>
        <Field.Label id="notedBy-label" required>Noted by</Field.Label>
        <SearchPicker
          id="notedBy"
          aria-labelledby="notedBy-label"
          items={signerItems}
          bind:value={
            () => notedByPk,
            (pk) => {
              notedByPk = pk;
              signerErrors.notedBy = undefined;
            }
          }
          placeholder="Choose who noted it"
          searchPlaceholder="Search employees..."
          empty="No one matches."
        />
        <Field.Error>{signerErrors.notedBy}</Field.Error>
      </Field.Field>
    </Field.Group>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (submitOpen = false)}
        disabled={submitting}
      >
        Cancel
      </Button>
      <Button onclick={confirmSubmit} disabled={submitting}>
        {#if submitting}
          <Spinner />
        {/if}
        Submit
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
