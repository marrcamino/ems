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
  import { ChevronLeft, ChevronRight, Droplets } from "@lucide/svelte/icons";
  import { monthLabel, monthName } from "../../paper/paper-month";
  import { cubicMeters, formatCubicMeters } from "../water-format";
  import type { WaterStatus } from "../water-types";

  let { data } = $props();

  const months = $derived(data.months);
  /** The months with a figure; a month with no entry is not 0. */
  const recorded = $derived(months.filter((m) => m.cubicMeters !== null));
  const total = $derived(
    recorded.reduce((sum, m) => sum + (m.cubicMeters ?? 0), 0),
  );
  const submitted = $derived(
    months.filter((m) => m.status === "submitted").length,
  );

  /** Round steps for the axis: 0, 20, 40, 60… with a clean top. */
  const ticks = $derived.by(() => {
    const max = Math.max(...months.map((m) => m.cubicMeters ?? 0), 0);
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
  const statusVariant = (s: WaterStatus | null) =>
    s === "submitted" ? "default" : "outline";
</script>

<svelte:head>
  <title>Water Summary - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/water">Water</Breadcrumb.Link>
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
            <Droplets />
          </Empty.Media>
          <Empty.Title>No water use recorded in {data.year}</Empty.Title>
          <Empty.Description>
            The figures come from the entries on the Water page.
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button href="/water" variant="outline">Open the Water page</Button>
        </Empty.Content>
      </Empty.Root>
    {:else}
      <!-- No bars when every figure is 0 m³; the table still lists them. -->
      {#if ticks.length > 0}
        <Card.Root>
          <Card.Header>
            <Card.Title>Cubic meters per month</Card.Title>
            <Card.Description>Water used in {data.year}</Card.Description>
            <Card.Action class="text-right">
              <div class="text-lg font-semibold tabular-nums">
                {cubicMeters(total)}
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
                    {formatCubicMeters(tick)}
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
                            href="/water?month={m.month}"
                            class="group flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-muted hover:bg-muted/60"
                            aria-label="{monthLabel(
                              m.month,
                            )}: {m.cubicMeters === null
                              ? 'no water use recorded'
                              : cubicMeters(m.cubicMeters)}"
                          >
                            {#if m.cubicMeters}
                              <span
                                class="w-full max-w-6 rounded-t-[4px] bg-sky-700 dark:bg-sky-600"
                                style:height="{(m.cubicMeters / top) * 100}%"
                              ></span>
                            {/if}
                          </a>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <div class="grid gap-0.5">
                          <span class="font-medium">{monthLabel(m.month)}</span>
                          <span class="tabular-nums">
                            {m.cubicMeters === null
                              ? "No water use recorded"
                              : cubicMeters(m.cubicMeters)}
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

      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Month</Table.Head>
            <Table.Head class="text-right">Cubic meters</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each months as m (m.month)}
            <Table.Row>
              <Table.Cell>
                <a href="/water?month={m.month}" class="hover:underline">
                  {monthName(m.month)}
                </a>
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {m.cubicMeters === null
                  ? "—"
                  : formatCubicMeters(m.cubicMeters)}
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
              {formatCubicMeters(total)}
            </Table.Cell>
            <Table.Cell class="text-muted-foreground font-normal">
              {submitted} of {months.length} submitted
            </Table.Cell>
          </Table.Row>
          <Table.Row class="font-medium">
            <Table.Cell>Average a month</Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {averageFormat.format(total / recorded.length)}
            </Table.Cell>
            <Table.Cell class="text-muted-foreground font-normal">
              of the {recorded.length}
              {recorded.length === 1 ? "month" : "months"} with water use recorded
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    {/if}
  </div>
</div>
