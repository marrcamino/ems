import type { Employee, OrgUnit } from "$lib/types";
import { fullName, makeContext } from "@/utils";
import { untrack } from "svelte";
import { EMPLOYMENT_STATUS_VALUES } from "./labels";

/**
 * A person as the table shows them: the employee row with the section name
 * already resolved, plus the username of their login — or null, which is what
 * the "Has login" column reads.
 */
export type EmployeeRow = Omit<Employee, "createdAt" | "updatedAt"> & {
  orgUnitName: string | null;
  orgUnitAbbr: string | null;
  username: string | null;
};

// Re-exported so the components under this route keep importing it from here,
// while the sidebar and anything else outside the route take it from $lib.
export { fullName };

export function hasLogin(employee: EmployeeRow): boolean {
  return employee.username !== null;
}

export class EmployeesContext {
  employees: EmployeeRow[] = $state([]);
  orgUnits: OrgUnit[] = $state([]);

  addEditDialog = $state(false);
  deleteAlertDialog = $state(false);
  employeeToEdit: EmployeeRow | null = $state(null);

  mode: "edit" | "add" = $derived(this.employeeToEdit !== null ? "edit" : "add");

  formFirstName = $state("");
  formMiddleName = $state("");
  formLastName = $state("");
  formSuffix = $state("");
  formPositionTitle = $state("");
  formOrgUnitFk = $state("");
  formBirthDate = $state("");
  formSex = $state("");
  formCivilStatus = $state("");
  formTenureStatus = $state("");
  formIsEmployed = $state(true);

  orgUnitByPk(orgUnitPk: number): OrgUnit | undefined {
    return this.orgUnits.find((unit) => unit.orgUnitPk === orgUnitPk);
  }

  /** Active sections, plus whichever one this person is already in. */
  assignableOrgUnits = $derived(
    this.orgUnits.filter(
      (unit) =>
        unit.status === "active" ||
        unit.orgUnitPk === this.employeeToEdit?.orgUnitFk,
    ),
  );

  /**
   * Whether somebody with this exact first and last name is already on file.
   * Two people in a small office can genuinely share a name, so this is only
   * ever a warning — but the usual cause is the same person being added a
   * second time, which is worth catching before the row exists.
   */
  nameAlreadyUsed = $derived.by(() => {
    const first = this.formFirstName.trim().toLowerCase();
    const last = this.formLastName.trim().toLowerCase();
    if (!first || !last) return false;

    return this.employees.some(
      (person) =>
        person.employeePk !== this.employeeToEdit?.employeePk &&
        person.firstName.toLowerCase() === first &&
        person.lastName.toLowerCase() === last,
    );
  });

  /**
   * Somebody marked as no longer employed who can still sign in. Worth saying
   * in the editor, because switching the account off happens on the Users
   * page and nothing here does it for them.
   */
  leavingWithLogin = $derived(
    !this.formIsEmployed &&
      this.employeeToEdit !== null &&
      hasLogin(this.employeeToEdit),
  );

  constructor() {
    $effect(() => {
      this.employeeToEdit;

      untrack(() => {
        if (!this.employeeToEdit) return;

        this.formFirstName = this.employeeToEdit.firstName;
        this.formMiddleName = this.employeeToEdit.middleName ?? "";
        this.formLastName = this.employeeToEdit.lastName;
        this.formSuffix = this.employeeToEdit.suffix ?? "";
        this.formPositionTitle = this.employeeToEdit.positionTitle ?? "";
        this.formOrgUnitFk = this.employeeToEdit.orgUnitFk
          ? String(this.employeeToEdit.orgUnitFk)
          : "";
        this.formBirthDate = this.employeeToEdit.birthDate ?? "";
        this.formSex = this.employeeToEdit.sex ?? "";
        this.formCivilStatus = this.employeeToEdit.civilStatus ?? "";
        this.formTenureStatus = this.employeeToEdit.tenureStatus ?? "";
        this.formIsEmployed = this.employeeToEdit.employmentStatus === "active";
      });
    });
  }

  resetFormInputValues() {
    this.employeeToEdit = null;
    this.formFirstName = "";
    this.formMiddleName = "";
    this.formLastName = "";
    this.formSuffix = "";
    this.formPositionTitle = "";
    this.formOrgUnitFk = "";
    this.formBirthDate = "";
    this.formSex = "";
    this.formCivilStatus = "";
    this.formTenureStatus = "";
    this.formIsEmployed = true;
  }

  /** The value the hidden employmentStatus field submits. */
  employmentStatusValue = $derived(
    this.formIsEmployed
      ? EMPLOYMENT_STATUS_VALUES[0]
      : EMPLOYMENT_STATUS_VALUES[1],
  );

  addEmployee(newEmployee: EmployeeRow) {
    this.employees = [newEmployee, ...this.employees];
  }

  updateEmployee(updatedEmployee: EmployeeRow) {
    this.employees = this.employees.map((person) =>
      person.employeePk === updatedEmployee.employeePk
        ? updatedEmployee
        : person,
    );
  }

  removeEmployee(employeePk: number) {
    this.employees = this.employees.filter(
      (person) => person.employeePk !== employeePk,
    );
  }
}

export const { set: setEmployeesContext, get: getEmployeesContext } =
  makeContext("employees-context", EmployeesContext);
