<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import Header from "@/components/header.svelte";
  import { ChevronLeft, ChevronRight, Zap } from "@lucide/svelte/icons";
  import { monthLabel, monthName } from "../../paper/paper-month";
  import {
    buildingColour,
    formatKwh,
    kwhText,
  } from "../electricity-format";

  let { data } = $props();

  const months = $derived(data.months);
  const buildings = $derived(data.buildings);
  /** The buildings with an entry in month `i`, bottom of the bar first. */
  const partsOf = (i: number) =>
    buildings
      .filter((b) => b.kwh[i] !== null)
      .map((b) => ({ ...b, value: b.kwh[i]! }));
  const buildingTotal = (kwh: (number | null)[]) =>
    kwh.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  /** The months with a figure; a month with no entry is not 0. */
  const recorded = $derived(months.filter((m) => m.kwh !== null));
  const total = $derived(recorded.reduce((sum, m) => sum + (m.kwh ?? 0), 0));
  const submitted = $derived(
    months.filter((m) => m.status === "submitted").length,
  );

  /** Round steps for the axis: 0, 20, 40, 60… with a clean top. */
  const ticks = $derived.by(() => {
    const max = Math.max(...months.map((m) => m.kwh ?? 0), 0);
    if (max <= 0) return [];
    const raw = max / 4;
    const power = 10 ** Math.floor(Math.log10(raw));
    const n = raw / power;
    const step = Math.max(
      1,
      (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power,
    );
    const top = Math.ceil(max / step) * step;
    const list: number[] = [];
    for (let t = 0; t <= top + step / 2; t += step) list.push(t);
    return list;
  });
  const top = $derived(ticks.at(-1) ?? 1);

  const averageFormat = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 1,
  });
  const shortMonth = new Intl.DateTimeFormat(LOCALE, { month: "short" });
  const monthShort = (m: string) =>
    shortMonth.format(new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1));

  function goYear(year: number) {
    const url = new URL(page.url);
    if (year === data.lastYear) url.searchParams.delete("year");
    else url.searchParams.set("year", String(year));
    goto(url, { noScroll: true, keepFocus: true });
  }

  const STATUS_LABEL = { open: "Open", submitted: "Submitted" } as const;
</script>

