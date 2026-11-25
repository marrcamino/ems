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
    Plane,
    Plus,
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
  import { countOf, formatCount, kmText, legsOf } from "./air-travel-format";
  import type { AirTravelStatus, Flight } from "./air-travel-types";
  import FlightDialog from "./flight-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  const month = $derived(data.month);
  const report = $derived(data.report);
  const flights = $derived(data.flights);
  const canManage = $derived(gblCtx.can("air_travel:manage"));
  const status = $derived<AirTravelStatus>(report?.status ?? "open");

  // A round trip counts as two flights, and its kilometers both ways.
  const totals = $derived({
    flights: flights.reduce((sum, f) => sum + legsOf(f), 0),
    km: flights.reduce((sum, f) => sum + f.km * legsOf(f), 0),
  });
  // An open month with no flight has no figure yet; a submitted one has 0.
  const noFigure = $derived(flights.length === 0 && status === "open");

  function go(nextMonth: string) {
    const url = new URL(page.url);
    if (nextMonth === data.currentMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", nextMonth);
    goto(url, { noScroll: true, keepFocus: true });
  }

  let flightOpen = $state(false);
  let flightToEdit = $state<Flight | null>(null);
  function openFlight(flight: Flight | null) {
    flightToEdit = flight;
    flightOpen = true;
  }

  /** A flight saved under another month takes the page there. */
  function onSaved(savedMonth: string) {
    if (savedMonth !== month) go(savedMonth);
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
  const statusVariant = (s: AirTravelStatus | null) =>
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
  let flightToRemove = $state<Flight | null>(null);
  let removing = $state(false);

  async function confirmRemove() {
    if (!flightToRemove) return;
    removing = true;
    const body = new FormData();
    body.set("flightPk", String(flightToRemove.flightPk));
    const error = await send("remove", body);
    removing = false;
    removeOpen = false;
    if (error)
      toastErrorOnce("air-travel-remove", "Entry not removed", {
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
      toastErrorOnce("air-travel-submit", `${monthName(month)} not submitted`, {
        description: error,
      });
    else toast.success(`${monthLabel(month)} submitted`);
  }
</script>

<svelte:head>
  <title>Air Travel - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>Air Travel</Breadcrumb.Page>
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
        <Button onclick={() => openFlight(null)}>
          <Plus />
          Add flight
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

      {#if flights.length === 0}
        <Empty.Root class="border py-12">
          <Empty.Header>
            <Empty.Media variant="icon">
              <Plane />
            </Empty.Media>
            <Empty.Title>No flights in {monthLabel(month)}</Empty.Title>
            <Empty.Description>
              {status === "submitted"
                ? "The month was submitted with no flights."
                : canManage
                  ? "Add each flight that staff took on official business."
                  : "Nothing is recorded for this month yet."}
            </Empty.Description>
          </Empty.Header>
          {#if canManage && status === "open"}
            <Empty.Content>
              <Button onclick={() => openFlight(null)}>
                <Plus />
                Add flight
              </Button>
            </Empty.Content>
          {/if}
        </Empty.Root>
      {:else}
        <Table.Root containerClass="rounded-lg border">
          <Table.Header class="bg-muted/80">
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Traveller</Table.Head>
              <Table.Head>Flight</Table.Head>
              <Table.Head class="text-right">Km</Table.Head>
              {#if canManage}
                <Table.Head class="w-0"></Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each flights as flight (flight.flightPk)}
              <Table.Row class="align-top">
                <Table.Cell class="tabular-nums">
                  {formatDate(flight.flownOn)}
                </Table.Cell>
                <Table.Cell class="whitespace-normal">
                  {flight.traveller.name}
                </Table.Cell>
                <Table.Cell class="whitespace-normal">
                  <div>
                    {flight.fromPlace}
                    <span class="text-muted-foreground"
                      >{flight.roundTrip ? "⇄" : "→"}</span
                    >
                    {flight.toPlace}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {[
                      flight.roundTrip && "Round trip",
                      `TO ${flight.travelOrderNo}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {[flight.destination, flight.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatCount(flight.km * legsOf(flight))}
                </Table.Cell>
                {#if canManage}
                  <Table.Cell>
                    <ButtonGroup.Root>
                      <Button
                        variant="secondary"
                        size="sm"
                        class="border-r-0"
                        onclick={() => openFlight(flight)}
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
                              flightToRemove = flight;
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
          <Card.Description>Flights on official business</Card.Description>
          <Card.Action>
            <Badge variant={statusVariant(status)}>
              {STATUS_LABEL[status]}
            </Badge>
          </Card.Action>
        </Card.Header>
        <Card.Content class="grid gap-1 text-sm tabular-nums">
          <div class="flex justify-between">
            <span>Flights</span>
            <span>{noFigure ? "—" : formatCount(totals.flights)}</span>
          </div>
          <div class="mt-1 flex justify-between border-t pt-1.5 font-medium">
            <span>Kilometers flown</span>
            <span>{noFigure ? "—" : formatCount(totals.km)}</span>
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
                  {m.flights > 0 ? kmText(m.km) : ""}
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

<FlightDialog
  bind:open={flightOpen}
  flight={flightToEdit}
  staff={data.staff}
  routes={data.routes}
  {month}
  currentMonth={data.currentMonth}
  today={data.today}
  {onSaved}
/>

<AlertDialog.Root bind:open={removeOpen}>
  <AlertDialog.Content class="sm:max-w-100">
    <AlertDialog.Header>
      <AlertDialog.Title>Remove this flight?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if flightToRemove}
          {flightToRemove.fromPlace}
          {flightToRemove.roundTrip ? "⇄" : "→"}
          {flightToRemove.toPlace}{flightToRemove.roundTrip
            ? ", round trip,"
            : ""} on {formatDate(flightToRemove.flownOn)}, by
          {flightToRemove.traveller.name}, comes off the {monthName(month)} total.
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
        {#if flights.length > 0}
          Staff took {countOf(totals.flights, "flight", "flights")} this month, for
          {kmText(totals.km)} flown.
        {:else}
          No flights are recorded for this month, so it is submitted as no
          flights.
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
