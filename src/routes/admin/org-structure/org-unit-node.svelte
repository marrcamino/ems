<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { parenthesize } from "@/utils";
  import { Pencil, Plus, Trash2 } from "@lucide/svelte";
  import {
    getOrgUnitContext,
    nextLevel,
    type TreeNode,
  } from "./context.svelte";
  import OrgUnitNode from "./org-unit-node.svelte";

  let { node }: { node: TreeNode } = $props();
  const ctx = getOrgUnitContext();
  let isInactive = $derived(node.status === "inactive" ? "" : null);

  function openAddDialog() {
    if (node.status === "inactive") return;
    // console.log("dfgdf");

    ctx.formLevel = nextLevel(node.level);
    ctx.formParentFk = node.orgUnitPk.toString();
    ctx.formParentName = node.orgUnitName;
    ctx.addEditDialog = true;
  }

  function openEditDialog() {
    ctx.orgUnitToEdit = node;
    ctx.addEditDialog = true;
  }

  function openDeleteDialog() {
    if (node.status === "inactive") return;
    ctx.orgUnitToEdit = node;
    ctx.deleteAlertDialog = true;
  }
</script>

<li data-inactive={isInactive} class="data-inactive:opacity-70">
  <div
    class="group relative z-10 inline-flex flex-col items-center rounded-lg border bg-card px-4 py-2 shadow-sm"
  >
    <div class="absolute -top-2 -right-2 hidden gap-1 group-hover:flex">
      <button
        onclick={openEditDialog}
        class="rounded-full border bg-background p-1 shadow hover:bg-muted"
        aria-label="Rename {node.orgUnitName}"
      >
        <Pencil class="size-3" />
      </button>
      {#if node.level !== "office"}
        <button
          data-inactive={isInactive}
          onclick={openDeleteDialog}
          class="rounded-full data-inactive:opacity-50 data-inactive:pointer-events-none border bg-background p-1 shadow transition-colors hover:text-destructive"
          aria-label="Delete {node.orgUnitName}"
        >
          <Trash2 class="size-3" />
        </button>
      {/if}
    </div>

    <span class="text-[10px] uppercase tracking-wide text-muted-foreground">
      {node.level}
      {#if node.status === "inactive"}
        <Badge variant="destructive" class="px-1 capitalize h-4 text-xs"
          >Inactive</Badge
        >
      {/if}
    </span>

    <span class="text-sm font-medium">
      {node.orgUnitName}
      {#if node.abbr}
        <span class="text-muted-foreground">{parenthesize(node.abbr)}</span>
      {/if}
    </span>

    {#if node.level !== "unit"}
      <button
        data-inactive={isInactive}
        onclick={openAddDialog}
        class="absolute data-inactive:opacity-0 data-inactive:pointer-events-none z-10 -bottom-2 left-1/2 hidden h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow group-hover:flex group-hover:opacity-100 hover:bg-muted hover:text-foreground"
        aria-label="Add {nextLevel(node.level)} under {node.orgUnitName}"
      >
        <Plus class="h-3 w-3" />
      </button>

      {#if node.children.length > 0}<span
          class="min-h-2.25 border-r border-border absolute -bottom-2.25 left-1/2 translate-x-1/2 -z-30"
        ></span>
      {/if}
    {/if}
  </div>

  {#if node.children.length > 0}
    <ul>
      {#each node.children as child (child.orgUnitPk)}
        <OrgUnitNode node={child} />
      {/each}
    </ul>
  {/if}
</li>

<style>
  /* Pure-CSS org-chart connectors — the browser's flex layout positions every
     box; these pseudo-elements just draw lines to where boxes already sit. */
  li {
    --tree-gap: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    list-style: none;
    position: relative;
    padding: var(--tree-gap) 8px 0 8px;
  }

  ul {
    display: flex;
    justify-content: center;
    position: relative;
    padding: 0;
    /* padding-right: 0.55rem; */
    /* transform: translateX(-0.7rem); */
    margin: 0;
  }

  /* horizontal spread from each child up toward the shared connector row */
  li::before,
  li::after {
    content: "";
    position: absolute;
    top: 0.5rem;
    right: 50%;
    width: 50%;
    height: var(--tree-gap);
    border-top: 1px solid var(--muted);
  }
  li::after {
    top: 0.5rem;
    right: auto;
    left: 50%;
    border-left: 1px solid var(--muted);
  }

  /* a single child just drops straight down, no horizontal spread needed */
  li:only-child {
    padding-top: 0.5rem;
  }
  li:only-child::before,
  li:only-child::after {
    display: none;
  }

  /* trim the outer edge of the horizontal line so it doesn't run past
     the first/last sibling */
  li:first-child::before,
  li:last-child::after {
    border: none;
  }
  li:last-child::before {
    border-right: 1px solid var(--muted);
    border-radius: 0 6px 0 0;
  }
  li:first-child::after {
    border-radius: 6px 0 0 0;
  }

  /* vertical drop from a parent box down into its children's row */
  ul::before {
    content: "";
    position: absolute;
    top: calc(-1 * var(--tree-gap));
    left: 50%;
    height: var(--tree-gap);
    border-left: 1px solid hsl(var(--border));
  }
</style>
