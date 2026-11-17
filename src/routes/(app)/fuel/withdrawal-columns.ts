import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  metaHelper,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
} from "@tanstack/table-core";
import type { SortIconType } from "$lib/components/sort-icon.svelte";
import type { WithdrawalRow } from "./withdrawal-row.js";
import { WITHDRAWAL_STATUSES } from "./withdrawal-status.js";

export const features = tableFeatures({
  // Needed for `getVisibleCells`, which draws each row.
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  // The icon beside a sortable column's name, picked by what it sorts.
  columnMeta: metaHelper<{ sortIcon?: SortIconType }>(),
});

const helper = createColumnHelper<typeof features, WithdrawalRow>();

/**
 * Layout 1b of the Claude Design "Withdrawals Table": fewer columns, with the
 * details in a smaller line under the main value. The cells are drawn in
 * +page.svelte by column id, and each column sorts by its main value.
 *
 * The balance is not sortable: it belongs to one office's
 * allocation of one fuel, so sorting it across offices tells nothing.
 */
export const columns = helper.columns([
  // The row's place in the list as it is shown now, so it always counts
  // 1, 2, 3 down the screen, whatever the sort or the office filter.
  helper.display({ id: "rowNumber", header: "#" }),
  // ISO dates sort correctly as text.
  helper.accessor("fileDate", {
    id: "fileDate",
    header: "File date",
    sortFn: "alphanumeric",
    meta: { sortIcon: "calendar" },
  }),
  helper.accessor("office", {
    id: "office",
    header: "Office",
    sortFn: "alphanumeric",
    meta: { sortIcon: "a-z" },
  }),
  // The full control number, so the years sort apart.
  helper.accessor("controlNumber", {
    id: "slip",
    header: "Slip",
    sortFn: "alphanumeric",
    meta: { sortIcon: "0-1" },
  }),
  // In the order a slip goes through, not by the label's spelling. The
  // first click starts at Waiting for approval; a number column would
  // otherwise start from the largest, Cancelled. The plain arrow, since this
  // order is neither by letter nor by number.
  helper.accessor((row) => WITHDRAWAL_STATUSES.indexOf(row.status), {
    id: "status",
    header: "Status",
    sortFn: "basic",
    sortDescFirst: false,
    meta: { sortIcon: "arrow" },
  }),
  // A slip not back yet and a trip only have no liters, so they sort last.
  // The bars, because it sorts by amount.
  helper.accessor((row) => row.withdrawnH ?? row.boughtH ?? undefined, {
    id: "withdrawn",
    header: "Withdrawn",
    sortFn: "basic",
    sortUndefined: "last",
    meta: { sortIcon: "narrow-wide" },
  }),
  helper.accessor("balanceH", {
    id: "balance",
    header: "Balance",
    enableSorting: false,
  }),
  helper.accessor("asset", {
    id: "assetAndTrip",
    header: "Asset and trip",
    sortFn: "alphanumeric",
    meta: { sortIcon: "a-z" },
  }),
  helper.accessor("remarks", {
    id: "remarks",
    header: "Remarks",
    enableSorting: false,
  }),
  helper.display({ id: "actions", header: "" }),
]);
