<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import type { AssetType } from "@/types";
  import { Pencil, Plus, Tags } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import { flip } from "svelte/animate";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import AddEditAssetTypeDialog from "./add-edit-asset-type-dialog.svelte";
  import { meterTypeLabel } from "./meter-types.js";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("admin:manage_assets"));

  // Held here rather than re-read from `data`, so a row added or edited in the
  // dialog appears without waiting for the page to reload.
  let assetTypes = $state<AssetType[]>(untrack(() => data.assetTypes));

  let dialogOpen = $state(false);
  let assetTypeToEdit = $state<AssetType | null>(null);

  function openAdd() {
    assetTypeToEdit = null;
    dialogOpen = true;
  }

  function openEdit(row: AssetType) {
    assetTypeToEdit = row;
    dialogOpen = true;
  }

  function onSaved(row: AssetType, mode: "add" | "edit") {
    assetTypes =
      mode === "add"
        ? [...assetTypes, row]
        : assetTypes.map((t) => (t.assetTypePk === row.assetTypePk ? row : t));
    assetTypes.sort((a, b) => a.assetTypeName.localeCompare(b.assetTypeName));
  }

  /**
   * A row fades in only when it is new to a table that is already on screen.
   * On the first render every row is new, and animating all of them at once
   * on page load reads as sluggish rather than lively — the block itself is
   * already settling into place at that moment.
   *
   * Neither of these is `$state`, deliberately, mirroring animated-list.svelte:
   * the effect below runs after this render's transitions have already read
   * them, which is what makes "was it here before?" answerable at all.
   */
  let seenRows = new Set<number>();
  let tableWasVisible = false;

  $effect(() => {
    const showing = assetTypes.length > 0;
    seenRows = showing
      ? new Set(assetTypes.map((row) => row.assetTypePk))
      : new Set();
    tableWasVisible = showing;
  });

  function rowIntro(assetTypePk: number) {
    const isNewToAVisibleTable = tableWasVisible && !seenRows.has(assetTypePk);
    if (!isNewToAVisibleTable || prefersReducedMotion()) {
      return { duration: 0 };
    }
    return { duration: DURATION.item };
  }

  /** Moves the other rows aside when an edited name changes the sort order. */
  function rowFlip() {
    return {
      duration: prefersReducedMotion() ? 0 : DURATION.item,
      easing: easeOut,
    };
  }
</script>

<svelte:head>
  <title>Asset Types - EMS</title>
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
        <Breadcrumb.Link href="/admin/fuel/assets">Assets</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Asset Types</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center gap-4 p-4 pt-0">
  <div class="flex items-start justify-between w-full gap-4 max-w-4xl">
    <div class="grid gap-1">
      <h1 class="text-lg font-semibold">Asset types</h1>
      <p class="text-muted-foreground max-w-prose text-sm">
        The kinds of machine the office supplies fuel for. Every asset belongs
        to one kind, and the kind decides what the fuel record asks for.
      </p>
    </div>
    {#if canManage}
      <div class="ml-auto">
        <Button onclick={openAdd}>
          <Plus />
          Add asset type
        </Button>
      </div>
    {/if}
  </div>

  <!--
    The empty state and the table are two states of the same block, so the
    swap between them is animated rather than instant. It happens exactly
    once in practice — when somebody adds the first type from the empty
    state — which is the moment worth smoothing. There is no `loading`, since
    the rows arrive with the page from the server.
  -->
  <ContentTransition
    isEmpty={assetTypes.length === 0}
    empty={emptyState}
    class="max-w-4xl w-full"
  >
    <Table.Root containerClass="border rounded-lg ">
      <Table.Header class="bg-muted/80 rounded-t-lg">
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>Meter</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head class="w-0"></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <!--
            A plain `<tr>` rather than `Table.Row`, because a transition can
            only be put on an element — passing one to a component is not a
            thing Svelte does. The classes are copied from table-row.svelte so
            it still looks like every other row in the app.
          -->
        {#each assetTypes as row (row.assetTypePk)}
          <tr
            data-slot="table-row"
            class="hover:bg-muted/50 border-b transition-colors"
            animate:flip={rowFlip()}
            in:itemIn={rowIntro(row.assetTypePk)}
            out:itemOut={{ duration: DURATION.exit }}
          >
            <Table.Cell class="font-medium">{row.assetTypeName}</Table.Cell>
            <Table.Cell class="text-muted-foreground">
              {meterTypeLabel(row.meterType)}
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant={row.status === "active" ? "secondary" : "outline"}
              >
                {row.status === "active" ? "In use" : "Not in use"}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              {#if canManage}
                <Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
                  <Pencil />
                  Edit
                </Button>
              {/if}
            </Table.Cell>
          </tr>
        {/each}
      </Table.Body>
    </Table.Root>
  </ContentTransition>
</div>

<AddEditAssetTypeDialog bind:open={dialogOpen} {assetTypeToEdit} {onSaved} />

{#snippet emptyState()}
  <Empty.Root class="border py-12">
    <Empty.Header>
      <Empty.Media variant="icon">
        <Tags />
      </Empty.Media>
      <Empty.Title>No asset types yet</Empty.Title>
      <Empty.Description>
        Start with the kinds already on the withdrawal slip: motorcycle,
        pick-up, generator, and grass cutter. You can add more anytime
      </Empty.Description>
    </Empty.Header>
    {#if canManage}
      <Empty.Content>
        <Button onclick={openAdd}>
          <Plus />
          Add asset type
        </Button>
      </Empty.Content>
    {/if}
  </Empty.Root>
{/snippet}
