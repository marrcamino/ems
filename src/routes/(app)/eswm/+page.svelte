<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { formatDate } from "$lib/utils/format-date.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Send,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import {
    addMonths,
    monthLabel,
    monthName,
    submitTooEarly,
  } from "../paper/paper-month";
  import { formatKilos } from "./eswm-format";
  import type { EswmStatus } from "./eswm-types";
  import {
    blockTotal,
    monthTotal,
    SOURCE_LABEL,
    WASTE_LABEL,
    WASTE_SOURCES,
    WASTE_TYPES,
    type WasteSource,
  } from "./eswm-waste";
  import WasteDialog from "./waste-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  const month = $derived(data.month);
  const report = $derived(data.report);
  const waste = $derived(data.waste);
  const canManage = $derived(gblCtx.can("eswm:manage"));
  const status = $derived<EswmStatus>(report?.status ?? "open");
  const total = $derived(monthTotal(waste));

  /** "187.00 kg", or "—" when nothing was weighed. */
  const kgText = (kilos: number | null | undefined) =>
    kilos == null ? "—" : `${formatKilos(kilos)} kg`;

  function go(nextMonth: string) {
    const url = new URL(page.url);
    if (nextMonth === data.currentMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    goto(url, { noScroll: true, keepFocus: true });
  }

  let wasteOpen = $state(false);
  let wasteSource = $state<WasteSource>("coastal");

  function openWaste(source: WasteSource) {
    wasteSource = source;
    wasteOpen = true;
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
  const statusVariant = (s: EswmStatus | null) =>
    s === "submitted" ? "default" : "outline";

  /** Sends Submit, then reloads the page's data. */
  async function send(action: "submit", body: FormData) {
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
              .join(" ")}. Its figures can still be corrected.
          </Alert.Description>
        </Alert.Root>
      {:else if !canManage}
        <p class="text-sm text-muted-foreground">
          This month is not submitted yet.
        </p>
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        {#each WASTE_SOURCES as source (source)}
          {@const block = waste[source]}
          {@const recorded = blockTotal(block) !== null}
          <Card.Root>
            <Card.Header>
              <Card.Title>{SOURCE_LABEL[source]}</Card.Title>
              <Card.Description>Kilos by type</Card.Description>
              {#if canManage}
                <Card.Action>
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => openWaste(source)}
                  >
                    {#if recorded}
                      <Pencil /> Edit
                    {:else}
                      <Plus /> Add
                    {/if}
                  </Button>
                </Card.Action>
              {/if}
            </Card.Header>
            <Card.Content class="grid gap-1 text-sm tabular-nums">
              {#each WASTE_TYPES[source] as { type } (type)}
                <div class="flex justify-between">
                  <span>{WASTE_LABEL[type]}</span>
                  <span
                    class={[block[type] === undefined && "text-muted-foreground"]}
                  >
                    {kgText(block[type])}
                  </span>
                </div>
              {/each}
              <div
                class="mt-1 flex justify-between border-t pt-1.5 font-medium"
              >
                <span>Total</span>
                <span>{kgText(blockTotal(block))}</span>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </div>

    <div class="grid gap-4">
      <Card.Root>
        <Card.Header>
          <Card.Title>{monthLabel(month)}</Card.Title>
          <Card.Description>Waste weighed</Card.Description>
          <Card.Action>
            <Badge variant={statusVariant(status)}>
              {STATUS_LABEL[status]}
            </Badge>
          </Card.Action>
        </Card.Header>
        <Card.Content class="grid gap-1 text-sm tabular-nums">
          {#each WASTE_SOURCES as source (source)}
            <div class="flex justify-between">
              <span>{SOURCE_LABEL[source]}</span>
              <span>{kgText(blockTotal(waste[source]))}</span>
            </div>
          {/each}
          <div class="mt-1 flex justify-between border-t pt-1.5 font-medium">
            <span>Total</span>
            <span>{kgText(total)}</span>
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
                  {m.kilos === null ? "" : `${formatKilos(m.kilos)} kg`}
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

<WasteDialog
  bind:open={wasteOpen}
  source={wasteSource}
  {month}
  block={waste[wasteSource]}
/>

<AlertDialog.Root bind:open={submitOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Submit {monthLabel(month)}?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if total === null}
          Nothing is weighed for this month, so it is submitted as none
          recorded.
        {:else}
          {WASTE_SOURCES.map(
            (source) =>
              `${SOURCE_LABEL[source]}: ${kgText(blockTotal(waste[source]))}`,
          ).join(". ")}. Total: {kgText(total)}.
        {/if}
        Its figures can still be corrected after submitting.
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
