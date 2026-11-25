<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import type { Supplier } from "@/types";
  import { Plus } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import AddPurchaseOrderDialog from "./add-purchase-order-dialog.svelte";
  import AnimatedList from "$lib/components/transition/animated-list.svelte";
  import OpenPoCard from "./open-po-card.svelte";
  import ClosePoDialog from "./close-po-dialog.svelte";
  import { deserialize } from "$app/forms";
  import { toast } from "svelte-sonner";
  import type { PurchaseOrderRow } from "./po-types.js";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("purchase_orders:manage"));

  // Active suppliers, which a new PO picks from. Managed on the Suppliers
  // page.
  const suppliers = $derived<Supplier[]>(data.suppliers);

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

  // Held here for the same reason: a PO saved in the dialog shows at once.
  let purchaseOrders = $state<PurchaseOrderRow[]>(
    untrack(() => data.purchaseOrders),
  );

  /**
   * Oldest first, the order slips are charged in, so the first one is used
   * first.
   */
  const openPos = $derived(
    purchaseOrders
      .filter((po) => !po.closedAt)
      .sort(
        (a, b) =>
          a.poDate.localeCompare(b.poDate) ||
          a.purchaseOrderPk - b.purchaseOrderPk,
      ),
  );
  /** The one closed last first. */
  const closedPos = $derived(
    purchaseOrders
      .filter((po) => po.closedAt)
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? "")),
  );

  let closing = $state<PurchaseOrderRow | null>(null);
  let closeOpen = $state(false);

  function setClosedAt(purchaseOrderPk: number, closedAt: string | null) {
    purchaseOrders = purchaseOrders.map((po) =>
      po.purchaseOrderPk === purchaseOrderPk ? { ...po, closedAt } : po,
    );
  }

  /** Reopening is undone by closing again, so it asks nothing first. */
  async function reopen(po: PurchaseOrderRow) {
    const body = new FormData();
    body.set("purchaseOrderPk", String(po.purchaseOrderPk));
    try {
      const response = await fetch("?/reopenPurchaseOrder", {
        method: "POST",
        body,
        headers: { "x-sveltekit-action": "true" },
      });
      const result = deserialize(await response.text());
      if (result.type === "success") {
        setClosedAt(po.purchaseOrderPk, null);
        toast.success(`PO ${po.poNumber} reopened`);
        return;
      }
    } catch {
      // Reported below.
    }
    toast.error(`PO ${po.poNumber} not reopened`, {
      description: "Try again. If it keeps happening, contact ICT.",
    });
  }

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
  <div
    class="flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 pt-1"
  >
    <h1 class="text-xl font-semibold">Purchase orders</h1>
    <div class="ml-auto flex gap-2">
      {#if canManage}
        <Button onclick={openAdd}>
          <Plus />
          Add purchase order
        </Button>
      {/if}
    </div>
  </div>

  <div class="grid w-full max-w-5xl gap-4">
    <h2
      class="flex items-center gap-2 text-sm font-semibold text-foreground/75"
    >
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
          onClose={() => {
            closing = po;
            closeOpen = true;
          }}
          onReopen={() => reopen(po)}
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
      <Badge variant="secondary">{closedPos.length}</Badge>
    </h2>

    <AnimatedList
      items={closedPos}
      key={(po) => po.purchaseOrderPk}
      listClass="gap-4"
    >
      {#snippet item(po)}
        <OpenPoCard
          {po}
          useFirst={false}
          {canManage}
          onEdit={() => {}}
          onClose={() => {}}
          onReopen={() => reopen(po)}
        />
      {/snippet}
      {#snippet empty()}
        <p
          class="text-muted-foreground rounded-xl border px-4 py-6 text-center text-sm"
        >
          No closed purchase orders yet.
        </p>
      {/snippet}
    </AnimatedList>
  </div>
</div>

<ClosePoDialog
  bind:open={closeOpen}
  po={closing}
  onClosed={(closedAt) => {
    if (closing) setClosedAt(closing.purchaseOrderPk, closedAt);
  }}
/>

<AddPurchaseOrderDialog
  bind:open={addDialogOpen}
  {suppliers}
  unitOptions={data.unitOptions}
  {editing}
  {onSaved}
  {onDeleted}
/>
