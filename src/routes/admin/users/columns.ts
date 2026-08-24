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
import type { RoleOption, UserRow } from "./context.svelte.js";
import {
  userKindValue,
  userRoleValue,
  userSectionValue,
  userSignInValue,
  userStatusValue,
} from "./filters.js";
import UserActionsCell from "./user-actions-cell.svelte";
import UserNameCell from "./user-name-cell.svelte";
import UserRoleCell from "./user-role-cell.svelte";
import UserSectionCell from "./user-section-cell.svelte";
import UserSignInCell from "./user-sign-in-cell.svelte";
import UserStatusCell from "./user-status-cell.svelte";

/**
 * Every filter dropdown lets more than one option be ticked, so the filter
 * function takes an array of chosen values and keeps a row matching any of
 * them. An empty array means "no filter" rather than "match nothing", which
 * is what an untouched dropdown means.
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

const helper = createColumnHelper<typeof features, UserRow>();

/**
 * Built as a function because the role column needs the role list to say
 * which side of the app a role works in, and which pages it opens.
 */
export function createColumns(roles: () => RoleOption[]) {
  return helper.columns([
    // The accessor is "Surname, First name" rather than the displayed full
    // name: it is what the column sorts and searches on, and a staff list is
    // read by surname. The cell renders the name properly regardless.
    helper.accessor((row) => `${row.lastName}, ${row.firstName}`, {
      id: "name",
      header: "Name",
      sortFn: "alphanumeric",
      cell: (info) =>
        renderComponent(UserNameCell, { user: info.row.original }),
    }),

    // Search-only: the username and position are shown inside the name cell
    // rather than in columns of their own, but both are things an admin types
    // into the search box.
    helper.accessor(
      (row) => `${row.username} ${row.positionTitle ?? ""}`.trim(),
      { id: "account", header: "Account" },
    ),

    helper.accessor(userRoleValue, {
      id: "role",
      header: "Role",
      sortFn: "alphanumeric",
      filterFn: "isOneOf",
      cell: (info) =>
        renderComponent(UserRoleCell, { user: info.row.original }),
    }),

    // Filter-only: admin accounts against staff accounts. The role name in
    // the column beside it already carries this once you know the roles, but
    // it is the fastest way to cut a mixed list in half.
    helper.accessor((row) => userKindValue(row, roles()), {
      id: "kind",
      header: "Type",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
    }),

    helper.accessor(userSectionValue, {
      id: "section",
      header: "Section",
      sortFn: "alphanumeric",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
      cell: (info) =>
        renderComponent(UserSectionCell, { user: info.row.original }),
    }),

    helper.accessor(userStatusValue, {
      id: "status",
      header: "Status",
      sortFn: "alphanumeric",
      filterFn: "isOneOf",
      enableGlobalFilter: false,
      cell: (info) =>
        renderComponent(UserStatusCell, { user: info.row.original }),
    }),

    // Shown because "never signed in" is the sign that a new account never
    // reached the person it was made for. Filtered on that split rather than
    // on the date itself, which is what an admin is actually asking.
    // The id matches the filter id in filters.ts — a column filter is applied
    // by column id, so a mismatch there silently does nothing.
    helper.accessor((row) => row.lastLoginAt?.getTime() ?? 0, {
      id: "signIn",
      header: "Last sign-in",
      sortFn: "alphanumeric",
      enableGlobalFilter: false,
      filterFn: (row, _columnId, filterValue) =>
        filterFn_isOneOf(
          { getValue: () => userSignInValue(row.original) },
          "signIn",
          filterValue,
        ),
      cell: (info) =>
        renderComponent(UserSignInCell, { user: info.row.original }),
    }),

    helper.display({
      id: "actions",
      header: "",
      cell: (info) =>
        renderComponent(UserActionsCell, { user: info.row.original }),
    }),
  ]);
}

/** The columns that exist only to back a filter or the search box. */
export const HIDDEN_COLUMNS = { account: false, kind: false };
