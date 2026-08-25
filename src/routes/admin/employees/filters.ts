import {
  optionsFromValues,
  withCounts,
  type CountedOption,
  type FilterOption,
} from "$lib/utils/facets";
import { hasLogin, type EmployeeRow } from "./context.svelte.js";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_VALUES,
  TENURE_STATUS_SHORT,
  TENURE_STATUS_VALUES,
} from "./labels";

/**
 * The four things worth narrowing a list of people by. Each answers a
 * question the search box cannot:
 *
 *   section     — which part of the office someone belongs to
 *   tenure      — permanent, casual, Contract of Service, Job Order
 *   employment  — still working here, or gone
 *   login       — who has an account, and who still needs one
 *
 * Search covers the name and the position, which is where free text belongs.
 */
export type EmployeeFilterId = "section" | "tenure" | "employment" | "login";

export type EmployeeFilterState = Record<EmployeeFilterId, string[]>;

export const NO_SECTION_LABEL = "No section";

export function emptyEmployeeFilters(): EmployeeFilterState {
  return { section: [], tenure: [], employment: [], login: [] };
}

export const LOGIN_OPTIONS: FilterOption[] = [
  { value: "has-login", label: "Has an account" },
  { value: "no-login", label: "No account yet" },
];

export const TENURE_OPTIONS: FilterOption[] = TENURE_STATUS_VALUES.map(
  (value) => ({ value, label: TENURE_STATUS_SHORT[value] }),
);

export const EMPLOYMENT_OPTIONS: FilterOption[] = EMPLOYMENT_STATUS_VALUES.map(
  (value) => ({ value, label: EMPLOYMENT_STATUS_LABELS[value] }),
);

/**
 * The values below are derived from a person rather than stored on them, so
 * they live here and are read by both the table columns and the option counts
 * — one definition, and no chance of a count disagreeing with its filter.
 */
export function employeeSectionValue(employee: EmployeeRow): string {
  return employee.orgUnitName ?? NO_SECTION_LABEL;
}

export function employeeTenureValue(employee: EmployeeRow): string {
  return employee.tenureStatus;
}

export function employeeEmploymentValue(employee: EmployeeRow): string {
  return employee.employmentStatus;
}

export function employeeLoginValue(employee: EmployeeRow): string {
  return hasLogin(employee) ? "has-login" : "no-login";
}

export interface EmployeeFacets {
  section: CountedOption[];
  tenure: CountedOption[];
  employment: CountedOption[];
  login: CountedOption[];
}

export function buildEmployeeFacets(
  employees: readonly EmployeeRow[],
): EmployeeFacets {
  return {
    section: optionsFromValues(employees.map(employeeSectionValue)),
    tenure: withCounts(TENURE_OPTIONS, employees.map(employeeTenureValue)),
    employment: withCounts(
      EMPLOYMENT_OPTIONS,
      employees.map(employeeEmploymentValue),
    ),
    login: withCounts(LOGIN_OPTIONS, employees.map(employeeLoginValue)),
  };
}
