<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import ContentTransition from "@/components/transition/content-transition.svelte";
  import type { AssetType } from "@/types";
  import {
    CircleCheck,
    CircleOff,
    EllipsisVertical,
    Pencil,
    Plus,
    Tags,
    Trash,
  } from "@lucide/svelte/icons";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { deserialize } from "$app/forms";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";
  import { flip } from "svelte/animate";
  import AddEditAssetTypeDialog from "./add-edit-asset-type-dialog.svelte";
  import DeleteAssetTypeDialog from "./delete-asset-type-dialog.svelte";
  import { meterTypeLabel } from "./meter-types.js";
  import ReactivateAssetTypeDialog from "./reactivate-asset-type-dialog.svelte";
  import { countUsage, type AssetTypeRow } from "./types.js";

  let {
    open,
    onOpenChange,
    assetTypes = $bindable(),
    openAddWhenReady,
    onAddOpened,
    onTypeSaved,
    assets,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Owned by the assets page, which also needs to know what types exist. */
    assetTypes: AssetTypeRow[];
    /**
     * Set when this dialog was opened asking for the add dialog too. Read
     * once this one has finished opening, so the add dialog does not appear
     * on top of a panel that is still animating in.
     */
    openAddWhenReady: boolean;
    /** Lets the page clear the request, so a reload does not repeat it. */
    onAddOpened: () => void;
    /** Lets the page refresh the type name shown on its asset rows. */
    onTypeSaved: (row: AssetType) => void;
    /**
     * The assets on the page right now, so Delete can tell whether a type is
     * still in use after assets were added or deleted without a reload.
     */
    assets: { assetTypeFk: number; assetName: string }[];
  } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("admin:manage_assets"));

  /**
   * Which types the table shows. Kept in the address so a reload keeps the
   * view; `active` is the default and so is never written there. Filtered
   * here rather than on the server, because the page already holds every
   * type and there are only a handful of them.
   */
  const STATUS_PARAM = "type-status";
  type StatusFilter = "active" | "inactive" | "all";

  const statusFilter = $derived.by<StatusFilter>(() => {
    const raw = page.url.searchParams.get(STATUS_PARAM);
    // Anything hand-typed that is not a real filter falls back to the default.
    return raw === "inactive" || raw === "all" ? raw : "active";
  });

  function setStatusFilter(next: string) {
    const url = new URL(page.url);
    if (next === "active") url.searchParams.delete(STATUS_PARAM);
    else url.searchParams.set(STATUS_PARAM, next);
    // Replaced rather than added to history, the same as opening the dialog,
    // so Back leaves the page instead of stepping through every tab clicked.
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  const counts = $derived({
    active: assetTypes.filter((t) => t.status === "active").length,
    inactive: assetTypes.filter((t) => t.status === "inactive").length,
    all: assetTypes.length,
  });

  // Derived from the full list, so a type that is deactivated while the
  // Active tab is open leaves the table on its own, with its exit animation.
  const visibleTypes = $derived(
    statusFilter === "all"
      ? assetTypes
      : assetTypes.filter((t) => t.status === statusFilter),
  );

  let dialogOpen = $state(false);
  let assetTypeToEdit = $state<AssetType | null>(null);

  let deleteDialogOpen = $state(false);
  let assetTypeToDelete = $state<AssetTypeRow | null>(null);

  let reactivateDialogOpen = $state(false);
  let inactiveClash = $state<AssetType | null>(null);

  function sortByName(rows: AssetTypeRow[]) {
    return [...rows].sort((a, b) =>
      a.assetTypeName.localeCompare(b.assetTypeName),
    );
  }

  function openAdd() {
    if (!canManage) return;
    assetTypeToEdit = null;
    dialogOpen = true;
  }

  function openEdit(row: AssetType) {
    assetTypeToEdit = row;
    dialogOpen = true;
  }

  function openDelete(row: AssetTypeRow) {
    // Recounted from the assets on screen now, not taken from `row.usage`,
    // which was counted when the page loaded and misses any asset added or
    // deleted since. The server still recounts before it deletes anything.
    const usage = countUsage(
      [...assets].sort((a, b) => a.assetName.localeCompare(b.assetName)),
    ).get(row.assetTypePk);
    assetTypeToDelete = { ...row, usage: usage ?? { count: 0, sample: [] } };
    deleteDialogOpen = true;
  }

  function onSaved(row: AssetType, mode: "add" | "edit") {
    // A row coming back from the dialog carries no usage count of its own,
    // so the count already on screen is kept. A brand new type has none by
    // definition, since nothing can have been recorded as it yet.
    assetTypes = sortByName(
      mode === "add"
        ? [...assetTypes, { ...row, usage: { count: 0, sample: [] } }]
        : assetTypes.map((t) =>
            t.assetTypePk === row.assetTypePk ? { ...t, ...row } : t,
          ),
    );
    onTypeSaved(row);
  }

  /**
   * Every activate/deactivate toast shares this id, so a new one replaces
   * the one on screen instead of stacking, and only the latest change offers
   * Undo. The same rule as the assets page, with its own id so the two do
   * not replace each other.
   */
  const STATUS_TOAST_ID = "asset-type-status";

  /** Rows with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /**
   * Switches a type on or off straight from the row menu. No confirmation:
   * it is undone in one click from the toast. Waits for the server before
   * changing the row, since on the office network the wait is not noticeable.
   */
  async function setActive(row: AssetType, active: boolean) {
    pending.add(row.assetTypePk);
    try {
      const body = new FormData();
      body.set("assetTypePk", String(row.assetTypePk));
      body.set("status", active ? "active" : "inactive");
      const response = await fetch("?/setTypeStatus", {
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
          `${row.assetTypeName} not ${active ? "activated" : "deactivated"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }

      const updated = result.data?.updatedRow as AssetType;
      // On the Active or Inactive tab the row now leaves the table on its
      // own, because the table is filtered from this list.
      assetTypes = assetTypes.map((t) =>
        t.assetTypePk === updated.assetTypePk ? { ...t, ...updated } : t,
      );
      toast.success(
        `${row.assetTypeName} ${active ? "activated" : "deactivated"}`,
        {
          id: STATUS_TOAST_ID,
          action: { label: "Undo", onClick: () => setActive(updated, !active) },
        },
      );
    } finally {
      pending.delete(row.assetTypePk);
    }
  }

  function onSwitchedOff(row: AssetType) {
    assetTypes = assetTypes.map((t) =>
      t.assetTypePk === row.assetTypePk ? { ...t, ...row } : t,
    );
  }

  function onDeleted(assetTypePk: number) {
    assetTypes = assetTypes.filter((t) => t.assetTypePk !== assetTypePk);
  }

  /**
   * The name the admin typed belongs to an inactive type, so they are asked
   * about it rather than shown an error they can do nothing with.
   */
  function onNameClashesWithUnusedType(row: AssetType) {
    inactiveClash = row;
    reactivateDialogOpen = true;
  }

  /**
   * Opens the existing row in the edit dialog with its switch already on,
   * rather than turning it on straight away. The meter recorded against it
   * may be wrong, and this is the moment somebody can see that and fix it.
   */
  function useAgain(row: AssetType) {
    reactivateDialogOpen = false;
    assetTypeToEdit = { ...row, status: "active" };
    dialogOpen = true;
  }

  function onOpenChangeComplete(isOpen: boolean) {
    if (isOpen && openAddWhenReady) {
      openAdd();
      onAddOpened();
    }
  }

  /**
   * A row fades in only when it is new to a table that is already on screen,
   * the same rule as the assets table.
   */
  let seenRows = new Set<number>();
  let tableWasVisible = false;

  $effect(() => {
    const showing = visibleTypes.length > 0;
    seenRows = showing
      ? new Set(visibleTypes.map((row) => row.assetTypePk))
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

  /**
   * How many rows are fading out right now. While a row leaves, Svelte lifts
   * it out of the table (`position: absolute`) so the rows below can slide
   * up. The table then re-measures its columns without that row and can get
   * narrower, while the lifted row keeps its old width and sticks out the
   * side, which is what showed a horizontal scrollbar. Horizontal overflow is
   * clipped only while this is above zero, so a narrow screen can still
   * scroll the table sideways the rest of the time.
   */
  let leavingRows = $state(0);

  /** Moves the other rows aside when an edited name changes the sort order. */
  function rowFlip() {
    return {
      duration: prefersReducedMotion() ? 0 : DURATION.item,
      easing: easeOut,
    };
  }
</script>

{#snippet typeCount(count: any)}
  <span class="text-muted-foreground">{count}</span>
{/snippet}

<Dialog.Root bind:open={() => open, onOpenChange} {onOpenChangeComplete}>
  <!--
    A flex column capped at the dialog's height, so the heading and the Add
    button stay put while only the table scrolls once it grows long.
  -->
  <Dialog.Content
    data-nested={dialogOpen}
    class="flex max-h-[min(40rem,calc(100dvh-2rem))] px-0 flex-col sm:max-w-xl h-full"
  >
    <Dialog.Header class="px-4">
      <Dialog.Title>Asset types</Dialog.Title>
      <Dialog.Description>
        The kinds of machines that the office supplies fuel for.
      </Dialog.Description>

      {#if assetTypes.length > 0}
        <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
          <Tabs.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Tabs.List>
              <Tabs.Trigger class="text-xs" value="active">
                Active {@render typeCount(counts.active)}
              </Tabs.Trigger>
              <Tabs.Trigger class="text-xs" value="inactive">
                Inactive {@render typeCount(counts.inactive)}
              </Tabs.Trigger>
              <Tabs.Trigger class="text-xs" value="all">
                All {@render typeCount(counts.all)}
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          {#if canManage}
            <Button size="sm" onclick={openAdd}>
              <Plus />
              Add asset type
            </Button>
          {/if}
        </div>
      {/if}
    </Dialog.Header>

    <!--
      Takes whatever height the dialog has left under the tabs, rather than a
      height worked out from the screen. `min-h-0` on both is what lets them
      shrink below the table's full height, and only then does it scroll.
    -->
    <ScrollArea
      class="flex min-h-0 flex-1 flex-col px-4"
      viewPortClasses="max-h-[calc(100dvh-92px)]"
      type="always"
    >
      <!-- No height animation: it fights the scroll area, which clips. -->
      <ContentTransition
        isEmpty={visibleTypes.length === 0}
        empty={emptyState}
        animateHeight={false}
      >
        <Table.Root containerClass={leavingRows > 0 ? "overflow-x-clip" : ""}>
          <Table.Header class="">
            <Table.Row class="hover:bg-transparent">
              <Table.Head class="text-muted-foreground h-6">Name</Table.Head>
              <Table.Head class="text-muted-foreground h-6">Meter</Table.Head>
              <!-- Only the All tab mixes both, so only there does a status column tell anything. -->
              {#if statusFilter === "all"}
                <Table.Head class="text-muted-foreground h-6">Status</Table.Head
                >
              {/if}
              <Table.Head class="w-0 h-6"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <!--
            A plain `<tr>` rather than `Table.Row`, because a transition can
            only be put on an element. The classes are copied from
            table-row.svelte, hover included, so it looks like every other row.
          -->
            {#each visibleTypes as row (row.assetTypePk)}
              <tr
                data-slot="table-row"
                class="hover:bg-muted/50 border-b transition-colors last:border-b-0 overflow-hidden"
                animate:flip={rowFlip()}
                in:itemIn={rowIntro(row.assetTypePk)}
                out:itemOut={{ duration: DURATION.exit }}
                onoutrostart={() => leavingRows++}
                onoutroend={() => leavingRows--}
              >
                <Table.Cell class="font-medium">{row.assetTypeName}</Table.Cell>
                <Table.Cell class="text-muted-foreground">
                  {meterTypeLabel(row.meterType)}
                </Table.Cell>
                {#if statusFilter === "all"}
                  <Table.Cell>
                    <Badge
                      variant={row.status === "active"
                        ? "secondary"
                        : "outline"}
                    >
                      {row.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                {/if}
                <Table.Cell>
                  {#if canManage}
                    <ButtonGroup.Root class="place-self-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onclick={() => openEdit(row)}
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
                          disabled={pending.has(row.assetTypePk)}
                          aria-label="More actions"
                        >
                          <EllipsisVertical />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          {#if row.status === "active"}
                            <DropdownMenu.Item
                              onclick={() => setActive(row, false)}
                            >
                              <CircleOff /> Deactivate
                            </DropdownMenu.Item>
                          {:else}
                            <DropdownMenu.Item
                              onclick={() => setActive(row, true)}
                            >
                              <CircleCheck /> Activate
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
                  {/if}
                </Table.Cell>
              </tr>
            {/each}
          </Table.Body>
        </Table.Root>
      </ContentTransition>
    </ScrollArea>

    <!--
      Kept inside Dialog.Content on purpose. This dialog holds focus while it
      is open, so a dialog mounted outside it would open behind it and could
      not be typed into.
    -->
    <AddEditAssetTypeDialog
      bind:open={dialogOpen}
      {assetTypeToEdit}
      {onSaved}
      {onNameClashesWithUnusedType}
    />

    <DeleteAssetTypeDialog
      bind:open={deleteDialogOpen}
      {assetTypeToDelete}
      {onDeleted}
      {onSwitchedOff}
    />

    <ReactivateAssetTypeDialog
      bind:open={reactivateDialogOpen}
      noLongerUsed={inactiveClash}
      onUseAgain={useAgain}
    />
  </Dialog.Content>
</Dialog.Root>

{#snippet emptyState()}
  {#if assetTypes.length > 0}
    <!--
      Types exist but none match the tab. Saying "no asset types" here would
      be wrong while some sit on the other tab, so each tab says its own thing.
    -->
    <p
      class="text-muted-foreground py-8 text-center text-sm border rounded-xl border-dashed"
    >
      {statusFilter === "inactive"
        ? "No inactive types."
        : "No active types. Check the Inactive tab."}
    </p>
  {:else}
    <Empty.Root class="border py-8">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Tags />
        </Empty.Media>
        <Empty.Title>No asset types yet</Empty.Title>
        <Empty.Description>
          Start with the kinds already on the withdrawal slip: motorcycle,
          pick-up, generator, and grass cutter.
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
  {/if}
{/snippet}
