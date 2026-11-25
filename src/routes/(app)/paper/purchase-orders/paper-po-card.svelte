<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { paperSizeLabel } from "$lib/paper-sizes";
  import { formatDate } from "$lib/utils/format-date.js";
  import { reamCount } from "../paper-month";
  import HandoverDialog from "./handover-dialog.svelte";
  import { heldFor, type PaperPoRow } from "./paper-po-types";

  /**
   * One paper PO: its number, supplier, and date, then a table of each
   * office's share, one column per size, with what GSU still holds of it and
   * a Hand over button for that.
   */
  let {
    po,
    canManage,
    onEdit,
  }: {
    po: PaperPoRow;
    canManage: boolean;
    onEdit: () => void;
  } = $props();

  const total = $derived(po.items.reduce((sum, i) => sum + i.reams, 0));

  const heldTotal = (d: PaperPoRow["distributions"][number]) =>
    Object.values(heldFor(d)).reduce((sum, n) => sum + (n ?? 0), 0);
  const totalHeld = $derived(
    po.distributions.reduce((sum, d) => sum + heldTotal(d), 0),
  );

  let handoverOpen = $state(false);
  let handoverOffice = $state<PaperPoRow["distributions"][number] | null>(null);
</script>

<section class="rounded-xl border" aria-label="PO {po.poNumber}">
  <div class="flex flex-wrap items-start gap-3 p-4">
    <div class="grid min-w-0 gap-1">
      <h2 class="text-lg font-semibold whitespace-nowrap">PO {po.poNumber}</h2>
      <p class="text-muted-foreground text-sm">
        {po.supplierName ? `${po.supplierName} · ` : ""}{formatDate(po.poDate)} ·
        {reamCount(total)}{totalHeld > 0
          ? ` · GSU holds ${reamCount(totalHeld)}`
          : ""}
      </p>
    </div>
    {#if canManage}
      <Button class="ml-auto" variant="ghost" size="sm" onclick={onEdit}>
        Edit
      </Button>
    {/if}
  </div>

  <div class="overflow-x-auto border-t">
    <Table.Root>
      <Table.Header>
        <Table.Row class="hover:bg-transparent [&>th]:text-muted-foreground">
          <Table.Head class="pl-4">Division/Section/Unit</Table.Head>
          {#each po.items as item (item.paperSize)}
            <Table.Head class="pr-4 text-right">
              {paperSizeLabel(item.paperSize)}
            </Table.Head>
          {/each}
          {#if canManage}
            <Table.Head class="w-0"></Table.Head>
          {/if}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each po.distributions as d (d.orgUnitPk)}
          <Table.Row>
            <Table.Cell class="pl-4">{d.orgUnitName}</Table.Cell>
            {#each po.items as item (item.paperSize)}
              {@const held = heldFor(d)[item.paperSize] ?? 0}
              <Table.Cell class="pr-4 text-right tabular-nums">
                {d.reams[item.paperSize] ?? "—"}
                <!-- Part of the office's share that GSU still keeps. -->
                {#if held > 0}
                  <span class="text-muted-foreground block text-xs">
                    {held} held
                  </span>
                {/if}
              </Table.Cell>
            {/each}
            {#if canManage}
              <Table.Cell class="pr-4">
                {#if heldTotal(d) > 0}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => {
                      handoverOffice = d;
                      handoverOpen = true;
                    }}
                  >
                    Hand over
                  </Button>
                {/if}
              </Table.Cell>
            {/if}
          </Table.Row>
        {:else}
          <Table.Row class="hover:bg-transparent">
            <Table.Cell
              colspan={po.items.length + 2}
              class="text-muted-foreground py-4 pl-4"
            >
              No office is allocated paper from this PO yet.
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
      <Table.Footer>
        <Table.Row class="text-muted-foreground">
          <Table.Cell class="pl-4 font-normal">On the PO</Table.Cell>
          {#each po.items as item (item.paperSize)}
            <Table.Cell class="pr-4 text-right font-normal tabular-nums">
              {item.reams}
            </Table.Cell>
          {/each}
          {#if canManage}
            <Table.Cell></Table.Cell>
          {/if}
        </Table.Row>
        <!-- Only once a size has one: paper kept in the stock room. -->
        {#if po.items.some((i) => i.stockNumber)}
          <Table.Row class="text-muted-foreground">
            <Table.Cell class="pl-4 font-normal">Stock/Property No.</Table.Cell>
            {#each po.items as item (item.paperSize)}
              <Table.Cell class="pr-4 text-right font-normal">
                {item.stockNumber ?? "—"}
              </Table.Cell>
            {/each}
            {#if canManage}
              <Table.Cell></Table.Cell>
            {/if}
          </Table.Row>
        {/if}
      </Table.Footer>
    </Table.Root>
  </div>

  {#if po.remarks}
    <p class="text-muted-foreground border-t px-4 py-2.5 text-sm">
      {po.remarks}
    </p>
  {/if}
</section>

<HandoverDialog bind:open={handoverOpen} {po} office={handoverOffice} />
