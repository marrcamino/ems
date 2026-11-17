import type { SortIconType } from "$lib/components/sort-icon.svelte";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
} from "@tanstack/table-core";
import { remarksOf, risOrder, STATUS_LABELS, type ListRow } from "./ris-row.js";

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  // No column filters are used, but TanStack's global search is built on
  // top of this feature and refuses to run without it.
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  columnVisibilityFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  // The icon beside a sortable column's name, picked by what it sorts.
  columnMeta: metaHelper<{ sortIcon?: SortIconType }>(),
});

const helper = createColumnHelper<typeof features, ListRow>();

/**
 * The cells are drawn in +page.svelte by column id, because the status and
 * purpose cells carry a second line and the actions cell needs the page's
 * handlers. Only the hidden `search` column feeds the search box.
 */
export const columns = helper.columns([
  helper.accessor((row) => risOrder(row.risNumber), {
    id: "number",
    header: "RIS no.",
    sortFn: "basic",
    sortDescFirst: true,
    enableGlobalFilter: false,
    meta: { sortIcon: "0-1" },
  }),
  // ISO dates sort correctly as text.
  helper.accessor("date", {
    id: "date",
    header: "Date",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    meta: { sortIcon: "calendar" },
  }),
  helper.accessor("purpose", {
    id: "purpose",
    header: "For",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    meta: { sortIcon: "a-z" },
  }),
  helper.accessor("reservedBy", {
    id: "reservedBy",
    header: "Reserved by",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    meta: { sortIcon: "a-z" },
  }),
  helper.accessor((row) => STATUS_LABELS[row.status], {
    id: "status",
    header: "Status",
    sortFn: "alphanumeric",
    enableGlobalFilter: false,
    meta: { sortIcon: "a-z" },
  }),
  helper.accessor(remarksOf, {
    id: "remarks",
    header: "Remarks",
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  // Never shown. The number only as the list shows it, without the year, so
  // typing "2026" does not match every row (decided by the owner, 28 October
  // 2026, for the Fuel page's search).
  helper.accessor(
    (row) => `${row.shortNumber} ${row.purpose} ${row.reservedBy}`,
    { id: "search", enableSorting: false },
  ),
  helper.display({ id: "actions", header: "" }),
]);
