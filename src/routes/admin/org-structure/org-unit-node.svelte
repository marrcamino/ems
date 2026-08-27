<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { parenthesize } from "@/utils";
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import type { OrgNode } from "./chart-layout.js";
  import { getOrgUnitContext, nextLevel } from "./context.svelte.js";

  let { data }: NodeProps<OrgNode> = $props();

  const ctx = getOrgUnitContext();
  const gblCtx = getGlobalContext();

  let unit = $derived(data.unit);
  let isInactive = $derived(unit.status === "inactive");
  let canManage = $derived(gblCtx.can("admin:manage_org_units"));

  function openAddDialog() {
    if (isInactive) return;
    ctx.formLevel = nextLevel(unit.level);
    ctx.formParentFk = unit.orgUnitPk.toString();
    ctx.formParentName = unit.orgUnitName;
    ctx.addEditDialog = true;
  }

  function openEditDialog() {
    ctx.orgUnitToEdit = unit;
    ctx.addEditDialog = true;
  }

  function openDeleteDialog() {
    if (isInactive) return;
    ctx.orgUnitToEdit = unit;
    ctx.deleteAlertDialog = true;
  }
</script>

<!-- Svelte Flow attaches the connector lines to these two points. They are
     invisible and can't be dragged; the chart shape comes from the database,
     not from anyone drawing lines by hand. -->
<Handle
  type="target"
  position={Position.Top}
  isConnectable={false}
  class="opacity-0! pointer-events-none!"
/>

<div
  data-drop={data.dropState === "none" ? null : data.dropState}
  class="group relative flex h-full w-full flex-col items-center justify-center rounded-lg border bg-card px-4 py-2 text-center shadow-sm transition-shadow
         data-[drop=valid]:border-primary data-[drop=valid]:ring-2 data-[drop=valid]:ring-primary
         data-[drop=invalid]:border-destructive data-[drop=invalid]:ring-2 data-[drop=invalid]:ring-destructive"
  class:opacity-70={isInactive}
>
  {#if canManage}
    <div class="nodrag absolute -top-2 -right-2 hidden gap-1 group-hover:flex">
      <button
        onclick={openEditDialog}
        class="rounded-full border bg-background p-1 shadow hover:bg-muted"
        aria-label="Rename {unit.orgUnitName}"
      >
        <Pencil class="size-3" />
      </button>
      {#if unit.level !== "office"}
        <button
          disabled={isInactive}
          onclick={openDeleteDialog}
          class="rounded-full border bg-background p-1 shadow transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
          aria-label="Delete {unit.orgUnitName}"
        >
          <Trash2 class="size-3" />
        </button>
      {/if}
    </div>
  {/if}

  <span
    class="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
  >
    {unit.level}
    {#if isInactive}
      <Badge variant="destructive" class="h-4 px-1 text-xs capitalize"
        >Inactive</Badge
      >
    {/if}
  </span>

  <span class="line-clamp-2 text-sm font-medium">
    {unit.orgUnitName}
    {#if unit.abbr}
      <span class="text-muted-foreground">{parenthesize(unit.abbr)}</span>
    {/if}
  </span>

  {#if canManage && unit.level !== "unit"}
    <button
      disabled={isInactive}
      onclick={openAddDialog}
      class="nodrag absolute -bottom-2 left-1/2 z-10 hidden h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow hover:bg-muted hover:text-foreground group-hover:flex disabled:pointer-events-none disabled:opacity-0"
      aria-label="Add {nextLevel(unit.level)} under {unit.orgUnitName}"
    >
      <Plus class="h-3 w-3" />
    </button>
  {/if}

  {#if data.dropState !== "none"}
    <div
      class="absolute -bottom-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs shadow
             {data.dropState === 'valid'
        ? 'bg-primary text-primary-foreground'
        : 'bg-destructive text-white'}"
    >
      {data.dropState === "valid" ? "Drop here to move" : data.dropMessage}
    </div>
  {/if}
</div>

<Handle
  type="source"
  position={Position.Bottom}
  isConnectable={false}
  class="opacity-0! pointer-events-none!"
/>