<svelte:head>
  <title>Electricity Summary - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/electricity">Electricity</Breadcrumb.Link>
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
        disabled={data.year >= data.lastYear}
        onclick={() => goYear(data.year + 1)}
      >
        <ChevronRight />
      </Button>
    </ButtonGroup.Root>
  </div>

  <div class="grid w-full max-w-5xl gap-4 pt-3">
    {#if recorded.length === 0}
      <Empty.Root class="border py-12">
        <Empty.Header>
          <Empty.Media variant="icon">
            <Zap />
          </Empty.Media>
          <Empty.Title>No electricity use recorded in {data.year}</Empty.Title>
          <Empty.Description>
            The figures come from the entries on the Electricity page.
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button href="/electricity" variant="outline"
            >Open the Electricity page</Button
          >
        </Empty.Content>
      </Empty.Root>
    {:else}
      <!-- No bars when every figure is 0 kWh; the table still lists them. -->
      {#if ticks.length > 0}
        <Card.Root>
          <Card.Header>
            <Card.Title>kWh per month</Card.Title>
            <Card.Description>Electricity used in {data.year}</Card.Description>
            <Card.Action class="text-right">
              <div class="text-lg font-semibold">
                {kwhText(total)}
              </div>
              <div class="text-muted-foreground text-xs">
                in all, {averageFormat.format(total / recorded.length)} a month
                on average
              </div>
            </Card.Action>
          </Card.Header>
          <Card.Content class="grid gap-4">
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {#each buildings as b (b.buildingPk)}
                <span class="flex items-center gap-1.5">
                  <span
                    class="size-2.5 rounded-full bg-(--light) dark:bg-(--dark)"
                    style={buildingColour(b.order)}
                  ></span>
                  {b.name}
                </span>
              {/each}
            </div>
            <!-- Plain HTML bars: the app runs offline and has no chart library. -->
            <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
              <div class="relative h-52 w-12">
                {#each ticks as tick (tick)}
                  <span
                    class="text-muted-foreground absolute right-0 translate-y-1/2 text-xs tabular-nums"
                    style:bottom="{(tick / top) * 100}%"
                  >
                    {formatKwh(tick)}
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
                  {#each months as m, i (m.month)}
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger>
                        {#snippet child({ props })}
                          <a
                            {...props}
                            href="/electricity?month={m.month}"
                            class="group flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-muted hover:bg-muted/60"
                            aria-label="{monthLabel(m.month)}: {m.kwh === null
                              ? 'no electricity use recorded'
                              : kwhText(m.kwh)}"
                          >
                            {#if m.kwh}
                              <!-- One part per building, the first at the
                                   bottom, with a 2px gap between parts. -->
                              <span
                                class="flex w-full max-w-6 flex-col-reverse gap-0.5 overflow-hidden rounded-t-[4px]"
                                style:height="{(m.kwh / top) * 100}%"
                              >
                                {#each partsOf(i) as part (part.buildingPk)}
                                  {#if part.value > 0}
                                    <span
                                      class="min-h-px bg-(--light) dark:bg-(--dark)"
                                      style="{buildingColour(part.order)}; flex: {part.value} 1 0"
                                    ></span>
                                  {/if}
                                {/each}
                              </span>
                            {/if}
                          </a>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <div class="grid min-w-40 gap-0.5">
                          <span class="font-medium">{monthLabel(m.month)}</span>
                          {#if m.kwh === null}
                            <span>No electricity use recorded</span>
                          {:else}
                            {#each [...partsOf(i)].reverse() as part (part.buildingPk)}
                              <span class="flex items-center gap-2">
                                <span
                                  class="size-2 shrink-0 rounded-full bg-(--light) dark:bg-(--dark)"
                                  style={buildingColour(part.order)}
                                ></span>
                                {part.name}
                                <span class="ml-auto tabular-nums">
                                  {formatKwh(part.value)}
                                </span>
                              </span>
                            {/each}
                            <span
                              class="mt-0.5 flex justify-between border-t border-current/20 pt-0.5 font-medium tabular-nums"
                            >
                              <span>Total</span>
                              {kwhText(m.kwh)}
                            </span>
                          {/if}
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {/each}
                </div>
              </div>
              <div></div>
              <div class="flex pt-1.5">
                {#each months as m (m.month)}
                  <span
                    class="text-muted-foreground flex-1 text-center text-xs"
                  >
                    {monthShort(m.month)}
                  </span>
                {/each}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- The workbook's layout: one line per building, one column per month. -->
      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Building</Table.Head>
            {#each months as m (m.month)}
              <Table.Head class="text-right">
                <a href="/electricity?month={m.month}" class="hover:underline">
                  {monthShort(m.month)}
                </a>
              </Table.Head>
            {/each}
            <Table.Head class="text-right">Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each buildings as b (b.buildingPk)}
            <Table.Row>
              <Table.Cell class="font-medium">
                <span class="flex items-center gap-2">
                  <span
                    class="size-2.5 shrink-0 rounded-full bg-(--light) dark:bg-(--dark)"
                    style={buildingColour(b.order)}
                  ></span>
                  {b.name}
                </span>
              </Table.Cell>
              {#each b.kwh as value, i (months[i].month)}
                <Table.Cell class="text-right tabular-nums">
                  {value === null ? "—" : formatKwh(value)}
                </Table.Cell>
              {/each}
              <Table.Cell class="text-right font-medium tabular-nums">
                {b.kwh.some((v) => v !== null)
                  ? formatKwh(buildingTotal(b.kwh))
                  : "—"}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
        <Table.Footer>
          <Table.Row class="font-medium">
            <Table.Cell>Total</Table.Cell>
            {#each months as m (m.month)}
              <Table.Cell class="text-right tabular-nums">
                {m.kwh === null ? "—" : formatKwh(m.kwh)}
              </Table.Cell>
            {/each}
            <Table.Cell class="text-right tabular-nums">
              {formatKwh(total)}
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell class="font-medium">Status</Table.Cell>
            {#each months as m (m.month)}
              <!-- Plain words, not badges: twelve of them crowd the row. -->
              <Table.Cell
                class={[
                  "text-right text-xs",
                  m.status !== "submitted" && "text-muted-foreground",
                ]}
              >
                {STATUS_LABEL[m.status ?? "open"]}
              </Table.Cell>
            {/each}
            <Table.Cell class="text-right text-muted-foreground">
              {submitted} of {months.length}
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    {/if}
  </div>
</div>
