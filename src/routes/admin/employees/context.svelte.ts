import type { Employee, OrgUnit } from "$lib/types";
import { fullName, makeContext } from "@/utils";
import { untrack } from "svelte";
import { findDuplicate, type DuplicateFinding } from "./duplicate-check";
import {
  CIVIL_STATUS_LABELS,
  EMPLOYMENT_STATUS_VALUES,
  TENURE_STATUS_LABELS,
  type TenureStatus,
} from "./labels";

/** One line of the "These details will be updated" list. */
export interface BringBackChange {
  label: string;
  from: string;
  to: string;
}

const NOT_SET = "Not set";
const NOT_ASSIGNED = "Not assigned";

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

  mode: "edit" | "add" = $derived(
    this.employeeToEdit !== null ? "edit" : "add",
  );

  formFirstName = $state("");
  formMiddleName = $state("");
  formLastName = $state("");
  formSuffix = $state("");
  formPositionTitle = $state("");
  formPositionShortForm = $state("");
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
   * Whether the three fields that identify a person still hold exactly what
   * was stored. Only meaningful while editing.
   *
   * When they are untouched there is nothing new to check. Two people can
   * genuinely share a birthday, and without this an admin correcting a typo in
   * one of their positions would be asked to answer the same possible-match
   * question on every single save — a question they already settled when the
   * record was created.
   */
  identityUnchanged = $derived(
    this.employeeToEdit !== null &&
      this.formFirstName.trim() === this.employeeToEdit.firstName &&
      this.formLastName.trim() === this.employeeToEdit.lastName &&
      (this.formBirthDate || null) === this.employeeToEdit.birthDate,
  );

  /**
   * Whether the person being typed in is already in the system, and how
   * certain that is. Runs live as the fields change, so the admin is told
   * before pressing save rather than after. The server runs the same rules
   * again, because this one can be bypassed.
   */
  duplicateFinding: DuplicateFinding<EmployeeRow> | null = $derived(
    this.identityUnchanged
      ? null
      : findDuplicate(
          {
            firstName: this.formFirstName,
            lastName: this.formLastName,
            birthDate: this.formBirthDate || null,
          },
          this.employees,
          this.employeeToEdit?.employeePk ?? null,
        ),
  );

  /**
   * The exact match is somebody who has left, and a new person is being added
   * — so the way forward is to bring that record back rather than to make a
   * second one.
   *
   * Only offered while adding. On the edit form the match is a *different*
   * row, and bringing it back would write this person's details over that
   * other person. There the match is simply refused.
   */
  canBringBack = $derived(
    this.mode === "add" &&
      this.duplicateFinding?.kind === "exact" &&
      this.duplicateFinding.person.employmentStatus === "separated",
  );

  /** An exact match with nothing to offer: the admin must change what they typed. */
  blockedByDuplicate = $derived(
    this.duplicateFinding?.kind === "exact" && !this.canBringBack,
  );

  /**
   * A match that might be the same person and might not. The save is allowed,
   * but only once the admin has said which it is.
   */
  possibleMatch: DuplicateFinding<EmployeeRow> | null = $derived(
    this.duplicateFinding !== null && this.duplicateFinding.kind !== "exact"
      ? this.duplicateFinding
      : null,
  );

  /** Set when the admin answers that the possible match is somebody else. */
  confirmedDifferentPerson = $state(false);

  /**
   * What "Bring this person back" would change on the stored record, so the
   * admin can see what they are agreeing to before agreeing to it. Only
   * fields that genuinely differ appear; an empty list is shown as a sentence
   * saying nothing else changes, rather than as an empty list.
   */
  bringBackChanges: BringBackChange[] = $derived.by(() => {
    if (!this.canBringBack || !this.duplicateFinding) return [];
    const person = this.duplicateFinding.person;

    const typedSection = this.formOrgUnitFk
      ? (this.orgUnitByPk(Number(this.formOrgUnitFk))?.orgUnitName ??
        NOT_ASSIGNED)
      : NOT_ASSIGNED;

    const candidates: BringBackChange[] = [
      {
        label: "Position",
        from: person.positionTitle,
        to: this.formPositionTitle.trim(),
      },
      {
        label: "Section",
        from: person.orgUnitName ?? NOT_ASSIGNED,
        to: typedSection,
      },
      {
        label: "Tenure",
        from: TENURE_STATUS_LABELS[person.tenureStatus],
        to: this.formTenureStatus
          ? TENURE_STATUS_LABELS[this.formTenureStatus as TenureStatus]
          : NOT_SET,
      },
      {
        label: "Civil status",
        from: person.civilStatus
          ? CIVIL_STATUS_LABELS[person.civilStatus]
          : NOT_SET,
        to: this.formCivilStatus
          ? CIVIL_STATUS_LABELS[
              this.formCivilStatus as keyof typeof CIVIL_STATUS_LABELS
            ]
          : NOT_SET,
      },
    ];

    return candidates.filter((change) => change.from !== change.to);
  });

  /**
   * Somebody being marked as no longer employed who has a login. Worth saying
   * in the editor, because saving it stops that account from working and
   * signs them out, which is not obvious from a field about employment.
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
        this.formPositionShortForm =
          this.employeeToEdit.positionShortForm ?? "";
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

    // A different match is a different question, so an answer given about the
    // previous one does not carry over to it.
    $effect(() => {
      this.duplicateFinding?.person.employeePk;

      untrack(() => {
        this.confirmedDifferentPerson = false;
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
    this.formPositionShortForm = "";
    this.formOrgUnitFk = "";
    this.formBirthDate = "";
    this.formSex = "";
    this.formCivilStatus = "";
    this.formTenureStatus = "";
    this.formIsEmployed = true;
    this.confirmedDifferentPerson = false;
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
