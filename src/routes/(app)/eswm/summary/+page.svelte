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
  import { ChevronLeft, ChevronRight, Recycle } from "@lucide/svelte/icons";
  import { monthLabel } from "../../paper/paper-month";
  import { formatKilos } from "../eswm-format";
  import {
    blockTotal,
    monthTotal,
    SOURCE_LABEL,
    sourceColour,
    WASTE_LABEL,
    WASTE_SOURCES,
    WASTE_TYPES,
    type WasteType,
  } from "../eswm-waste";

  let { data } = $props();

  const months = $derived(data.months);

  /** Adds up the figures that were weighed; null when none was. */
  function sumOf(values: (number | null | undefined)[]) {
    const known = values.filter((v) => v != null);
    return known.length === 0 ? null : known.reduce((sum, v) => sum + v, 0);
  }
  const typeYear = (
    source: (typeof WASTE_SOURCES)[number],
    type: WasteType,
  ) => sumOf(months.map((m) => m.waste[source][type]));
  const blockYear = (source: (typeof WASTE_SOURCES)[number]) =>
    sumOf(months.map((m) => blockTotal(m.waste[source])));

  const total = $derived(sumOf(months.map((m) => monthTotal(m.waste))));
  const submitted = $derived(
    months.filter((m) => m.status === "submitted").length,
  );
  /** A year that nothing was recorded or submitted in shows no table. */
  const anyRecord = $derived(months.some((m) => m.status !== null));

  /** Round steps for the kilos axis: 0, 50, 100, 150… with a clean top. */
  const ticks = $derived.by(() => {
    const max = Math.max(
      0,
      ...months.flatMap((m) =>
        WASTE_SOURCES.map((s) => blockTotal(m.waste[s]) ?? 0),
      ),
    );
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

  const kgText = (kilos: number | null | undefined) =>
    kilos == null ? "—" : formatKilos(kilos);

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
</script>

<svelte:head>
  <title>ESWM Summary - EMS</title>
</svelte:head>

{#snippet dot(source: (typeof WASTE_SOURCES)[number])}
  <span
    class="size-2.5 shrink-0 rounded-full bg-(--light) dark:bg-(--dark)"
    style={sourceColour(source)}
  ></span>
{/snippet}

{#snippet monthCells(values: (number | null | undefined)[], year: number | null)}
  {#each values as value, i (months[i].month)}
    <Table.Cell class="text-right tabular-nums">{kgText(value)}</Table.Cell>
  {/each}
  <Table.Cell class="text-right font-medium tabular-nums">
    {kgText(year)}
  </Table.Cell>
{/snippet}

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
    {#if total === null}
      <Empty.Root class="border py-12">
        <Empty.Header>
          <Empty.Media variant="icon">
            <Recycle />
          </Empty.Media>
          <Empty.Title>No waste recorded in {data.year}</Empty.Title>
          <Empty.Description>
            The figures come from the kilos on the ESWM page.
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button href="/eswm" variant="outline">Open the ESWM page</Button>
        </Empty.Content>
      </Empty.Root>
    {:else if ticks.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Kilos per month</Card.Title>
          <Card.Description>Waste weighed in {data.year}</Card.Description>
          <Card.Action class="text-right">
            <div class="text-lg font-semibold tabular-nums">
              {formatKilos(total)} kg
            </div>
            <div class="text-muted-foreground text-xs">in all</div>
          </Card.Action>
        </Card.Header>
        <Card.Content class="grid gap-4">
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {#each WASTE_SOURCES as source (source)}
              <span class="flex items-center gap-1.5">
                {@render dot(source)}
                {SOURCE_LABEL[source]}
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
                  {@const monthKilos = monthTotal(m.waste)}
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                      {#snippet child({ props })}
                        <a
                          {...props}
                          href="/eswm?month={m.month}"
                          class="group flex h-full flex-1 items-end justify-center gap-0.5 rounded-sm outline-none focus-visible:bg-muted hover:bg-muted/60"
                          aria-label="{monthLabel(m.month)}: {monthKilos ===
                          null
                            ? 'no waste recorded'
                            : `${formatKilos(monthKilos)} kg`}"
                        >
                          <!-- Coastal and office side by side; a block with
                               nothing weighed has no bar, never a 0 bar. -->
                          {#each WASTE_SOURCES as source (source)}
                            {@const kilos = blockTotal(m.waste[source])}
                            <span
                              class={[
                                "w-full max-w-4 rounded-t-[4px] bg-(--light) dark:bg-(--dark)",
                                !kilos && "invisible",
                              ]}
                              style="{sourceColour(source)}; height: {((kilos ??
                                0) /
                                top) *
                                100}%"
                            ></span>
                          {/each}
                        </a>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="grid min-w-44 gap-0.5">
                        <span class="font-medium">{monthLabel(m.month)}</span>
                        {#each WASTE_SOURCES as source (source)}
                          <span class="flex items-center gap-2">
                            {@render dot(source)}
                            {SOURCE_LABEL[source]}
                            <span class="ml-auto tabular-nums">
                              {kgText(blockTotal(m.waste[source]))}
                            </span>
                          </span>
                        {/each}
                        <span
                          class="mt-0.5 flex justify-between border-t border-current/20 pt-0.5 font-medium tabular-nums"
                        >
                          <span>Total</span>
                          {monthKilos === null
                            ? "—"
                            : `${formatKilos(monthKilos)} kg`}
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
      <!-- The workbook's layout: each block's total over its types, one
           column per month, in kilos. -->
      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Kilos</Table.Head>
            {#each months as m (m.month)}
              <Table.Head class="text-right">
                <a href="/eswm?month={m.month}" class="hover:underline">
                  {monthShort(m.month)}
                </a>
              </Table.Head>
            {/each}
            <Table.Head class="text-right">Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each WASTE_SOURCES as source (source)}
            <Table.Row class="bg-muted/30 font-medium">
              <Table.Cell>
                <span class="flex items-center gap-2">
                  {@render dot(source)}
                  {SOURCE_LABEL[source]}
                </span>
              </Table.Cell>
              {@render monthCells(
                months.map((m) => blockTotal(m.waste[source])),
                blockYear(source),
              )}
            </Table.Row>
            {#each WASTE_TYPES[source] as { type } (type)}
              <Table.Row>
                <Table.Cell class="pl-7">{WASTE_LABEL[type]}</Table.Cell>
                {@render monthCells(
                  months.map((m) => m.waste[source][type]),
                  typeYear(source, type),
                )}
              </Table.Row>
            {/each}
          {/each}
        </Table.Body>
        <Table.Footer>
          <Table.Row class="font-medium">
            <Table.Cell>Total</Table.Cell>
            {@render monthCells(
              months.map((m) => monthTotal(m.waste)),
              total,
            )}
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
