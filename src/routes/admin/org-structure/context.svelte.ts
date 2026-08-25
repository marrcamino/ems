import type { Employee, OrgUnit } from "$lib/types";
import { makeContext } from "@/utils";
import { untrack } from "svelte";

export type TreeNode = OrgUnit & {
  children: TreeNode[];
};

const LEVEL_ORDER = ["office", "division", "section", "unit"] as const;

export function nextLevel(level: OrgUnit["level"]) {
  return LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
}

function buildTree(
  flat: OrgUnit[],
  parentFk: number | null = null,
  status: "active-only" | "all" = "all",
): TreeNode[] {
  return flat
    .filter((row) => row.parentFk === parentFk)
    .filter((row) => status === "active-only" || row.status === "active")
    .map((row) => ({
      ...row,
      children: buildTree(flat, row.orgUnitPk, status),
    }));
}

type NonOfficeOrgUnit = Exclude<OrgUnit["level"], "office">;
type AssignedEmployee = Pick<Employee, "firstName" | "lastName" | "employeePk">;

export class OrgUnitContext {
  rawOrgUnits: OrgUnit[] = $state([]);
  orgUnits: OrgUnit[] = $state([]);
  showInactiveOrgUnit = $state(false);
  orgUnitTree = $derived(
    buildTree(
      this.orgUnits,
      null,
      this.showInactiveOrgUnit ? "active-only" : "all",
    ),
  );
  addEditDialog = $state(false);
  deleteAlertDialog = $state(false);
  orgUnitToEdit: OrgUnit | null = $state(null);

  // For add-edit-org-dialog
  mode: "edit" | "add" = $derived(this.orgUnitToEdit !== null ? "edit" : "add");
  formLevel = $state("");
  formParentFk = $state("");
  formParentName = $state("");
  formIsActive = $state(true);
  formOrgUnitName = $state("");
  formOrgUnitAbbr = $state("");
  formParentOrgUnits: OrgUnit[] = $state([]);

  formStatusIsDisabled = $state(false);
  formStatusMessage = $state("");

  assignedEmployeesDialog = $state(false);
  assignedEmployees: AssignedEmployee[] = $state([]);
  assignedEmployeesLoading = $state(false);

  constructor() {
    // Form level and parent fk trigger
    $effect(() => {
      this.formLevel;
      this.formParentFk;

      untrack(() => {
        // if (!this.formParentFk) return;

        if (this.formLevel && this.formLevel !== "office") {
          this.formParentOrgUnits = this.getParentLevel(
            this.formLevel as Exclude<OrgUnit["level"], "office">,
          );
        }

        if (this.formLevel === "division" && this.formParentOrgUnits.length) {
          this.formParentName = this.formParentOrgUnits[0].orgUnitName;
          return;
        }

        if (this.formParentFk) {
          this.formParentName =
            this.formParentOrgUnits.find(
              (o) => o.orgUnitPk.toString() === this.formParentFk,
            )?.orgUnitName ?? "Select parent";
        }
      });
    });

    // Setting the form when editing mode
    $effect(() => {
      this.orgUnitToEdit;

      untrack(async () => {
        if (!this.orgUnitToEdit) return;

        this.formLevel = this.orgUnitToEdit.level;
        this.formParentFk = this.orgUnitToEdit.parentFk?.toString() ?? "";
        this.formIsActive = this.orgUnitToEdit.status === "active";
        this.formOrgUnitName = this.orgUnitToEdit.orgUnitName;
        this.formOrgUnitAbbr = this.orgUnitToEdit.abbr || "";

        await this.fetchAssignedEmployees(this.orgUnitToEdit.orgUnitPk);
      });
    });

    // Update status state and message
    $effect(() => {
      this.addEditDialog;

      untrack(() => {
        if (this.orgUnitToEdit) {
          const hasActiveChildren = this.hasActiveChildren(
            this.orgUnitToEdit.orgUnitPk,
          );

          this.formStatusIsDisabled = hasActiveChildren;

          this.formStatusMessage = hasActiveChildren
            ? `This ${this.orgUnitToEdit.level} still has active ${nextLevel(this.formLevel as any)}(s) under it. You can't deactivate this – move or deactivate them first.`
            : "";
        } else {
          this.formStatusIsDisabled = true;
          this.formStatusMessage = `You can't add an inactive ${this.formLevel}.`;
        }
      });
    });
  }

  resetFormInputValues() {
    this.orgUnitToEdit = null;
    this.formLevel = "";
    this.formParentFk = "";
    this.formParentName = "";
    this.formParentOrgUnits = [];
    this.formOrgUnitName = "";
    this.formOrgUnitAbbr = "";
    this.formIsActive = true;
  }

  hasActiveChildren(orgUnitPk: number): boolean {
    return this.orgUnits.some(
      (o) => o.parentFk === orgUnitPk && o.status === "active",
    );
  }

  getParentLevel(level: NonOfficeOrgUnit) {
    const option: Record<NonOfficeOrgUnit, OrgUnit["level"]> = {
      division: "office",
      section: "division",
      unit: "section",
    };
    return this.orgUnits
      .filter((o) => o.level === option[level])
      .filter((o) => o.status === "active");
  }

  async fetchAssignedEmployees(orgUnitPk: number) {
    if (this.assignedEmployees.length) return;

    this.assignedEmployeesLoading = true;
    try {
      const res = await fetch(`/admin/org-structure/${orgUnitPk}/employees`);
      if (!res.ok) throw new Error("Failed to load assigned employees.");
      const data = await res.json();
      this.assignedEmployees = data.employees;
    } finally {
      this.assignedEmployeesLoading = false;
    }
  }

  addOrgUnit(newOrgUnit: OrgUnit) {
    this.rawOrgUnits = [newOrgUnit, ...this.rawOrgUnits];
    this.orgUnits = $state.snapshot(this.rawOrgUnits);
  }

  updateOrgUnit(updatedOrgUnit: OrgUnit) {
    this.rawOrgUnits = this.rawOrgUnits.map((e) =>
      e.orgUnitPk === updatedOrgUnit.orgUnitPk ? updatedOrgUnit : e,
    );
    this.orgUnits = $state.snapshot(this.rawOrgUnits);
  }

  removeOrgUnit(pk: number) {
    this.rawOrgUnits = this.rawOrgUnits.filter((o) => o.orgUnitPk !== pk);
    this.orgUnits = $state.snapshot(this.rawOrgUnits);
  }
}

export const { set: setOrgUnitContext, get: getOrgUnitContext } = makeContext(
  "org-unit-context",
  OrgUnitContext,
);
