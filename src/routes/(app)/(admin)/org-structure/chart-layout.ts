import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/svelte";
import type { OrgUnit } from "$lib/types";
import type { TreeNode } from "./context.svelte.js";

export { moveRejectionReason, parentLevelOf } from "./move-rules.js";

/** Every box is the same size so dagre can lay the chart out predictably. */
export const NODE_WIDTH = 210;
export const NODE_HEIGHT = 82;

/** How a box should look while something is being dragged over it. */
export type DropState = "none" | "valid" | "invalid";

export type OrgNodeData = {
  unit: OrgUnit;
  hasChildren: boolean;
  dropState: DropState;
  /** Plain-language reason shown on a box that can't accept the drop. */
  dropMessage: string;
};

export type OrgNode = Node<OrgNodeData, "orgUnit">;

/**
 * Flattens the tree into the two arrays Svelte Flow wants, then asks dagre
 * where each box goes. Dagre reports the centre of a box; Svelte Flow wants
 * the top-left corner, so half the width and height come off again.
 */
export function layoutOrgChart(tree: TreeNode[]): {
  nodes: OrgNode[];
  edges: Edge[];
} {
  const nodes: OrgNode[] = [];
  const edges: Edge[] = [];

  const walk = (node: TreeNode, parentId: string | null) => {
    const id = node.orgUnitPk.toString();
    const { children, ...unit } = node;

    nodes.push({
      id,
      type: "orgUnit",
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      draggable: unit.level !== "office" && unit.status === "active",
      data: {
        unit,
        hasChildren: children.length > 0,
        dropState: "none",
        dropMessage: "",
      },
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        selectable: false,
        deletable: false,
      });
    }

    for (const child of children) walk(child, id);
  };

  for (const root of tree) walk(root, null);

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 70 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  for (const node of nodes) {
    const placed = graph.node(node.id);
    node.position = {
      x: placed.x - NODE_WIDTH / 2,
      y: placed.y - NODE_HEIGHT / 2,
    };
  }

  return { nodes, edges };
}
