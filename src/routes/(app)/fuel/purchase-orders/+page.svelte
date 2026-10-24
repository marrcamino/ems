<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import type { Supplier } from "@/types";
  import { Plus, Store } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import AddPurchaseOrderDialog from "./add-purchase-order-dialog.svelte";
  import { formatPesos } from "$lib/utils/format-number.js";
  import { formatDate } from "./format-date.js";
  import AnimatedList from "$lib/components/transition/animated-list.svelte";
  import OpenPoCard from "./open-po-card.svelte";
  import type { PurchaseOrderRow } from "./po-types.js";
  import {
    SAMPLE_CLOSED_COUNT,
    SAMPLE_CLOSED_POS,
  } from "./sample-purchase-orders.js";
  import SuppliersDialog from "./suppliers/suppliers-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("purchase_orders:manage"));

  // The active suppliers. Held here rather than re-read from `data`, so a
  // supplier added or edited in the dialog appears without waiting for the
  // page to reload. The page keeps it, not the dialog, because the add PO
  // form picks from it, and a new PO only ever names an active supplier.
  let suppliers = $state<Supplier[]>(untrack(() => data.suppliers));

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

  /** The PO whose Edit button opened the dialog, or null when adding one. */
  let editing = $state<PurchaseOrderRow | null>(null);

  function openAdd() {
    editing = null;
    addDialogOpen = true;
  }

  function openEdit(po: PurchaseOrderRow) {
    editing = po;
    addDialogOpen = true;
  }

  function onDeleted(purchaseOrderPk: number) {
    purchaseOrders = purchaseOrders.filter(
      (po) => po.purchaseOrderPk !== purchaseOrderPk,
    );
  }

  /** From the add PO dialog, when there is no supplier to pick yet. */
  function switchToSuppliers() {
    addDialogOpen = false;
    setSuppliersOpen(true);
  }

  // Held here for the same reason: a PO saved in the dialog shows at once.
  let purchaseOrders = $state<PurchaseOrderRow[]>(
    untrack(() => data.purchaseOrders),
  );

  /**
   * Every PO counts as open until closing one is built. Oldest first, the
   * order slips are charged in, so the first one is used first.
   */
  const openPos = $derived(
    [...purchaseOrders].sort(
      (a, b) =>
        a.poDate.localeCompare(b.poDate) ||
        a.purchaseOrderPk - b.purchaseOrderPk,
    ),
  );

  /** A new PO is added to the list; an edited one replaces its old self. */
  function onSaved(row: PurchaseOrderRow) {
    purchaseOrders = purchaseOrders.some(
      (po) => po.purchaseOrderPk === row.purchaseOrderPk,
    )
      ? purchaseOrders.map((po) =>
          po.purchaseOrderPk === row.purchaseOrderPk ? row : po,
        )
      : [...purchaseOrders, row];
  }
</script>

<svelte:head>
  <title>Purchase Orders - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/fuel">Fuel</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Purchase Orders</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center gap-4 p-4 pt-0">
  <div class="flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 pt-1">
    <h1 class="text-xl font-semibold">Purchase orders</h1>
    <div class="ml-auto flex gap-2">
      <Button variant="outline" onclick={() => setSuppliersOpen(true)}>
        <Store />
        Manage suppliers
      </Button>
      {#if canManage}
        <Button onclick={openAdd}>
          <Plus />
          Add purchase order
        </Button>
      {/if}
    </div>
  </div>

  <!--
    The open POs come from the database. What depends on withdrawal slips or
    on closing a PO is still made up (sample-purchase-orders.ts): the slips not
    back, and the Closed list.
  -->
  <div class="grid w-full max-w-5xl gap-4">
    <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground/75">
      Open
      <Badge variant="secondary">{openPos.length}</Badge>
    </h2>

    <!-- A saved PO slides in and a deleted one out; the rest move over. -->
    <AnimatedList
      items={openPos}
      key={(po) => po.purchaseOrderPk}
      listClass="gap-4"
    >
      {#snippet item(po, i)}
        <OpenPoCard
          {po}
          useFirst={i === 0 && openPos.length > 1}
          {canManage}
          onEdit={() => openEdit(po)}
        />
      {/snippet}
      {#snippet empty()}
        <p
          class="text-muted-foreground rounded-xl border px-4 py-6 text-center text-sm"
        >
          No open purchase orders.
        </p>
      {/snippet}
    </AnimatedList>

    <h2
      class="mt-1.5 flex items-center gap-2 text-sm font-semibold text-foreground/75"
    >
      Closed
      <Badge variant="secondary">{SAMPLE_CLOSED_COUNT}</Badge>
    </h2>

    <div class="overflow-hidden rounded-xl border">
      <div class="overflow-x-auto">
        <Table.Root>
          <Table.Header>
            <Table.Row class="hover:bg-transparent">
              <Table.Head class="pl-4">PO number</Table.Head>
              <Table.Head>PO date</Table.Head>
              <Table.Head>Supplier</Table.Head>
              <Table.Head class="text-right">Amount</Table.Head>
              <Table.Head class="pr-4">Closed on</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each SAMPLE_CLOSED_POS as row (row.poNumber)}
              <Table.Row>
                <Table.Cell class="pl-4 font-medium">{row.poNumber}</Table.Cell>
                <Table.Cell>{formatDate(row.poDate)}</Table.Cell>
                <Table.Cell>{row.supplierName}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {formatPesos(row.amountC)}
                </Table.Cell>
                <Table.Cell class="pr-4">{formatDate(row.closedOn)}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
      <div class="bg-muted/40 flex justify-center border-t px-4 py-2.5">
        <Button variant="link" size="sm" class="h-auto p-0">
          Show all {SAMPLE_CLOSED_COUNT} closed POs
        </Button>
      </div>
    </div>
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
  {editing}
  {onSaved}
  {onDeleted}
  onManageSuppliers={switchToSuppliers}
/>
