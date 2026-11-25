<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { quintInOut } from "svelte/easing";
  import { slide } from "svelte/transition";
  import { formatDate } from "$lib/utils/format-date.js";
  import { amountInCentavos, FUEL_LABELS, litersForPesos } from "./po-math.js";
  import type { PurchaseOrderRow } from "./po-types.js";

  /**
   * One open PO: its number and supplier, a box per fuel with what is left,
   * a note at the bottom, and its allocations behind "Show all allocations".
   *
   * "Used" is what the withdrawals charged to it have taken, counted the same
   * way as the New withdrawal form's balance: a slip that is not back counts
   * at what was requested. The footer names the slips not back yet. Edit
   * opens the PO's dialog, to change or delete it; Close PO opens the close
   * check. A closed PO shows the same card with Reopen instead.
   */
  let {
    po,
    useFirst,
    canManage,
    onEdit,
    onClose,
    onReopen,
  }: {
    po: PurchaseOrderRow;
    /** The oldest open PO, while there is more than one: slips go here first. */
    useFirst: boolean;
    canManage: boolean;
    onEdit: () => void;
    onClose: () => void;
    onReopen: () => void;
  } = $props();

  let reopening = $state(false);

  let showAllocations = $state(false);

  /** One box per fuel on the PO, with its allocations' pesos worked out. */
  const fuels = $derived(
    po.items.map((item) => {
      const totalC = amountInCentavos(item.litersH, item.unitCostC);
      const usedC = item.allocations.reduce((s, a) => s + a.usedC, 0);
      const leftC = totalC - usedC;
      return {
        fuel: item.fuelType,
        totalC,
        usedC,
        leftC,
        aboutH: litersForPesos(leftC, item.unitCostC),
        allocations: item.allocations.map((a) => {
          const allocationC = amountInCentavos(a.litersH, item.unitCostC);
          const left = allocationC - a.usedC;
          return {
            ...a,
            allocationC,
            leftC: left,
            aboutH: litersForPesos(left, item.unitCostC),
          };
        }),
      };
    }),
  );

  /** The footer names this many slips, then says how many more there are. */
  const SLIPS_NAMED = 3;

  const amountC = $derived(fuels.reduce((s, f) => s + f.totalC, 0));
  const remainingC = $derived(fuels.reduce((s, f) => s + f.leftC, 0));

  const shortDate = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  });

  function formatShortDate(isoDate: string) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return shortDate.format(new Date(y, m - 1, d));
  }
</script>

