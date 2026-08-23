import type { PermissionRow } from "$lib/server/permissions";
import { cn } from "$lib/utils/index.js";
import { renderComponent } from "@tanstack/svelte-table";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from "@tanstack/table-core";
import CellWrapper from "./cell-wrapper.svelte";
import type { RoleRow } from "./context.svelte.js";
import {
  roleAreaValues,
  roleAssignmentValue,
  roleAuthorityValue,
  roleKindValue,
} from "./filters.js";
import RoleAccessCell from "./role-access-cell.svelte";
import RoleActionsCell from "./role-actions-cell.svelte";
import RoleKindCell from "./role-kind-cell.svelte";
import RoleNameCell from "./role-name-cell.svelte";
import RoleStatusCell from "./role-status-cell.svelte";

/**
 * Every filter dropdown lets more than one option be ticked, so both filter
 * functions below take an array of chosen values and keep a row that matches
 * any of them. An empty array is treated as "no filter" rather than "match
 * nothing", which is what an untouched dropdown means.
 */
function filterFn_isOneOf(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown,
) {
  const chosen = filterValue as string[];
  if (!chosen?.length) return true;

  return chosen.includes(String(row.getValue(columnId)));
}

/** For columns whose value is a list — a role opens several pages. */
function filterFn_hasAnyOf(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown,
) {
  const chosen = filterValue as string[];
  if (!chosen?.length) return true;

  const values = (row.getValue(columnId) as string[]) ?? [];
  return chosen.some((value) => values.includes(value));
}

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    isOneOf: filterFn_isOneOf,
    hasAnyOf: filterFn_hasAnyOf,
  },
  columnVisibilityFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, RoleRow>();

/**
 * Built as a function because three of the columns need the permission list
 * to turn a role's stored keys into something readable — which pages it
 * opens, and whether it can change anything.
 */
export function createColumns(permissionDefs: PermissionRow[]) {
  return helper.columns([
    helper.accessor("roleName", {
      header: "Role",
      sortFn: "alphanumeric",
      cell: (info) =>
        renderComponent(RoleNameCell, { role: info.row.original }),
    }),

    // Admin vs staff, derived from the keys the role holds. Worth its own
    // column because it is the first thing that narrows a long list down.
    helper.accessor(roleKindValue, {
      id: "kind",
      header: "Type",
      sortFn: "alphanumeric",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
      cell: (info) =>
        renderComponent(RoleKindCell, { role: info.row.original }),
    }),

    helper.accessor("description", {
      header: "Description",
      enableSorting: false,
      cell: (info) =>
        renderComponent(CellWrapper, {
          value: info.getValue() ?? "—",
          class: cn(
            "max-w-xs whitespace-normal text-muted-foreground line-clamp-6",
          ),
        }),
    }),

    helper.accessor((row) => roleAreaValues(row, permissionDefs), {
      id: "areas",
      header: "Can open",
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: "hasAnyOf",
      cell: (info) =>
        renderComponent(RoleAccessCell, { areas: info.getValue() }),
    }),

    // Filter-only: whether the role can change anything or only look. Kept
    // out of the table because the "Can open" badges already say what the
    // role reaches, and a sixth visible column would crowd them out.
    helper.accessor((row) => roleAuthorityValue(row, permissionDefs), {
      id: "authority",
      header: "Access level",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
    }),

    // Shown because it is the reason a delete can be refused — a role with
    // users assigned has to have them moved off it first. Filtered on the
    // in-use/unused split rather than the raw number, which is what an admin
    // clearing out dead roles is actually asking for.
    helper.accessor("userCount", {
      header: "Users",
      sortFn: "alphanumeric",
      enableGlobalFilter: false,
      filterFn: (row, _columnId, filterValue) =>
        filterFn_isOneOf(
          { getValue: () => roleAssignmentValue(row.original) },
          "assignment",
          filterValue,
        ),
      cell: (info) => {
        const total = info.getValue();
        return total === 0 ? "None" : `${total}`;
      },
    }),

    helper.accessor("status", {
      header: "Status",
      sortFn: "alphanumeric",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
      cell: (info) =>
        renderComponent(RoleStatusCell, { status: info.getValue() }),
    }),

    helper.display({
      id: "actions",
      header: "",
      cell: (info) =>
        renderComponent(RoleActionsCell, { role: info.row.original }),
    }),
  ]);
}

/** The columns that exist only to back a filter. */
export const HIDDEN_COLUMNS = { authority: false };
