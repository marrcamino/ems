import { formatLiters } from "$lib/utils/format-number";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from "@internationalized/date";
import {
  amountInCentavos,
  FUEL_LABELS,
  FUELS,
  fromHundredths,
  MAX_HUNDREDTHS,
  toHundredths,
  type Fuel,
} from "./po-math";
import type { PurchaseOrderRow } from "./po-types";

/** One fuel row on the PO. `null` because an empty number field binds as null. */
export type FuelRow = { liters: number | null; unitCost: number | null };

/** One unit's allocation of one fuel, as typed in the allocation step. */
export type Allocation = {
  id: number;
  orgUnitFk: string;
  liters: number | null;
};

/** The fields on the first step, which a server refusal can point at. */
export const DETAIL_FIELDS = ["poNumber", "poDate", "supplierFk"];

function blankRows(): Record<Fuel, FuelRow> {
  return {
    gasoline: { liters: null, unitCost: null },
    diesel: { liters: null, unitCost: null },
  };
}

function noAllocations(): Record<Fuel, Allocation[]> {
  return { gasoline: [], diesel: [] };
}

/**
 * Everything typed into the add PO dialog, and the arithmetic on it. Held in
 * one place because both steps read it: the details step fills in the PO's
 * fuel rows, and the allocation step divides those rows among the units and
 * sends the whole PO.
 *
 * The dialog makes one of these and passes it to each step.
 */
export class AddPurchaseOrderForm {
  poNumber = $state("");
  /** Undefined while the date field is empty or only partly typed. */
  poDate = $state<DateValue | undefined>(undefined);
  supplierFk = $state("");
  note = $state("");
  rows = $state<Record<Fuel, FuelRow>>(blankRows());
  allocations = $state<Record<Fuel, Allocation[]>>(noAllocations());

  /** The PO being edited, or null while a new one is being added. */
  editingPk = $state<number | null>(null);

  /** Messages that belong to one field or one fuel, shown beside it. */
  errors = $state<Record<string, string>>({});

  #nextAllocationId = 1;

  /** Empties the form. With only one supplier, it is chosen already. */
  reset(supplierPks: number[]) {
    this.editingPk = null;
    this.poNumber = "";
    this.poDate = today(getLocalTimeZone());
    this.supplierFk = supplierPks.length === 1 ? String(supplierPks[0]) : "";
    this.note = "";
    this.rows = blankRows();
    this.allocations = noAllocations();
    this.errors = {};
  }

  /** Fills the form with a saved PO, for the Edit button on its card. */
  load(po: PurchaseOrderRow) {
    this.editingPk = po.purchaseOrderPk;
    this.poNumber = po.poNumber;
    this.poDate = parseDate(po.poDate);
    this.supplierFk = String(po.supplierFk);
    this.note = po.note ?? "";
    this.rows = blankRows();
    this.allocations = noAllocations();
    for (const item of po.items) {
      this.rows[item.fuelType] = {
        liters: item.litersH / 100,
        unitCost: item.unitCostC / 100,
      };
      this.allocations[item.fuelType] = item.allocations.map((a) => ({
        id: this.#nextAllocationId++,
        orgUnitFk: String(a.orgUnitPk),
        liters: a.litersH / 100,
      }));
    }
    this.errors = {};
  }

  clearError(key: string) {
    if (this.errors[key]) delete this.errors[key];
  }

  // ── The PO's fuel rows ────────────────────────────────────────────────

  litersH(fuel: Fuel) {
    return toHundredths(this.rows[fuel].liters) ?? 0;
  }

  unitCostC(fuel: Fuel) {
    return toHundredths(this.rows[fuel].unitCost) ?? 0;
  }

  amountC(fuel: Fuel) {
    return amountInCentavos(this.litersH(fuel), this.unitCostC(fuel));
  }

  /** The fuels that have both liters and a unit cost, so are on this PO. */
  fuelsOnPo = $derived(
    FUELS.filter((fuel) => this.litersH(fuel) > 0 && this.unitCostC(fuel) > 0),
  );

  totalC = $derived(
    this.fuelsOnPo.reduce((sum, fuel) => sum + this.amountC(fuel), 0),
  );

  /** What is wrong with the details step, keyed by field, or nothing. */
  detailErrors() {
    const found: Record<string, string> = {};
    if (!this.poNumber.trim()) found.poNumber = "Enter the PO number.";
    if (!this.poDate) {
      found.poDate = "Enter the date on the PO.";
    } else if (this.poDate.compare(today(getLocalTimeZone())) > 0) {
      found.poDate = "Enter a date on or before today.";
    }
    if (!this.supplierFk) found.supplierFk = "Choose the supplier.";

    for (const fuel of FUELS) {
      const { liters, unitCost } = this.rows[fuel];
      const label = FUEL_LABELS[fuel].toLowerCase();
      if (liters === null && unitCost === null) continue;
      const litersH = toHundredths(liters);
      const unitCostH = toHundredths(unitCost);
      if (!litersH) {
        found[fuel] = `Enter the ${label} liters, with up to 2 decimals.`;
      } else if (litersH > MAX_HUNDREDTHS) {
        found[fuel] = `Enter at most 999.99 liters of ${label}.`;
      } else if (!unitCostH) {
        found[fuel] = `Enter the ${label} unit cost, with up to 2 decimals.`;
      } else if (unitCostH > MAX_HUNDREDTHS) {
        found[fuel] = `Enter a ${label} unit cost of at most ₱999.99.`;
      }
    }
    if (!found.gasoline && !found.diesel && this.fuelsOnPo.length === 0) {
      found.fuel = "Enter the liters and unit cost of at least one fuel.";
    }
    return found;
  }

