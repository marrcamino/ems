import type { Supplier } from "@/types";
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
import { groupTin } from "./tin";

/** The same table features as the assets page. */
export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  // No column filters are used, but TanStack's global search is built on
  // top of this feature and refuses to run without it.
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  columnVisibilityFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, Supplier>();

/**
 * The cells are drawn in +page.svelte by column id, as on the assets page.
 * The search box looks in every column but the status.
 */
export const columns = helper.columns([
  helper.accessor("supplierName", {
    id: "name",
    header: "Supplier",
    sortFn: "alphanumeric",
  }),
  helper.accessor("businessAddress", {
    id: "address",
    header: "Business address",
    sortFn: "alphanumeric",
  }),
  // Both the spaced form, as shown, and the digits, as stored, so either
  // way of typing it finds the supplier.
  helper.accessor((row) => `${groupTin(row.tin)} ${row.tin}`, {
    id: "tin",
    header: "TIN",
    enableSorting: false,
  }),
  helper.accessor("philgepsNumber", {
    id: "philgeps",
    header: "PhilGEPS reg. no.",
    enableSorting: false,
  }),
  // Optional, so an empty string keeps the row searchable; drawn as a dash.
  helper.accessor(
    (row) => [row.contactNumber, row.email].filter(Boolean).join(" "),
    { id: "contact", header: "Contact", enableSorting: false },
  ),
  helper.accessor("status", {
    id: "status",
    header: "Status",
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  helper.display({ id: "actions", header: "" }),
]);
