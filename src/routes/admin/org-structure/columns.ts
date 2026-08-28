import { renderComponent } from "@tanstack/svelte-table";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createExpandedRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowExpandingFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from "@tanstack/table-core";
import type { TreeNode } from "./context.svelte.js";
import OrgUnitActionsCell from "./org-unit-actions-cell.svelte";
import OrgUnitLevelCell from "./org-unit-level-cell.svelte";
import OrgUnitNameCell from "./org-unit-name-cell.svelte";
import OrgUnitStatusCell from "./org-unit-status-cell.svelte";

// No pagination here, unlike the employees table. An office has divisions,
// sections and units in the dozens, not the hundreds, and a page break in the
// middle of a branch would cut the shape of the organization in half.
export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  columnVisibilityFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});

const helper = createColumnHelper<typeof features, TreeNode>();

export const columns = helper.columns([
  // Sorting happens inside each parent rather than across the whole list, so
  // a division never sorts its way out from under its office.
  helper.accessor((row) => `${row.orgUnitName} ${row.abbr ?? ""}`.trim(), {
    id: "name",
    header: "Name",
    sortFn: "alphanumeric",
    cell: (info) => renderComponent(OrgUnitNameCell, { row: info.row }),
  }),

  helper.accessor((row) => row.level, {
    id: "level",
    header: "Level",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    cell: (info) => renderComponent(OrgUnitLevelCell, { unit: info.row.original }),
  }),

  helper.accessor((row) => row.status, {
    id: "status",
    header: "Status",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    cell: (info) =>
      renderComponent(OrgUnitStatusCell, { unit: info.row.original }),
  }),

  helper.display({
    id: "actions",
    header: "",
    cell: (info) => renderComponent(OrgUnitActionsCell, { unit: info.row.original }),
  }),
]);