  /**
   * Gets the allocations ready for the allocation step. A fuel that has none
   * yet starts with one allocation holding all of its liters, so a PO whose
   * fuel goes to one unit only needs that unit picked. Allocations already
   * typed are kept, even if the PO's liters were changed since; the line
   * under them then says how far off they are.
   */
  prepareAllocations() {
    for (const fuel of FUELS) {
      if (!this.fuelsOnPo.includes(fuel)) {
        this.allocations[fuel] = [];
      } else if (this.allocations[fuel].length === 0) {
        this.allocations[fuel] = [this.#newAllocation(this.litersH(fuel))];
      }
    }
  }

  // ── The allocations ───────────────────────────────────────────────────

  #newAllocation(litersHundredths: number): Allocation {
    return {
      id: this.#nextAllocationId++,
      orgUnitFk: "",
      liters: litersHundredths > 0 ? litersHundredths / 100 : null,
    };
  }

  allocatedH(fuel: Fuel) {
    return this.allocations[fuel].reduce(
      (sum, a) => sum + (toHundredths(a.liters) ?? 0),
      0,
    );
  }

  /** Liters of a fuel not yet allocated to any unit. Negative when over. */
  remainingH(fuel: Fuel) {
    return this.litersH(fuel) - this.allocatedH(fuel);
  }

  /**
   * A new allocation starts with whatever is left of the fuel, so the last
   * unit added gets the rest without anybody working it out. With 35 L on
   * the PO and 22 L already allocated, the new allocation starts at 13 L.
   * Returns its id, so the step can put the cursor in it.
   */
  addAllocation(fuel: Fuel) {
    const allocation = this.#newAllocation(this.remainingH(fuel));
    this.allocations[fuel].push(allocation);
    this.clearError(fuel);
    return allocation.id;
  }

  removeAllocation(fuel: Fuel, id: number) {
    this.allocations[fuel] = this.allocations[fuel].filter((a) => a.id !== id);
    this.clearError(fuel);
  }

  /**
   * Picking a unit for an allocation that has no liters yet fills in what is
   * left, for the same reason as a new allocation.
   */
  pickUnit(fuel: Fuel, allocation: Allocation, orgUnitFk: string) {
    allocation.orgUnitFk = orgUnitFk;
    if (allocation.liters === null && this.remainingH(fuel) > 0) {
      allocation.liters = this.remainingH(fuel) / 100;
    }
    this.clearError(fuel);
  }

  /** Units already given an allocation of this fuel by another row. */
  takenElsewhere(fuel: Fuel, id: number) {
    return new Set(
      this.allocations[fuel]
        .filter((a) => a.id !== id)
        .map((a) => a.orgUnitFk),
    );
  }

  /** What is wrong with the allocations, keyed by fuel, or nothing. */
  allocationErrors() {
    const found: Record<string, string> = {};
    for (const fuel of this.fuelsOnPo) {
      const label = FUEL_LABELS[fuel].toLowerCase();
      const rows = this.allocations[fuel];
      const left = this.remainingH(fuel);
      if (rows.length === 0) {
        found[fuel] = `Allocate the ${label} to at least one unit.`;
      } else if (rows.some((a) => !a.orgUnitFk)) {
        found[fuel] = `Choose a unit for each ${label} allocation.`;
      } else if (rows.some((a) => !toHundredths(a.liters))) {
        found[fuel] =
          `Enter the liters of each ${label} allocation, with up to 2 decimals.`;
      } else if (left > 0) {
        found[fuel] = `Allocate the last ${formatLiters(left)} of ${label}.`;
      } else if (left < 0) {
        found[fuel] =
          `Take ${formatLiters(-left)} of ${label} off the allocations.`;
      }
    }
    return found;
  }

  /** Everything the server needs, sent as one JSON field. */
  payload = $derived(
    JSON.stringify({
      purchaseOrderPk: this.editingPk ?? undefined,
      poNumber: this.poNumber.trim(),
      poDate: this.poDate?.toString() ?? "",
      supplierFk: Number(this.supplierFk),
      note: this.note.trim(),
      items: this.fuelsOnPo.map((fuel) => ({
        fuelType: fuel,
        liters: fromHundredths(this.litersH(fuel)),
        unitCost: fromHundredths(this.unitCostC(fuel)),
        allocations: this.allocations[fuel].map((a) => ({
          orgUnitFk: Number(a.orgUnitFk),
          liters: fromHundredths(toHundredths(a.liters) ?? 0),
        })),
      })),
    }),
  );
}
