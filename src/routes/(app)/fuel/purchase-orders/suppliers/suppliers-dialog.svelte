<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import TinText from "@/components/tin-text.svelte";
  import AnimatedList from "@/components/transition/animated-list.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import { Skeleton } from "@/components/ui/skeleton";
  import type { Supplier } from "@/types";
  import {
    Archive,
    ArchiveRestore,
    EllipsisVertical,
    IdCard,
    Landmark,
    MapPin,
    Pencil,
    Plus,
    RotateCw,
    Store,
    Trash,
  } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";
  import DeleteSupplierDialog from "./delete-supplier-dialog.svelte";
  import SupplierForm from "./supplier-form.svelte";

  let {
    open,
    onOpenChange,
    suppliers = $bindable(),
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * The active suppliers, which come with the page. Owned by the purchase
     * orders page, which will need the same list to pick a supplier on a PO.
     */
    suppliers: Supplier[];
  } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("purchase_orders:manage"));

  /**
   * Which view the dialog shows. The add and edit form slides in over the
   * list inside this same dialog, instead of opening a second dialog on top.
   * DialogViews moves focus into the form and back to the button that opened
   * it, and turns Escape on the form into a step back to the list.
   */
  let view = $state<"list" | "form">("list");
  let supplierToEdit = $state<Supplier | null>(null);

  /**
   * Bumped each time the form is shown, which mounts a fresh copy of it, so
   * it never opens with what was typed the last time.
   */
  let formKey = $state(0);

  /**
   * Which suppliers the list shows. Kept in the address so a reload keeps
   * the view; `active` is the default and so is never written there.
   */
  const STATUS_PARAM = "supplier-status";
  const FILTERS = ["active", "archived", "all"] as const;
  type StatusFilter = (typeof FILTERS)[number];
  const FILTER_LABELS: Record<StatusFilter, string> = {
    active: "Active",
    archived: "Archived",
    all: "All",
  };

  const statusFilter = $derived.by<StatusFilter>(() => {
    const raw = page.url.searchParams.get(STATUS_PARAM);
    // Anything hand-typed that is not a real filter falls back to the default.
    return raw === "archived" || raw === "all" ? raw : "active";
  });

  function setStatusFilter(next: string) {
    const url = new URL(page.url);
    if (next === "active") url.searchParams.delete(STATUS_PARAM);
    else url.searchParams.set(STATUS_PARAM, next);
    // Replaced rather than added to history, the same as opening the dialog,
    // so Back leaves the page instead of stepping through every filter picked.
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  /**
   * The archived suppliers, fetched the first time Archived or All is
   * picked rather than with the page. The archive only grows, and most
   * visits never look at it. `null` until it has been fetched; kept after
   * that, and kept in step with every archive, restore, edit and delete, so
   * switching back and forth fetches only once.
   */
  let archived = $state<Supplier[] | null>(null);
  let archivedLoading = $state(false);
  let archivedFailed = $state(false);

  const showsArchived = $derived(statusFilter !== "active");

  async function loadArchived() {
    archivedLoading = true;
    archivedFailed = false;
    try {
      const response = await fetch(
        "/fuel/purchase-orders/suppliers?status=archived",
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { suppliers: Supplier[] };
      archived = body.suppliers;
    } catch (err) {
      console.error("Archived suppliers not loaded:", err);
      archivedFailed = true;
    } finally {
      archivedLoading = false;
    }
  }

  // Fetches once the dialog is open on Archived or All, including when a
  // reload opens it there straight from the address. A failed fetch waits
  // for Try again instead of retrying on its own.
  $effect(() => {
    if (
      open &&
      showsArchived &&
      archived === null &&
      !archivedLoading &&
      !archivedFailed
    ) {
      untrack(loadArchived);
    }
  });

  const listLoading = $derived(
    showsArchived && archived === null && !archivedFailed,
  );

  // Rebuilt from the two lists, so a supplier that is archived while Active
  // is shown leaves the list on its own, with its exit animation.
  const visibleSuppliers = $derived.by(() => {
    if (statusFilter === "active") return suppliers;
    if (archived === null) return [];
    return statusFilter === "archived"
      ? archived
      : sortByName([...suppliers, ...archived]);
  });

  /**
   * How long the skeleton stays up at least, in milliseconds. Shared by the
   * list and the count above it, so both hold for the same time and then
   * fade in together.
   */
  const SKELETON_HOLD_MS = 400;

  /**
   * How many suppliers the list is showing, counted from the list itself,
   * so it costs no query and is always right after an add or archive. Empty
   * when the archived ones failed to load, when there is no number to give.
   */
  const shownCount = $derived.by(() => {
    if (showsArchived && archived === null) return "";
    const n = visibleSuppliers.length;
    return `Showing ${n} supplier${n === 1 ? "" : "s"}`;
  });

  let deleteDialogOpen = $state(false);
  let supplierToDelete = $state<Supplier | null>(null);

  function sortByName(rows: Supplier[]) {
    return [...rows].sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName),
    );
  }

  function showForm(row: Supplier | null) {
    supplierToEdit = row;
    formKey += 1;
    view = "form";
  }

  function openAdd() {
    if (!canManage) return;
    showForm(null);
  }

  function showList() {
    view = "list";
  }

  // The dialog always reopens on the list. Reset once it has finished
  // closing, so the list does not slide back in while it fades out.
  function onOpenChangeComplete(isOpen: boolean) {
    if (!isOpen) view = "list";
  }

  function openDelete(row: Supplier) {
    supplierToDelete = row;
    deleteDialogOpen = true;
  }

  function replaceIn(rows: Supplier[], row: Supplier) {
    return sortByName(
      rows.map((s) => (s.supplierPk === row.supplierPk ? row : s)),
    );
  }

  function onSaved(row: Supplier, mode: "add" | "edit") {
    if (mode === "add") {
      // A new supplier is always active.
      suppliers = sortByName([...suppliers, row]);
    } else if (row.status === "active") {
      suppliers = replaceIn(suppliers, row);
    } else if (archived) {
      archived = replaceIn(archived, row);
    }
    showList();
  }

  /**
   * Every archive/restore toast shares this id, so a new one replaces
   * the one on screen instead of stacking, and only the latest change offers
   * Undo. The same rule as assets and asset types, with its own id.
   */
  const STATUS_TOAST_ID = "supplier-status";

  /** Suppliers with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /**
   * Archives a supplier or restores it, straight from its card menu. No
   * confirmation: it is undone in one click from the toast. Waits for the
   * server before changing the card, since on the office network the wait
   * is not noticeable.
   */
  async function setActive(row: Supplier, active: boolean) {
    pending.add(row.supplierPk);
    try {
      const body = new FormData();
      body.set("supplierPk", String(row.supplierPk));
      body.set("status", active ? "active" : "archived");
      const response = await fetch("?/setSupplierStatus", {
        method: "POST",
        body,
        headers: { "x-sveltekit-action": "true" },
      });
      const result = deserialize(await response.text());

      if (result.type !== "success") {
        const error =
          result.type === "failure"
            ? (result.data as { error?: string } | undefined)?.error
            : undefined;
        toast.error(
          `${row.supplierName} not ${active ? "restored" : "archived"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }

      const updated = result.data?.updatedRow as Supplier;
      const others = (rows: Supplier[]) =>
        rows.filter((s) => s.supplierPk !== updated.supplierPk);

      // The supplier moves from one list to the other. The archived list is
      // only touched once it has been fetched; until then the fetch will
      // bring the supplier along with the rest.
      if (active) {
        if (archived) archived = others(archived);
        suppliers = sortByName([...suppliers, updated]);
      } else {
        suppliers = others(suppliers);
        if (archived) archived = sortByName([...archived, updated]);
      }

      toast.success(`${row.supplierName} ${active ? "restored" : "archived"}`, {
        id: STATUS_TOAST_ID,
        action: { label: "Undo", onClick: () => setActive(updated, !active) },
      });
    } finally {
      pending.delete(row.supplierPk);
    }
  }

  function onDeleted(supplierPk: number) {
    suppliers = suppliers.filter((s) => s.supplierPk !== supplierPk);
    if (archived)
      archived = archived.filter((s) => s.supplierPk !== supplierPk);
  }
</script>

<Dialog.Root bind:open={() => open, onOpenChange} {onOpenChangeComplete}>
  <DialogViews.Content
    {view}
    onBack={showList}
    showCloseButton={view === "list"}
    data-nested={deleteDialogOpen}
  >
    <DialogViews.View
      name="list"
      title="Suppliers"
      description="The businesses that the office buys fuel from."
      class="gap-2"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!--
          A dropdown rather than tabs: picking Archived or All fetches the
          archived suppliers, which tabs would make look free.
        -->
        <Select.Root
          type="single"
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <Select.Trigger size="sm" class="min-w-32" aria-label="Show">
            {FILTER_LABELS[statusFilter]}
          </Select.Trigger>
          <Select.Content>
            {#each FILTERS as filter (filter)}
              <Select.Item value={filter} label={FILTER_LABELS[filter]}>
                {FILTER_LABELS[filter]}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if canManage}
          <Button size="sm" onclick={openAdd}>
            <Plus />
            Add supplier
          </Button>
        {/if}
      </div>

      <!--
        The count goes through its own ContentTransition with the same
        `loading` and hold as the list below, so it waits the same time,
        shows a placeholder bar beside the placeholder cards, and fades in in
        the same moment as the cards instead of ahead of them.

        A `div`, not a `p`, because ContentTransition renders divs. The live
        region is this outer box, which is always in place, so a screen
        reader still hears each new total.
      -->
      <div
        class="text-muted-foreground -mb-2 min-h-4 text-xs pb-1 pt-1 pl-1"
        aria-live="polite"
      >
        <ContentTransition
          loading={listLoading}
          minSkeletonDuration={SKELETON_HOLD_MS}
          animateHeight={false}
        >
          {#snippet skeleton()}
            <Skeleton class="h-3 w-28 rounded-sm" />
          {/snippet}
          {shownCount}
        </ContentTransition>
      </div>

      <ScrollArea
        class="-mx-4 flex min-h-0 flex-col"
        viewPortClasses="h-auto min-h-32 px-4"
        type="auto"
      >
        <AnimatedList
          items={visibleSuppliers}
          key={(row) => row.supplierPk}
          loading={listLoading}
          animateHeight={false}
          class="overflow-y-clip py-0.5"
          listClass="gap-3"
          skeleton={listSkeleton}
          empty={emptyState}
          minSkeletonDuration={SKELETON_HOLD_MS}
        >
          {#snippet item(row)}
            <Card.Root size="sm" class="gap-0">
              <Card.Header>
                <Card.Title class="flex items-center gap-2 pb-0.5">
                  {row.supplierName}
                  <!-- Only All mixes both, so only there does a badge tell anything. -->
                  {#if statusFilter === "all" && row.status === "archived"}
                    <Badge variant="destructive">Archived</Badge>
                  {/if}
                </Card.Title>
                <Card.Description class="flex items-start gap-1.5">
                  <MapPin class="mt-0.5 size-3.5 shrink-0" />
                  <span>{row.businessAddress}</span>
                </Card.Description>

                {#if canManage}
                  <Card.Action>
                    <ButtonGroup.Root>
                      <Button
                        variant="secondary"
                        size="sm"
                        onclick={() => showForm(row)}
                        class="border-r-0"
                      >
                        <Pencil />
                        Edit
                      </Button>
                      <ButtonGroup.Separator />
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                          class={buttonVariants({
                            variant: "secondary",
                            size: "icon-sm",
                          })}
                          disabled={pending.has(row.supplierPk)}
                          aria-label="More actions"
                        >
                          <EllipsisVertical />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="min-w-max">
                          {#if row.status === "active"}
                            <DropdownMenu.Item
                              onclick={() => setActive(row, false)}
                            >
                              <Archive /> Archive supplier
                            </DropdownMenu.Item>
                          {:else}
                            <DropdownMenu.Item
                              onclick={() => setActive(row, true)}
                            >
                              <ArchiveRestore /> Restore supplier
                            </DropdownMenu.Item>
                          {/if}
                          <DropdownMenu.Item
                            variant="destructive"
                            onclick={() => openDelete(row)}
                          >
                            <Trash /> Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </ButtonGroup.Root>
                  </Card.Action>
                {/if}
              </Card.Header>

              <Card.Content class="text-muted-foreground">
                <dl class="flex gap-x-1 text-sm">
                  <dt class="flex items-center">
                    <IdCard class="size-3.5 shrink-0" />
                    <span class="sr-only">TIN</span>
                  </dt>
                  <dd><TinText tin={row.tin} /></dd>

                  <dt class="ml-2 flex items-center">
                    <Landmark class="size-3.5 shrink-0" />
                    <span class="sr-only"> PhilGEPS number</span>
                  </dt>
                  <dd>
                    {#if row.philgepsNumber}
                      <span class="tabular-nums">
                        {row.philgepsNumber}
                      </span>
                    {:else}
                      <span>None</span>
                    {/if}
                  </dd>
                </dl>
              </Card.Content>
            </Card.Root>
          {/snippet}
        </AnimatedList>
      </ScrollArea>
    </DialogViews.View>

    <DialogViews.View
      name="form"
      title={supplierToEdit ? "Edit supplier" : "Add supplier"}
      description={supplierToEdit
        ? "Changes show on every purchase order that names it."
        : "A business that the office buys fuel from, as it is named on the purchase order."}
    >
      <!--
        Left mounted after Cancel, so it can slide out instead of vanishing;
        the next Add or Edit replaces it with a fresh copy.
      -->
      {#key formKey}
        {#if formKey > 0}
          <SupplierForm {supplierToEdit} {onSaved} onCancel={showList} />
        {/if}
      {/key}
    </DialogViews.View>

    <!--
      A confirmation still opens on top, as DialogViews intends. Kept inside
      the dialog's content on purpose: this dialog holds focus while it is
      open, so a dialog mounted outside it would open behind it and could
      not be clicked.
    -->
    <DeleteSupplierDialog
      bind:open={deleteDialogOpen}
      {supplierToDelete}
      {onDeleted}
    />
  </DialogViews.Content>
</Dialog.Root>

{#snippet emptyState()}
  {#if showsArchived && archivedFailed}
    <Empty.Root class="border py-8">
      <Empty.Header>
        <Empty.Title>Archived suppliers not loaded</Empty.Title>
        <Empty.Description>
          If it keeps happening, check that the server is running.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button variant="outline" onclick={loadArchived}>
          <RotateCw />
          Try again
        </Button>
      </Empty.Content>
    </Empty.Root>
  {:else if statusFilter !== "all"}
    <!--
      Nothing under this filter. Without the archived ones loaded, an empty
      Active list cannot tell "none yet" from "all archived", so it says only
      what it knows and offers the other list.
    -->
    <div
      class="text-muted-foreground flex flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-center text-sm"
    >
      {#if statusFilter === "archived"}
        No archived suppliers.
      {:else}
        No active suppliers.
        <Button
          variant="link"
          size="sm"
          onclick={() => setStatusFilter("archived")}
        >
          Show archived suppliers
        </Button>
      {/if}
    </div>
  {:else}
    <!-- All, with both lists loaded and empty: there truly are none. -->
    <Empty.Root class="border py-8">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Store />
        </Empty.Media>
        <Empty.Title>No suppliers yet</Empty.Title>
        <Empty.Description>
          Add the gas station that is named on the purchase order, so that it
          can be picked when the PO is added.
        </Empty.Description>
      </Empty.Header>
      {#if canManage}
        <Empty.Content>
          <Button onclick={openAdd}>
            <Plus />
            Add supplier
          </Button>
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
{/snippet}

<!-- Three placeholder cards while the archived suppliers are fetched. -->
{#snippet listSkeleton()}
  <Card.Root size="sm" class="relative" style="height: 89.25px;">
    <Card.Header>
      <Card.Title class="flex items-center gap-2 pb-0.5">
        <Skeleton class="h-5" style="width:200px" />
      </Card.Title>
      <Card.Description class="pt-1 ">
        <Skeleton
          class="h-7 rounded-lg absolute border border-card top-2.5 right-2.5"
          style="width: 90px"
        />

        <div class="flex items-center gap-1">
          <Skeleton class="size-4 rounded-sm" />
          <Skeleton class="h-4 rounded-sm" style="width:250px" />
        </div>

        <div class="flex items-center gap-1">
          <div class="flex items-center gap-1 mt-1.5">
            <Skeleton class="size-4 rounded-sm" />
            <Skeleton class="h-4 rounded-sm" style="width:100px" />
          </div>
          <div class="flex items-center gap-1 mt-1.5 ml-1.5">
            <Skeleton class="size-4 rounded-sm" />
            <Skeleton class="h-4 rounded-sm" style="width:100px" />
          </div>
        </div>
      </Card.Description>
    </Card.Header>
  </Card.Root>
{/snippet}