<section class="rounded-xl border" aria-label="PO {po.poNumber}">
  <div class="flex flex-wrap items-start gap-3 p-4">
    <div class="grid min-w-0 gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-lg font-semibold whitespace-nowrap">
          PO {po.poNumber}
        </h2>
        {#if po.closedAt}
          <Badge variant="secondary">Closed</Badge>
        {:else}
          <Badge class="bg-primary/10 text-primary">Open</Badge>
        {/if}
        {#if useFirst}
          <Badge
            class="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            Use first
          </Badge>
        {/if}
      </div>
      <p class="text-muted-foreground text-sm">
        {po.supplierName} · {formatDate(po.poDate)} · {formatPesos(amountC)}
      </p>
    </div>

    <div class="ml-auto grid justify-items-end gap-1">
      {#if canManage}
        <div class="flex gap-1.5">
          {#if po.closedAt}
            <Button
              variant="outline"
              size="sm"
              disabled={reopening}
              onclick={async () => {
                reopening = true;
                await onReopen();
                reopening = false;
              }}>Reopen</Button
            >
          {:else}
            <Button variant="ghost" size="sm" onclick={onEdit}>Edit</Button>
            <Button variant="outline" size="sm" onclick={onClose}
              >Close PO</Button
            >
          {/if}
        </div>
      {/if}
      <span class="text-muted-foreground text-xs tabular-nums">
        {#if po.closedAt}
          Closed on {formatDate(po.closedAt.slice(0, 10))}
        {:else}
          {formatPesos(remainingC)} not used yet
        {/if}
      </span>
    </div>
  </div>

  <div class="grid gap-3 px-4 pb-4 sm:grid-cols-2">
    {#each fuels as f (f.fuel)}
      <div class="grid gap-2 rounded-lg border px-3.5 py-3">
        <div class="flex items-baseline gap-2">
          <span class="font-medium">{FUEL_LABELS[f.fuel]}</span>
          <span class="text-muted-foreground ml-auto text-xs tabular-nums">
            of {formatPesos(f.totalC)}
          </span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="text-2xl font-semibold tabular-nums">
            {formatPesos(f.leftC)}
          </span>
          <span class="text-muted-foreground text-sm">
            remaining amount{#if f.leftC === 0}
              &nbsp;· used up{:else if po.poType === "price"}
              &nbsp;· about {formatLiters(f.aboutH, { dropZeros: true })}{/if}
          </span>
        </div>
        <div
          class="bg-muted h-1.5 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div
            class="bg-primary h-full"
            style:width="{f.totalC ? (f.usedC / f.totalC) * 100 : 0}%"
          ></div>
        </div>
      </div>
    {/each}
  </div>

  {#if showAllocations}
    <div
      class="overflow-x-auto border-t"
      in:slide={{
        duration: 300,
        easing: quintInOut,
      }}
      out:slide={{
        duration: 300,
        easing: quintInOut,
      }}
    >
      <Table.Root>
        <Table.Header>
          <Table.Row class="hover:bg-transparent [&>th]:text-muted-foreground">
            <Table.Head class="pl-4">Division, section, or unit</Table.Head>
            <Table.Head>Fuel</Table.Head>
            <Table.Head class="text-right">Allocation</Table.Head>
            <Table.Head class="text-right">Used</Table.Head>
            <Table.Head class="pr-4 text-right">Remaining amount</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each fuels as f (f.fuel)}
            {#each f.allocations as a (a.orgUnitPk)}
              <Table.Row>
                <Table.Cell class="pl-4">{a.abbr}</Table.Cell>
                <Table.Cell>{FUEL_LABELS[f.fuel]}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatPesos(a.allocationC)}
                  <span class="text-muted-foreground text-xs">
                    ({formatLiters(a.litersH)})
                  </span>
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatPesos(a.usedC)}
                </Table.Cell>
                <Table.Cell
                  class={[
                    "pr-4 text-right tabular-nums",
                    a.leftC === 0 && "text-muted-foreground",
                  ]}
                >
                  {formatPesos(a.leftC)}
                  {#if a.leftC > 0}
                    <span class="text-muted-foreground text-xs">
                      · about {formatLiters(a.aboutH)}
                    </span>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}

  <div
    class="bg-muted/40 flex flex-wrap items-center gap-2 rounded-b-xl border-t px-4 py-2.5 text-sm"
  >
    {#if po.slipsOut.length > 0}
      {@const more = po.slipsOut.length - SLIPS_NAMED}
      <span class="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true"
      ></span>
      <span>
        {po.slipsOut.length === 1 ? "1 slip" : `${po.slipsOut.length} slips`}
        not back yet:
        {#each po.slipsOut.slice(0, SLIPS_NAMED) as s, i (i)}
          {i > 0 ? "; " : ""}{s.office}, {FUEL_LABELS[s.fuel].toLowerCase()},
          {s.requestedC !== null
            ? formatPesos(s.requestedC)
            : formatLiters(s.requestedH ?? 0, { dropZeros: true })} requested on {formatShortDate(
            s.fileDate,
          )}
        {/each}{#if more > 0}; and {more} more{/if}
      </span>
    {/if}
    <Button
      variant="link"
      size="sm"
      class="ml-auto h-auto p-0"
      aria-expanded={showAllocations}
      onclick={() => (showAllocations = !showAllocations)}
    >
      {showAllocations ? "Hide allocations" : "Show all allocations"}
    </Button>
  </div>
</section>
