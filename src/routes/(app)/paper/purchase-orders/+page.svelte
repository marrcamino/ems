<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import { Plus, StickyNotes } from "@lucide/svelte/icons";
  import PaperPoCard from "./paper-po-card.svelte";
  import PaperPoDialog from "./paper-po-dialog.svelte";
  import type { PaperPoRow } from "./paper-po-types";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("purchase_orders:manage"));

  let dialogOpen = $state(false);
  let editing = $state<PaperPoRow | null>(null);
  function openDialog(po: PaperPoRow | null) {
    editing = po;
    dialogOpen = true;
  }
</script>

<svelte:head>
  <title>Paper Purchase Orders - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/paper">Paper</Breadcrumb.Link>
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
    <h1 class="text-xl font-semibold">Paper purchase orders</h1>
    {#if canManage}
      <Button class="ml-auto" onclick={() => openDialog(null)}>
        <Plus />
        Add purchase order
      </Button>
    {/if}
  </div>

  <div class="grid w-full max-w-5xl gap-4">
    {#each data.purchaseOrders as po (po.paperPurchaseOrderPk)}
      <PaperPoCard {po} {canManage} onEdit={() => openDialog(po)} />
    {:else}
      <Empty.Root class="rounded-xl border">
        <Empty.Header>
          <Empty.Media variant="icon">
            <StickyNotes />
          </Empty.Media>
          <Empty.Title>No paper purchase orders yet</Empty.Title>
          <Empty.Description>
            {canManage
              ? "Add a PO when COA forwards it, then give each office its reams."
              : "They show here once GSU adds them."}
          </Empty.Description>
        </Empty.Header>
      </Empty.Root>
    {/each}
  </div>
</div>

<PaperPoDialog
  bind:open={dialogOpen}
  {editing}
  suppliers={data.suppliers}
  offices={data.offices}
/>
