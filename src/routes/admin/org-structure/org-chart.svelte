<script lang="ts">
  import {
    Background,
    Controls,
    SvelteFlow,
    useSvelteFlow,
    type Edge,
    type NodeTypes,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { mode } from "mode-watcher";
  import { tick, untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import {
    layoutOrgChart,
    moveRejectionReason,
    type OrgNode,
  } from "./chart-layout.js";
  import { getOrgUnitContext } from "./context.svelte.js";
  import OrgUnitNode from "./org-unit-node.svelte";

  const ctx = getOrgUnitContext();
  const gblCtx = getGlobalContext();
  const flow = useSvelteFlow<OrgNode>();

  const nodeTypes: NodeTypes = { orgUnit: OrgUnitNode as never };

  let nodes = $state<OrgNode[]>([]);
  let edges = $state<Edge[]>([]);
  let canManage = $derived(gblCtx.can("admin:manage_org_units"));

  let flowWrapper: HTMLDivElement | undefined = $state();
  let isDragging = false;
  let lastBoxCount = 0;
  let isFirstLayout = true;

  const FIT_VIEW = { padding: 0.2, maxZoom: 1 };

  /**
   * Boxes are added and removed through the dialogs, never with the keyboard,
   * and there is nothing here to rubber-band select, so these three keys are
   * switched off.
   *
   * The obvious way to switch a key off is to pass null, but @xyflow/svelte
   * 1.6.5 turns null into an empty string and registers it as a shortcut
   * anyway. Its shortcut library then complains, once per key press, that a
   * trigger has no key — so holding a key down fills the console. Naming a
   * key that no keyboard can produce avoids the complaint and disables the
   * shortcut just as firmly, because a shortcut only runs when the key
   * matches the one that was pressed.
   *
   * Nothing else in the library reads these three props; the rest of it works
   * from flags that stay switched off. Once xyflow handles null properly this
   * can go back to being null.
   */
  const IMPOSSIBLE_KEY = "xyflow-key-disabled";
  const NO_KEYBOARD_SHORTCUTS = {
    deleteKey: IMPOSSIBLE_KEY,
    selectionKey: IMPOSSIBLE_KEY,
    multiSelectionKey: IMPOSSIBLE_KEY,
  };

  /**
   * Positions always come from the layout, never from where somebody happened
   * to let go of the mouse. Re-running this is also how a dropped box snaps
   * back into place.
   */
  function applyLayout() {
    const laid = layoutOrgChart(ctx.orgUnitTree);
    const boxCountChanged = laid.nodes.length !== lastBoxCount;
    lastBoxCount = laid.nodes.length;

    nodes = laid.nodes;
    edges = laid.edges;

    // Adding or deleting reshapes the whole chart, and a newly added box can
    // easily land outside the current view. Waiting for tick() lets Svelte
    // Flow learn about the new boxes before the view is fitted around them.
    // The very first layout is skipped because the fitView prop already
    // handles the opening view.
    if (boxCountChanged && !isFirstLayout) {
      tick().then(() => flow.fitView({ ...FIT_VIEW, duration: 250 }));
    }
    isFirstLayout = false;
  }

  $effect(() => {
    ctx.orgUnitTree;
    untrack(applyLayout);
  });

  /**
   * Re-centre the chart after the window settles, not while it is moving.
   * Snapping the window to half the screen or going full screen fires a burst
   * of resize events, so each one restarts the timer and only the last one
   * actually re-fits the view.
   *
   * This watches the chart box rather than the window, so collapsing the
   * sidebar re-centres the chart too.
   */
  $effect(() => {
    const element = flowWrapper;
    if (!element) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let isFirstReport = true;

    const observer = new ResizeObserver(() => {
      // The observer always reports the starting size once. The chart has
      // just fitted itself on mount, so that first report is not a resize.
      if (isFirstReport) {
        isFirstReport = false;
        return;
      }

      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isDragging) return;
        flow.fitView({ ...FIT_VIEW, duration: 250 });
      }, 200);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  });

  /**
   * Of all the boxes the dragged box currently overlaps, the one whose centre
   * is nearest. Without this, overlapping two boxes at once would pick an
   * arbitrary winner.
   */
  function pickDropTarget(dragged: OrgNode): OrgNode | null {
    const hits = flow
      .getIntersectingNodes({ id: dragged.id })
      .filter((hit) => hit.id !== dragged.id);
    if (!hits.length) return null;

    const centre = (node: OrgNode) => ({
      x: node.position.x + (node.width ?? 0) / 2,
      y: node.position.y + (node.height ?? 0) / 2,
    });
    const from = centre(dragged);

    let nearest: OrgNode | null = null;
    let nearestDistance = Infinity;
    for (const hit of hits) {
      const to = centre(hit);
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = hit;
      }
    }

    // Work with the box from our own array so the highlight is reactive.
    return nodes.find((node) => node.id === nearest?.id) ?? null;
  }

  function clearHighlights() {
    for (const node of nodes) {
      if (node.data.dropState !== "none") {
        node.data.dropState = "none";
        node.data.dropMessage = "";
      }
    }
  }

  /** While dragging, show on the box underneath whether the drop will work. */
  function handleDrag({ targetNode }: { targetNode: OrgNode | null }) {
    isDragging = true;
    if (!targetNode) return;
    const dragged = nodes.find((node) => node.id === targetNode.id);
    if (!dragged) return;

    const hit = pickDropTarget(targetNode);
    clearHighlights();
    if (!hit) return;

    const reason = moveRejectionReason(dragged.data.unit, hit.data.unit);
    hit.data.dropState = reason ? "invalid" : "valid";
    hit.data.dropMessage = reason ?? "";
  }

  /**
   * Dropping never changes anything on its own. A valid drop opens a
   * confirmation, so a slip of the mouse can't quietly reorganise the office.
   */
  function handleDragStop({ targetNode }: { targetNode: OrgNode | null }) {
    isDragging = false;
    if (!targetNode) return;
    const dragged = nodes.find((node) => node.id === targetNode.id);
    const hit = pickDropTarget(targetNode);

    clearHighlights();

    if (dragged && hit) {
      const reason = moveRejectionReason(dragged.data.unit, hit.data.unit);
      if (reason) {
        toast.error(reason);
      } else {
        ctx.orgUnitToMove = dragged.data.unit;
        ctx.moveTargetParent = hit.data.unit;
        ctx.moveDialog = true;
      }
    }

    applyLayout();
  }
</script>

<div bind:this={flowWrapper} class="size-full">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    colorMode={mode.current ?? "light"}
    nodesDraggable={canManage}
    nodesConnectable={false}
    elementsSelectable={false}
    {...NO_KEYBOARD_SHORTCUTS}
    nodeDragThreshold={4}
    minZoom={0.2}
    maxZoom={1.75}
    fitView
    fitViewOptions={FIT_VIEW}
    onnodedrag={handleDrag}
    onnodedragstop={handleDragStop}
    class="bg-background"
  >
    <Background patternColor="var(--muted-foreground)" gap={20} />

    <Controls
      showLock={false}
      class="overflow-hidden rounded-sm [&_button:last-child]:border-b-0"
    />
  </SvelteFlow>
</div>

<style>
  :global(.svelte-flow__attribution) {
    z-index: -1 !important;
    pointer-events: none !important;
    border: none !important;
    width: 1px !important;
    height: 1px !important;
  }
</style>
