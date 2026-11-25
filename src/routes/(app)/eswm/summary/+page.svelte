<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import Header from "@/components/header.svelte";
  import { ChevronLeft, ChevronRight, Recycle } from "@lucide/svelte/icons";
  import { monthLabel, monthName } from "../../paper/paper-month";
  import { countOf, formatCount, formatKilos } from "../eswm-format";
  import type { EswmStatus } from "../eswm-types";

  let { data } = $props();

  const months = $derived(data.months);

  const totals = $derived({
    activities: months.reduce((sum, m) => sum + m.activities, 0),
    participants: months.some((m) => m.participants !== null)
      ? months.reduce((sum, m) => sum + (m.participants ?? 0), 0)
      : null,
    sacks: months.reduce((sum, m) => sum + m.sacks, 0),
    kilos: months.reduce((sum, m) => sum + m.kilos, 0),
    submitted: months.filter((m) => m.status === "submitted").length,
  });

  /** Round steps for the kilos axis: 0, 50, 100, 150… with a clean top. */
  const ticks = $derived.by(() => {
    const max = Math.max(...months.map((m) => m.kilos), 0);
    if (max <= 0) return [];
    const raw = max / 4;
    const power = 10 ** Math.floor(Math.log10(raw));
    const n = raw / power;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
    const top = Math.ceil(max / step) * step;
    const list: number[] = [];
    for (let t = 0; t <= top + step / 2; t += step) list.push(t);
    return list;
  });
  const top = $derived(ticks.at(-1) ?? 1);

  /** A year that nothing was recorded or submitted in shows no table. */
  const anyRecord = $derived(months.some((m) => m.status !== null));

  const tickFormat = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 2,
  });
  const shortMonth = new Intl.DateTimeFormat(LOCALE, { month: "short" });
  const monthShort = (m: string) =>
    shortMonth.format(new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1));

  function goYear(year: number) {
    const url = new URL(page.url);
    if (year === data.currentYear) url.searchParams.delete("year");
    else url.searchParams.set("year", String(year));
    goto(url, { noScroll: true, keepFocus: true });
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
  const statusVariant = (s: EswmStatus | null) =>
    s === "submitted" ? "default" : "outline";
</script>

<svelte:head>
  <title>ESWM Summary - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/eswm">ESWM</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Summary</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <div class="flex w-full max-w-5xl items-center gap-2 pt-1">
    <ButtonGroup.Root>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous year"
        onclick={() => goYear(data.year - 1)}
        class="border-e-0"
      >
        <ChevronLeft />
      </Button>
      <span
        class="flex w-24 dark:bg-muted/40 items-center justify-center border-y text-sm font-medium tabular-nums"
      >
        {data.year}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next year"
        disabled={data.year >= data.currentYear}
        onclick={() => goYear(data.year + 1)}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>
  </div>

  <div class="grid w-full max-w-5xl gap-4 pt-3">
    {#if ticks.length === 0}
      <Empty.Root class="border py-12">
        <Empty.Header>
          <Empty.Media variant="icon">
            <Recycle />
          </Empty.Media>
          <Empty.Title>No waste collected in {data.year}</Empty.Title>
          <Empty.Description>
            The figures come from the entries on the ESWM page.
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button href="/eswm" variant="outline">Open the ESWM page</Button>
        </Empty.Content>
      </Empty.Root>
    {:else}
      <Card.Root>
        <Card.Header>
          <Card.Title>Kilos per month</Card.Title>
          <Card.Description>Waste collected in {data.year}</Card.Description>
          <Card.Action class="text-right">
            <div class="text-lg font-semibold tabular-nums">
              {formatKilos(totals.kilos)} kg
            </div>
            <div class="text-muted-foreground text-xs">in all</div>
          </Card.Action>
        </Card.Header>
        <Card.Content>
          <!-- Plain HTML bars: the app runs offline and has no chart library. -->
          <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
            <div class="relative h-52 w-12">
              {#each ticks as tick (tick)}
                <span
                  class="text-muted-foreground absolute right-0 translate-y-1/2 text-xs tabular-nums"
                  style:bottom="{(tick / top) * 100}%"
                >
                  {tickFormat.format(tick)}
                </span>
              {/each}
            </div>
            <div class="relative h-52">
              {#each ticks as tick (tick)}
                <div
                  class={[
                    "absolute inset-x-0 border-t",
                    tick === 0
                      ? "border-border"
                      : "border-border/60 border-dashed",
                  ]}
                  style:bottom="{(tick / top) * 100}%"
                ></div>
              {/each}
              <div class="absolute inset-0 flex">
                {#each months as m (m.month)}
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                      {#snippet child({ props })}
                        <a
                          {...props}
                          href="/eswm?month={m.month}"
                          class="group flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-muted hover:bg-muted/60"
                          aria-label="{monthLabel(m.month)}: {formatKilos(
                            m.kilos,
                          )} kg"
                        >
                          {#if m.kilos > 0}
                            <span
                              class="w-full max-w-6 rounded-t-[4px] bg-green-700 dark:bg-green-600"
                              style:height="{(m.kilos / top) * 100}%"
                            ></span>
                          {/if}
                        </a>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="grid gap-0.5">
                        <span class="font-medium">{monthLabel(m.month)}</span>
                        <span class="tabular-nums">
                          {m.kilos > 0
                            ? `${formatKilos(m.kilos)} kg · ${countOf(m.sacks, "sack", "sacks")}`
                            : "No waste collected"}
                        </span>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {/each}
              </div>
            </div>
            <div></div>
            <div class="flex pt-1.5">
              {#each months as m (m.month)}
                <span class="text-muted-foreground flex-1 text-center text-xs">
                  {monthShort(m.month)}
                </span>
              {/each}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    {#if anyRecord}
      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Month</Table.Head>
            <Table.Head class="text-right">Activities</Table.Head>
            <Table.Head class="text-right">Participants</Table.Head>
            <Table.Head class="text-right">Sacks</Table.Head>
            <Table.Head class="text-right">Kilos</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each months as m (m.month)}
            {@const none = m.activities === 0}
            <Table.Row>
              <Table.Cell>
                <a href="/eswm?month={m.month}" class="hover:underline">
                  {monthName(m.month)}
                </a>
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {none ? "—" : formatCount(m.activities)}
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {m.participants === null ? "—" : formatCount(m.participants)}
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {none ? "—" : formatCount(m.sacks)}
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {none ? "—" : formatKilos(m.kilos)}
              </Table.Cell>
              <Table.Cell>
                <Badge variant={statusVariant(m.status)}>
                  {STATUS_LABEL[m.status ?? "open"]}
                </Badge>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
        <Table.Footer>
          <Table.Row class="font-medium">
            <Table.Cell>Total</Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {formatCount(totals.activities)}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {totals.participants === null
                ? "—"
                : formatCount(totals.participants)}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {formatCount(totals.sacks)}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {formatKilos(totals.kilos)}
            </Table.Cell>
            <Table.Cell class="text-muted-foreground font-normal">
              {totals.submitted} of {months.length} submitted
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    {/if}
  </div>
</div>
