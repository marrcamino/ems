import { filterFn_isOneOf } from "$lib/utils/facets";
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
import type { EmployeeRow } from "./context.svelte.js";
import EmployeeActionsCell from "./employee-actions-cell.svelte";
import EmployeeEmploymentCell from "./employee-employment-cell.svelte";
import EmployeeLoginCell from "./employee-login-cell.svelte";
import EmployeeNameCell from "./employee-name-cell.svelte";
import EmployeeSectionCell from "./employee-section-cell.svelte";
import EmployeeTenureCell from "./employee-tenure-cell.svelte";
import {
  employeeEmploymentValue,
  employeeLoginValue,
  employeeSectionValue,
  employeeTenureValue,
} from "./filters.js";

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
  },
  columnVisibilityFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, EmployeeRow>();

export const columns = helper.columns([
  // The accessor is "Surname, First name" rather than the displayed full
  // name: it is what the column sorts and searches on, and a staff list is
  // read by surname. The cell renders the name properly regardless.
  helper.accessor((row) => `${row.lastName}, ${row.firstName}`, {
    id: "name",
    header: "Name",
    sortFn: "alphanumeric",
    cell: (info) =>
      renderComponent(EmployeeNameCell, { employee: info.row.original }),
  }),

  // Search-only: the position is shown inside the name cell rather than in a
  // column of its own, but it is one of the things an admin types into the
  // search box. The username goes in for the same reason — somebody looking
  // up "jdelacruz" should land on the person it belongs to.
  helper.accessor(
    (row) => `${row.positionTitle ?? ""} ${row.username ?? ""}`.trim(),
    { id: "details", header: "Details" },
  ),

  helper.accessor(employeeSectionValue, {
    id: "section",
    header: "Section",
    sortFn: "alphanumeric",
    filterFn: "isOneOf",
    enableGlobalFilter: false,
    cell: (info) =>
      renderComponent(EmployeeSectionCell, { employee: info.row.original }),
  }),

  helper.accessor(employeeTenureValue, {
    id: "tenure",
    header: "Tenure",
    sortFn: "alphanumeric",
    filterFn: "isOneOf",
    enableGlobalFilter: false,
    cell: (info) =>
      renderComponent(EmployeeTenureCell, { employee: info.row.original }),
  }),

  helper.accessor(employeeEmploymentValue, {
    id: "employment",
    header: "Employment",
    sortFn: "alphanumeric",
    filterFn: "isOneOf",
    enableGlobalFilter: false,
    cell: (info) =>
      renderComponent(EmployeeEmploymentCell, { employee: info.row.original }),
  }),

  // The one column that reaches across to the Users page. It is what answers
  // "who in this office still has no account?", which the split otherwise
  // makes you open two pages to work out.
  helper.accessor(employeeLoginValue, {
    id: "login",
    header: "Has login",
    sortFn: "alphanumeric",
    filterFn: "isOneOf",
    enableGlobalFilter: false,
    cell: (info) =>
      renderComponent(EmployeeLoginCell, { employee: info.row.original }),
  }),

  helper.display({
    id: "actions",
    header: "",
    cell: (info) =>
      renderComponent(EmployeeActionsCell, { employee: info.row.original }),
  }),
]);

/** The column that exists only to back the search box. */
export const HIDDEN_COLUMNS = { details: false };
