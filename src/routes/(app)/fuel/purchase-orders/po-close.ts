import { formatDate } from "$lib/utils/format-date";
import { formatLiters, formatPesos } from "$lib/utils/format-number";
import { amountInCentavos, FUEL_LABELS } from "./po-math";
import type { PurchaseOrderRow, SlipOut } from "./po-types";

/**
 * The check shown when Close is pressed on a PO (point 7.3 of "How POs and
 * withdrawal slips work"). The Close dialog shows it, and the server refuses
 * with the same rule.
 *
 * - Problems stop the close: a slip not back yet, or money left on the PO,
 *   since the supplier is paid only after all the fuel is used.
 * - Warnings do not: a withdrawal whose trip ticket's tank lines are still
 *   missing, since those stay editable after the close.
 */
export function closeCheck(po: PurchaseOrderRow) {
  const slip = (s: SlipOut) =>
    `${s.office}, ${FUEL_LABELS[s.fuel].toLowerCase()}, ${
      s.requestedC !== null
        ? formatPesos(s.requestedC)
        : formatLiters(s.requestedH ?? 0, { dropZeros: true })
    } requested on ${formatDate(s.fileDate)}`;

  const problems = po.slipsOut.map((s) => `${slip(s)}: not back yet.`);
  for (const item of po.items) {
    for (const a of item.allocations) {
      const leftC = amountInCentavos(a.litersH, item.unitCostC) - a.usedC;
      if (leftC > 0) {
        problems.push(
          `${a.abbr} has ${formatPesos(leftC)} of ${FUEL_LABELS[item.fuelType].toLowerCase()} left.`,
        );
      }
    }
  }
  const warnings = po.slipsIncomplete.map(
    (s) => `${slip(s)}: the trip ticket's tank lines are missing.`,
  );
  return { problems, warnings };
}
