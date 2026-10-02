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
import { fuelTypeLabel, type AssetRow } from "./asset-row.js";

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

const helper = createColumnHelper<typeof features, AssetRow>();

/**
 * The cells are drawn in +page.svelte by column id rather than with
 * `renderComponent`, because the actions cell needs the page's own Edit,
 * Delete and Activate handlers, and the rest are plain text.
 *
 * Only name, plate and property number feed the search box: those are what
 * somebody types to find one machine. Type, fuel and status are left out, so
 * typing "gas" does not match every gasoline asset.
 */
export const columns = helper.columns([
  helper.accessor("assetName", {
    id: "name",
    header: "Name",
    sortFn: "alphanumeric",
  }),
  helper.accessor("assetTypeName", {
    id: "type",
    header: "Type",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
  }),
  // An empty string rather than null, so an asset without a plate is still
  // a searchable, sortable row; the cell draws it as a dash.
  helper.accessor((row) => row.plateNumber ?? "", {
    id: "plate",
    header: "Plate no.",
    enableSorting: false,
  }),
  helper.accessor("propertyNumber", {
    id: "propertyNumber",
    header: "Property no.",
    enableSorting: false,
  }),
  helper.accessor((row) => fuelTypeLabel(row.fuelType), {
    id: "fuel",
    header: "Fuel",
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  helper.accessor("status", {
    id: "status",
    header: "Status",
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  helper.display({ id: "actions", header: "" }),
]);
