<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
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
  import Spinner from "@/components/ui/spinner/spinner.svelte";
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
  import { tick } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { toast } from "svelte-sonner";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import { SvelteSet } from "svelte/reactivity";
  import { flip } from "svelte/animate";
  import DeleteAssetTypeDialog from "./delete-asset-type-dialog.svelte";
  import ReactivateAssetTypeDialog from "./reactivate-asset-type-dialog.svelte";
  import { countUsage, nameTakenMessage, type AssetTypeRow } from "./types.js";

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
     * Set when this dialog was opened asking for the add row too. Read once
     * this one has finished opening, so the name field can take focus.
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
  const canManage = $derived(gblCtx.can("assets:manage"));

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

  /**
   * The row whose name is being typed in place: `"new"` for the add row at
   * the top of the table, or the key of the type being renamed. One at a
   * time, so starting another discards what was typed in the first.
   */
  let editing = $state<number | "new" | null>(null);
  let draftName = $state("");
  const SAVE_TOAST_ID = "asset-type-save";
  let saving = $state(false);
  let nameInput: HTMLInputElement | null = null;

  const editButtonId = (assetTypePk: number) =>
    `asset-type-edit-${assetTypePk}`;

  let deleteDialogOpen = $state(false);
  let assetTypeToDelete = $state<AssetTypeRow | null>(null);

  let reactivateDialogOpen = $state(false);
  let inactiveClash = $state<AssetType | null>(null);

  function sortByName(rows: AssetTypeRow[]) {
    return [...rows].sort((a, b) =>
      a.assetTypeName.localeCompare(b.assetTypeName),
    );
  }

  function startAdd() {
    if (!canManage) return;
    // A new type is active, so on the Inactive tab it would vanish the
    // moment it is saved.
    if (statusFilter === "inactive") setStatusFilter("active");
    draftName = "";
    editing = "new";
  }

  function startEdit(row: AssetType) {
    draftName = row.assetTypeName;
    editing = row.assetTypePk;
  }

  /** The header button, or the empty state's when there are no types. */
  function focusAdd() {
    document.querySelector<HTMLElement>("[data-add-asset-type]")?.focus();
  }

  /** Ends the add or the edit, and gives focus back to the button that started it. */
  async function stopEditing() {
    const was = editing;
    editing = null;
    await tick();
    if (was === "new") focusAdd();
    else if (was !== null) document.getElementById(editButtonId(was))?.focus();
  }

  const focusOnMount: Attachment<HTMLInputElement> = (node) => {
    nameInput = node;
    node.focus();
    node.select();
    return () => {
      if (nameInput === node) nameInput = null;
    };
  };

  function onNameKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    save();
  }

  // Escape steps out of the row being typed in, and only closes the dialog
  // when nothing is.
  function onEscapeKeydown(event: KeyboardEvent) {
    if (editing === null) return;
    event.preventDefault();
    stopEditing();
  }

  // A click outside would close the dialog and lose what was typed.
  function onInteractOutside(event: PointerEvent) {
    if (editing !== null) event.preventDefault();
  }

  /**
   * The type already called `name`, other than `exceptPk`. Compared the way
   * the database's unique index compares names: case and accents ignored.
   */
  function typeCalled(name: string, exceptPk: number | null) {
    return assetTypes.find(
      (t) =>
        t.assetTypePk !== exceptPk &&
        t.assetTypeName.localeCompare(name, undefined, {
          sensitivity: "base",
        }) === 0,
    );
  }

  async function save() {
    const target = editing;
    if (target === null || saving) return;
    const self = target === "new" ? null : target;

    // Checked against the types on screen first, so a name that cannot be
    // saved is answered at once, with no spinner. The server checks again,
    // for a type added somewhere else since the page loaded.
    const name = draftName.trim();
    if (!name) {
      // Spaces only: emptied, so the browser shows its own message.
      draftName = "";
      await tick();
      nameInput?.reportValidity();
      return;
    }
    const current = assetTypes.find((t) => t.assetTypePk === self);
    if (current?.assetTypeName === name) {
      await stopEditing();
      return;
    }
    const clash = typeCalled(name, self);
    if (clash?.status === "inactive") {
      inactiveClash = clash;
      reactivateDialogOpen = true;
      return;
    }
    if (clash) {
      toastErrorOnce(SAVE_TOAST_ID, "Asset type not saved", {
        description: nameTakenMessage(clash.assetTypeName),
      });
      return;
    }

    saving = true;
    try {
      const body = new FormData();
      body.set("assetTypeName", draftName);
      if (target !== "new") body.set("assetTypePk", String(target));
      const response = await fetch(
        target === "new" ? "?/createType" : "?/updateType",
        { method: "POST", body, headers: { "x-sveltekit-action": "true" } },
      );
      const result = deserialize(await response.text());

      if (result.type === "failure") {
        const data = result.data as
          { error?: string; noLongerUsed?: AssetType } | undefined;
        // The name belongs to an inactive type, which has an answer worth
        // offering, so the admin is asked instead of shown a dead end.
        if (data?.noLongerUsed) {
          inactiveClash = data.noLongerUsed;
          reactivateDialogOpen = true;
          return;
        }
        toastErrorOnce(SAVE_TOAST_ID, "Asset type not saved", {
          description: data?.error ?? "Try again.",
        });
        return;
      }
      if (result.type !== "success") {
        toastErrorOnce(SAVE_TOAST_ID, "Asset type not saved", {
          description: "Try again. If it keeps happening, contact ICT.",
        });
        return;
      }

      const mode = target === "new" ? "add" : "edit";
      onSaved(
        (result.data?.newRow ?? result.data?.updatedRow) as AssetType,
        mode,
      );
      // An error from an earlier try is no longer true.
      toast.dismiss(SAVE_TOAST_ID);
      toast.success(mode === "add" ? "Asset type added" : "Asset type updated");
      if (editing === target) await stopEditing();
    } finally {
      saving = false;
    }
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
    // A row coming back from the server carries no usage count of its own,
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
   * Set by Reactivate, so focus goes to the Add button once the question has
   * closed. Without it, focus would go back to the name field, which is gone.
   */
  let focusAddOnClose = false;

  /** The inactive type whose name was typed is switched back on at once. */
  function reactivate(row: AssetType) {
    reactivateDialogOpen = false;
    focusAddOnClose = true;
    editing = null;
    setActive(row, true);
  }

  function onReactivateCloseAutoFocus(event: Event) {
    if (!focusAddOnClose) return;
    focusAddOnClose = false;
    event.preventDefault();
    focusAdd();
  }

  function onOpenChangeComplete(isOpen: boolean) {
    if (isOpen && openAddWhenReady) {
      startAdd();
      onAddOpened();
    }
    // The dialog always reopens with no row being typed in. Reset once it
    // has finished closing, so the row does not change while it fades out.
    if (!isOpen) editing = null;
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

{#snippet nameField()}
  <Input
    {@attach focusOnMount}
    bind:value={draftName}
    aria-label="Name"
    placeholder="Motorcycle"
    maxlength={100}
    required
    class="h-7"
    onkeydown={onNameKeydown}
  />
{/snippet}

{#snippet saveButtons()}
  <div class="flex justify-end gap-1">
    <Button variant="ghost" size="sm" onclick={() => stopEditing()}>
      Cancel
    </Button>
    <Button size="sm" onclick={save}>
      {#if saving}
        <Spinner />
      {/if}
      Save
    </Button>
  </div>
{/snippet}

<Dialog.Root bind:open={() => open, onOpenChange} {onOpenChangeComplete}>
  <!--
    The dialog is capped at the screen's height, so the heading and the Add
    button stay put while only the table scrolls once it grows long. It also
    has a floor, so it does not look cramped with one or two types and does
    not grow with every type added. The floor is never taller than the
    screen, because on a short screen a minimum height would win over the cap
    and push the dialog off the bottom.
  -->
  <Dialog.Content
    class="flex flex-col sm:max-w-md min-h-[min(26rem,calc(100dvh-2rem))] max-h-[min(34rem,calc(100dvh-2rem))]"
    {onEscapeKeydown}
    {onInteractOutside}
    data-nested={deleteDialogOpen || reactivateDialogOpen}
  >
    <Dialog.Header>
      <Dialog.Title>Asset types</Dialog.Title>
      <Dialog.Description>
        The kinds of vehicles and equipment that the office fills with fuel.
      </Dialog.Description>
    </Dialog.Header>

    {#if assetTypes.length > 0}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Tabs.Root
          value={statusFilter}
          onValueChange={(next) => {
            editing = null;
            setStatusFilter(next);
          }}
        >
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
          <Button size="sm" onclick={startAdd} data-add-asset-type>
            <Plus />
            Add asset type
          </Button>
        {/if}
      </div>
    {/if}

    <!--
      Takes whatever height the dialog has left under the tabs, rather than a
      height worked out from the screen. `flex-1` fills the space the dialog's
      floor leaves, and `min-h-0` is what lets it shrink below the table's
      full height, and only then does it scroll. The scrollbar shows only
      then too.

      The viewport fills the whole area (`flex-1`) rather than being just as
      tall as the table. A table switched in by a tab slides up the last few
      pixels as it fades in, and a row being removed is lifted out of the
      table while it fades. A viewport the table's exact height counted
      either as overflow and showed the scrollbar, and since neither changes
      any size when it ends, the scrollbar then stayed.
    -->
    <ScrollArea
      class="-mx-4 flex min-h-0 flex-1 flex-col"
      viewPortClasses="h-auto flex-1 px-4"
      type="auto"
    >
      <!-- No height animation: it fights the scroll area, which clips. -->
      <ContentTransition
        isEmpty={visibleTypes.length === 0 && editing !== "new"}
        empty={emptyState}
        animateHeight={false}
      >
        <Table.Root containerClass={leavingRows > 0 ? "overflow-x-clip" : ""}>
          <Table.Header class="">
            <Table.Row class="hover:bg-transparent">
              <Table.Head class="text-muted-foreground h-6">Name</Table.Head>
              <!-- Only the All tab mixes both, so only there does a status column tell anything. -->
              {#if statusFilter === "all"}
                <Table.Head class="text-muted-foreground h-6">Status</Table.Head
                >
              {/if}
              <Table.Head class="w-0 h-6"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if editing === "new"}
              <tr
                data-slot="table-row"
                class="border-b last:border-b-0"
                in:itemIn={{
                  duration: prefersReducedMotion() ? 0 : DURATION.item,
                }}
              >
                <Table.Cell>{@render nameField()}</Table.Cell>
                {#if statusFilter === "all"}
                  <Table.Cell></Table.Cell>
                {/if}
                <Table.Cell>{@render saveButtons()}</Table.Cell>
              </tr>
            {/if}
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
                <Table.Cell class="font-medium">
                  {#if editing === row.assetTypePk}
                    {@render nameField()}
                  {:else}
                    {row.assetTypeName}
                  {/if}
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
                  {#if editing === row.assetTypePk}
                    {@render saveButtons()}
                  {:else if canManage}
                    <ButtonGroup.Root class="place-self-end">
                      <Button
                        id={editButtonId(row.assetTypePk)}
                        variant="secondary"
                        size="sm"
                        onclick={() => startEdit(row)}
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
      Kept inside the dialog's content on purpose: this dialog holds focus
      while it is open, so a dialog mounted outside it would open behind it
      and could not be clicked.
    -->
    <DeleteAssetTypeDialog
      bind:open={deleteDialogOpen}
      {assetTypeToDelete}
      {onDeleted}
      {onSwitchedOff}
    />

    <ReactivateAssetTypeDialog
      bind:open={reactivateDialogOpen}
      noLongerUsed={inactiveClash}
      onReactivate={reactivate}
      onCloseAutoFocus={onReactivateCloseAutoFocus}
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
          <Button onclick={startAdd} data-add-asset-type>
            <Plus />
            Add asset type
          </Button>
        </Empty.Content>
      {/if}
    </Empty.Root>
  {/if}
{/snippet}
