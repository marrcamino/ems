<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import type { Supplier } from "@/types";
  import { FileText, Plus, Store } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import AddPurchaseOrderDialog from "./add-purchase-order-dialog.svelte";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { amountInCentavos, type Fuel } from "./po-math.js";
  import type { PurchaseOrderRow } from "./po-types.js";
  import SuppliersDialog from "./suppliers/suppliers-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("admin:manage_purchase_orders"));

  // The active suppliers. Held here rather than re-read from `data`, so a
  // supplier added or edited in the dialog appears without waiting for the
  // page to reload. The page keeps it, not the dialog, because the add PO
  // form picks from it, and a new PO only ever names an active supplier.
  let suppliers = $state<Supplier[]>(untrack(() => data.suppliers));

  // Held here for the same reason: a PO saved in the dialog shows at once.
  let purchaseOrders = $state<PurchaseOrderRow[]>(
    untrack(() => data.purchaseOrders),
  );

  /**
   * The suppliers dialog is opened through the address (`?suppliers`), the
   * same as asset types on the assets page, so a link or a reload opens it.
   */
  const SUPPLIERS_PARAM = "suppliers";

  const suppliersDialogOpen = $derived(
    page.url.searchParams.has(SUPPLIERS_PARAM),
  );

  /**
   * Replaces the history entry rather than adding one, so Back leaves the
   * page instead of reopening the dialog.
   */
  function setSuppliersOpen(open: boolean) {
    const url = new URL(page.url);
    if (open) url.searchParams.set(SUPPLIERS_PARAM, "");
    else {
      url.searchParams.delete(SUPPLIERS_PARAM);
      // The dialog's tab goes with it, so reopening starts on Active.
      url.searchParams.delete("supplier-status");
    }
    goto(url, { noScroll: true, keepFocus: true, replaceState: true });
  }

  let addDialogOpen = $state(false);

  /** From the add PO dialog, when there is no supplier to pick yet. */
  function switchToSuppliers() {
    addDialogOpen = false;
    setSuppliersOpen(true);
  }

  function onSaved(row: PurchaseOrderRow) {
    purchaseOrders = [row, ...purchaseOrders].sort(
      (a, b) =>
        b.poDate.localeCompare(a.poDate) ||
        b.purchaseOrderPk - a.purchaseOrderPk,
    );
  }

  function litersOf(row: PurchaseOrderRow, fuel: Fuel) {
    const item = row.items.find((i) => i.fuelType === fuel);
    return item ? formatLiters(item.litersH) : "—";
  }

  function totalOf(row: PurchaseOrderRow) {
    return formatPesos(
      row.items.reduce(
        (sum, item) => sum + amountInCentavos(item.litersH, item.unitCostC),
        0,
      ),
    );
  }

  const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

  /** "2026-03-22" → "Mar 22, 2026", read as a calendar date, not UTC. */
  function formatDate(isoDate: string) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return dateFormat.format(new Date(y, m - 1, d));
  }
</script>

<svelte:head>
  <title>Purchase Orders - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/admin">Home</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/admin/fuel">Fuel Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Purchase Orders</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center gap-4 p-4 pt-0">
  <div class="flex w-full max-w-5xl flex-wrap items-start gap-x-4 gap-y-2 pt-1">
    <div class="ml-auto flex gap-2">
      <Button variant="outline" onclick={() => setSuppliersOpen(true)}>
        <Store />
        Manage suppliers
      </Button>
      {#if canManage}
        <Button onclick={() => (addDialogOpen = true)}>
          <Plus />
          Add purchase order
        </Button>
      {/if}
    </div>
  </div>

  <!--
    A plain list for now, so a saved PO shows somewhere. What a PO's page
    or row should show beyond this (each unit's allocation, used, left) is still
    to be designed.
  -->
  <div class="w-full max-w-5xl">
    {#if purchaseOrders.length > 0}
      <div class="rounded-xl border">
        <Table.Root>
          <Table.Header>
            <Table.Row class="hover:bg-transparent">
              <Table.Head>PO number</Table.Head>
              <Table.Head>PO date</Table.Head>
              <Table.Head>Supplier</Table.Head>
              <Table.Head class="text-right">Gasoline</Table.Head>
              <Table.Head class="text-right">Diesel</Table.Head>
              <Table.Head class="text-right">Amount</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each purchaseOrders as row (row.purchaseOrderPk)}
              <Table.Row>
                <Table.Cell class="font-medium">{row.poNumber}</Table.Cell>
                <Table.Cell>{formatDate(row.poDate)}</Table.Cell>
                <Table.Cell>{row.supplierName}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {litersOf(row, "gasoline")}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {litersOf(row, "diesel")}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {totalOf(row)}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {:else}
      <Empty.Root class="border">
        <Empty.Header>
          <Empty.Media variant="icon">
            <FileText />
          </Empty.Media>
          <Empty.Title>No purchase orders yet</Empty.Title>
          <Empty.Description>
            Add a PO once it is approved, and allocate its fuel to each
            division, section or unit.
          </Empty.Description>
        </Empty.Header>
        {#if canManage}
          <Empty.Content>
            <Button onclick={() => (addDialogOpen = true)}>
              <Plus />
              Add purchase order
            </Button>
          </Empty.Content>
        {/if}
      </Empty.Root>
    {/if}
  </div>
</div>

<SuppliersDialog
  open={suppliersDialogOpen}
  onOpenChange={setSuppliersOpen}
  bind:suppliers
/>

<AddPurchaseOrderDialog
  bind:open={addDialogOpen}
  {suppliers}
  unitOptions={data.unitOptions}
  {onSaved}
  onManageSuppliers={switchToSuppliers}
/>
